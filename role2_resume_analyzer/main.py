import io
import json
import os
import re
import pypdf
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RADIX Role 2: LLM-Powered Resume Analyzer", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 12 RADIX Categories according to Hackathon Brief
ALL_RADIX_CATEGORIES = [
    "COD", "DSA", "OOD", "APTI", "COMM", "AI",
    "CLOUD", "SQL", "SWE", "SYSD", "NETW", "OS", "OTHER"
]

class Skill(BaseModel):
    skill_name: str
    category_code: str
    evidence: Optional[str] = None
    confidence: Optional[str] = "high"

class CandidateProfile(BaseModel):
    id: Optional[str] = None
    name: str
    email: str
    education: Optional[str] = "B.Tech Computer Science"
    skills: List[Skill]
    categories: Optional[Dict[str, int]] = None
    status: Optional[str] = "success"

def get_genai_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception:
        return None

def extract_pdf_text(file_bytes: bytes) -> str:
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text.strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF file: {str(e)}")

def extract_docx_text(file_bytes: bytes) -> str:
    try:
        import docx
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join([paragraph.text for paragraph in doc.paragraphs if paragraph.text]).strip()
    except Exception:
        # Fallback XML parsing
        try:
            import zipfile
            import xml.etree.ElementTree as ET
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as docx_zip:
                xml_content = docx_zip.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                paragraphs = []
                for p in tree.iterfind(".//w:p", namespaces):
                    texts = [node.text for node in p.iterfind(".//w:t", namespaces) if node.text]
                    if texts:
                        paragraphs.append("".join(texts))
                return "\n".join(paragraphs).strip()
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to read DOCX file: {str(e)}")

def fallback_resume_parse(raw_text: str, filename: str) -> CandidateProfile:
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    candidate_name = lines[0] if lines else "Candidate"
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", raw_text)
    email = email_match.group(0) if email_match else "candidate@example.com"
    
    # 12-category keyword scan
    category_keywords = {
        "COD": ["python", "java", "c++", "c#", "coding", "syntax", "array", "string", "clean code", "programming"],
        "DSA": ["dsa", "algorithms", "data structures", "trees", "graphs", "dynamic programming", "hash map", "sorting"],
        "OOD": ["ood", "oop", "object-oriented", "design patterns", "solid principles", "inheritance", "polymorphism"],
        "APTI": ["aptitude", "quantitative", "logical reasoning", "probability", "statistics", "problem solving", "analytical"],
        "COMM": ["communication", "presentation", "stakeholder", "written", "verbal", "teamwork", "collaboration", "mentors"],
        "AI": ["machine learning", "deep learning", "ai", "neural network", "regression", "classification", "nlp", "llm"],
        "CLOUD": ["cloud", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "devops", "microservices"],
        "SQL": ["sql", "mysql", "postgresql", "oracle", "database", "query", "indexing", "relational", "nosql", "redis"],
        "SWE": ["software engineering", "sdlc", "agile", "scrum", "unit testing", "code review", "git", "production"],
        "SYSD": ["system design", "distributed systems", "scalability", "caching", "rate-limiter", "load balancing", "api layer"],
        "NETW": ["networking", "tcp/ip", "udp", "http", "https", "dns", "rest api", "socket", "computer networks"],
        "OS": ["operating system", "linux", "unix", "concurrency", "threads", "multithreaded", "processes", "scheduler"],
    }
    
    lower = raw_text.lower()
    skills = []
    seen = set()
    category_scores = {c: 4 for c in ALL_RADIX_CATEGORIES if c != "OTHER"}
    
    for cat, kws in category_keywords.items():
        matched_in_cat = 0
        for kw in kws:
            if re.search(r"\b" + re.escape(kw) + r"\b", lower):
                matched_in_cat += 1
                name = kw.upper() if kw in {"sql", "dsa", "ai", "oop", "gcp", "aws"} else kw.title()
                if name.lower() not in seen:
                    seen.add(name.lower())
                    sentence = next((part.strip() for part in re.split(r"[.\n]", raw_text) if kw in part.lower()), f"Mentioned in resume: {kw}")
                    skills.append(Skill(
                        skill_name=name,
                        category_code=cat,
                        evidence=sentence[:200],
                        confidence="high"
                    ))
        if matched_in_cat > 0:
            category_scores[cat] = min(10, 5 + matched_in_cat)

    return CandidateProfile(
        id=f"cand_{abs(hash(raw_text)) % 100000}",
        name=candidate_name,
        email=email,
        education="B.Tech Computer Science and Engineering",
        skills=skills,
        categories=category_scores,
        status="success"
    )

@app.get("/api/health")
def health_check():
    return {"status": "online", "service": "RADIX Role 2: Resume Analyzer", "port": 8002}

@app.post("/api/extract/resume", response_model=CandidateProfile)
@app.post("/api/resume/parse", response_model=CandidateProfile)
async def parse_resume_with_llm(file: UploadFile = File(...)):
    filename = file.filename.lower()
    if not (filename.endswith('.pdf') or filename.endswith('.docx') or filename.endswith('.doc') or filename.endswith('.txt')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")
    
    file_bytes = await file.read()
    
    if filename.endswith('.pdf'):
        raw_text = extract_pdf_text(file_bytes)
    else:
        raw_text = extract_docx_text(file_bytes)
    
    client = get_genai_client()
    if client:
        try:
            from google.genai import types
            prompt = f"""
            You are an expert technical recruiter and resume parser for the RADIX platform.
            Analyze the following resume text and extract:
            1. The candidate's full name.
            2. Their email address.
            3. Their education credentials.
            4. A comprehensive list of their technical skills.
            
            For each skill, assign an appropriate category code from this exact list:
            {ALL_RADIX_CATEGORIES}
            Provide short text evidence from the text where it was found, and set confidence to 'high', 'medium', or 'low'.

            Resume Text:
            {raw_text[:15000]}
            """
            response = client.models.generate_content(
                model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1, 
                ),
            )
            data = json.loads(response.text)
            profile = CandidateProfile(**data)
            if not profile.id:
                profile.id = f"cand_{abs(hash(raw_text)) % 100000}"
            return profile
        except Exception as e:
            pass

    # 2. Try OpenRouter (e.g. NVIDIA Nemotron)
    openrouter_key = os.getenv("OPENROUTER_API_KEY")
    if openrouter_key:
        try:
            import urllib.request
            model = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3.5-super-vl:free")
            prompt = f"""You are a technical recruiter. Extract candidate information from this resume and return valid JSON only matching:
{{
  "id": "cand_{abs(hash(raw_text)) % 100000}",
  "name": "Candidate Full Name",
  "email": "Email Address",
  "education": "Degree and Major",
  "skills": [{{"skill_name":"...", "category_code":"COD|DSA|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER", "evidence":"quote", "confidence":"high|medium|low"}}]
}}
Allowed category codes: {ALL_RADIX_CATEGORIES}
RESUME TEXT:
{raw_text[:15000]}
"""
            req_data = json.dumps({
                "model": model,
                "messages": [
                    {"role": "system", "content": "Return valid JSON only."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1
            }).encode("utf-8")
            req = urllib.request.Request(
                "https://openrouter.ai/api/v1/chat/completions",
                data=req_data,
                headers={
                    "Authorization": f"Bearer {openrouter_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title": "RADIX Talent Match"
                }
            )
            with urllib.request.urlopen(req, timeout=35) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                content = data["choices"][0]["message"]["content"]
                cleaned = re.sub(r"^```(?:json)?\s*", "", content.strip(), flags=re.IGNORECASE)
                cleaned = re.sub(r"\s*```$", "", cleaned)
                parsed = json.loads(cleaned)
                return CandidateProfile(**parsed)
        except Exception:
            pass

    # Fallback when no API key is provided or API call fails
    return fallback_resume_parse(raw_text, filename)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
