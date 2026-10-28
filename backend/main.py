"""
RADIX Talent Match — Unified AI Career Intelligence Platform Backend
Built with FastAPI for RADIX Talent Match Hackathon (October 2026)
Consolidates and serves:
  - Role 1: JD Analytics (POST /api/extract/jd)
  - Role 2: Resume Parser (POST /api/extract/resume, POST /api/resume/parse)
  - Role 4: Talent Check (POST /api/talent-check)
  - Role 5: Skill Matching (POST /api/match, POST /api/skill-match)
  - System Health (GET /api/health)
"""

import json
import logging
import os
import re
import difflib
import xml.etree.ElementTree as ET
import zipfile
from io import BytesIO
from typing import Any, Dict, List, Literal, Optional, Union

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import pypdf

# Optional imports handled gracefully
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except ImportError:
    pass

try:
    import docx
except ImportError:
    docx = None

try:
    from thefuzz import fuzz
except ImportError:
    # Pure Python fuzzy matching fallback using standard library difflib
    class FuzzFallback:
        @staticmethod
        def ratio(s1: str, s2: str) -> int:
            return round(difflib.SequenceMatcher(None, s1.lower(), s2.lower()).ratio() * 100)

        @staticmethod
        def token_sort_ratio(s1: str, s2: str) -> int:
            t1 = " ".join(sorted(s1.lower().split()))
            t2 = " ".join(sorted(s2.lower().split()))
            return round(difflib.SequenceMatcher(None, t1, t2).ratio() * 100)

    fuzz = FuzzFallback()

logger = logging.getLogger("radix.unified_backend")

app = FastAPI(
    title="RADIX Unified Career Intelligence Platform",
    description="Integrated API service supporting all 5 hackathon roles and the 12-skillset competency framework.",
    version="2.0.0",
)

# Enable CORS for frontend Vite dev server and production deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 12 RADIX Competency Taxonomy
RADIX_CATEGORIES = {
    "COD": {
        "name": "Coding",
        "keywords": ["python", "java", "c++", "c#", "golang", "rust", "typescript", "javascript", "coding", "syntax", "array", "string", "clean code", "programming", "algorithms implementation"]
    },
    "DSA": {
        "name": "Data Structures & Algorithms",
        "keywords": ["dsa", "algorithms", "data structures", "trees", "graphs", "dynamic programming", "hash map", "sorting", "searching", "complexity", "big o", "asymptotic analysis", "heaps", "recursion"]
    },
    "OOD": {
        "name": "Object-Oriented Design",
        "keywords": ["ood", "oop", "object-oriented", "design patterns", "solid principles", "inheritance", "polymorphism", "abstraction", "factory pattern", "strategy pattern", "singleton"]
    },
    "APTI": {
        "name": "Aptitude",
        "keywords": ["aptitude", "quantitative", "logical reasoning", "probability", "statistics", "problem solving", "analytical", "metrics", "a/b testing", "data interpretation"]
    },
    "COMM": {
        "name": "Communication",
        "keywords": ["communication", "presentation", "stakeholder", "written", "verbal", "teamwork", "collaboration", "client", "documentation", "articulation", "cross-functional"]
    },
    "AI": {
        "name": "AI & Machine Learning",
        "keywords": ["machine learning", "deep learning", "artificial intelligence", "neural network", "regression", "classification", "nlp", "llm", "tensorflow", "pytorch", "scikit-learn", "transformers", "rag", "predictive model"]
    },
    "CLOUD": {
        "name": "Cloud & DevOps",
        "keywords": ["cloud", "aws", "azure", "gcp", "docker", "kubernetes", "ci/cd", "devops", "microservices", "terraform", "containerization", "linux server", "cloud architecture"]
    },
    "SQL": {
        "name": "SQL & Databases",
        "keywords": ["sql", "mysql", "postgresql", "oracle", "database", "query", "indexing", "relational", "nosql", "mongodb", "schema", "normalization", "pl/sql", "joins", "transaction safety"]
    },
    "SWE": {
        "name": "Software Engineering",
        "keywords": ["software engineering", "sdlc", "agile", "scrum", "unit testing", "code review", "git", "ci/cd", "technical debt", "refactoring", "integration testing", "version control"]
    },
    "SYSD": {
        "name": "System Design",
        "keywords": ["system design", "distributed systems", "scalability", "caching", "redis", "load balancing", "high availability", "sharding", "fault tolerance", "event-driven", "message queue", "kafka"]
    },
    "NETW": {
        "name": "Networking",
        "keywords": ["networking", "tcp/ip", "udp", "http", "https", "dns", "rest api", "socket", "latency", "protocol", "client-server", "tls", "ip address"]
    },
    "OS": {
        "name": "Operating Systems",
        "keywords": ["operating system", "linux", "unix", "concurrency", "threads", "multithreading", "processes", "memory management", "virtual memory", "bash", "shell", "process scheduling"]
    },
}
RADIX_CATEGORY_CODES = set(RADIX_CATEGORIES) | {"OTHER"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


# -----------------------------------------------------------------------------
# Document Text Extraction Utilities (PDF & DOCX)
# -----------------------------------------------------------------------------
def extract_text_from_pdf(content: bytes) -> str:
    """Extract readable text from a PDF file."""
    reader = pypdf.PdfReader(BytesIO(content))
    text_parts = []
    for page in reader.pages:
        txt = page.extract_text()
        if txt:
            text_parts.append(txt)
    return "\n".join(text_parts).strip()


def extract_text_from_docx(content: bytes) -> str:
    """Extract paragraph text from a DOCX file."""
    if docx is not None:
        try:
            doc = docx.Document(BytesIO(content))
            return "\n".join([p.text for p in doc.paragraphs if p.text]).strip()
        except Exception:
            pass

    # Safe XML zip fallback
    try:
        with zipfile.ZipFile(BytesIO(content)) as docx_zip:
            xml_content = docx_zip.read("word/document.xml")
            tree = ET.fromstring(xml_content)
            namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
            paragraphs = []
            for p in tree.iterfind(".//w:p", namespaces):
                texts = [node.text for node in p.iterfind(".//w:t", namespaces) if node.text]
                if texts:
                    paragraphs.append("".join(texts))
            return "\n".join(paragraphs).strip()
    except Exception as exc:
        raise ValueError(f"Could not read DOCX document: {exc}")


# -----------------------------------------------------------------------------
# Company Benchmarks Snapshot Loader
# -----------------------------------------------------------------------------
def load_company_benchmarks() -> Dict[str, Any]:
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "talent_check_company_skillsets.json"),
        os.path.join(os.path.dirname(__file__), "talent_check_company_skillsets.json"),
        os.path.abspath("talent_check_company_skillsets.json"),
        os.path.join(os.getcwd(), "talent_check_company_skillsets.json"),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass

    # Built-in fallback conforming to the hackathon dataset
    return {
        "Google LLC": {
            "company_name": "Google LLC",
            "badge": "Tier 1 Tech",
            "description": "Global technology leader in search, cloud computing, software, and AI.",
            "role_focus": ["Software Engineer (SWE)", "Data Scientist"],
            "skillset_expectations": [
                {"category_code": "DSA", "category_name": "Data Structures & Algorithms", "required_level": 9, "weight": 1.2, "importance": "critical"},
                {"category_code": "COD", "category_name": "Coding", "required_level": 9, "weight": 1.2, "importance": "critical"},
                {"category_code": "SYSD", "category_name": "System Design", "required_level": 8, "weight": 1.1, "importance": "high"},
                {"category_code": "SWE", "category_name": "Software Engineering", "required_level": 8, "weight": 1.0, "importance": "high"},
                {"category_code": "AI", "category_name": "AI & Machine Learning", "required_level": 8, "weight": 1.0, "importance": "high"},
                {"category_code": "CLOUD", "category_name": "Cloud & DevOps", "required_level": 8, "weight": 0.9, "importance": "medium"},
                {"category_code": "OOD", "category_name": "Object-Oriented Design", "required_level": 8, "weight": 0.9, "importance": "medium"},
                {"category_code": "OS", "category_name": "Operating Systems", "required_level": 7, "weight": 0.9, "importance": "medium"},
                {"category_code": "NETW", "category_name": "Networking", "required_level": 7, "weight": 0.8, "importance": "medium"},
                {"category_code": "SQL", "category_name": "SQL & Databases", "required_level": 7, "weight": 0.8, "importance": "medium"},
                {"category_code": "COMM", "category_name": "Communication", "required_level": 8, "weight": 1.0, "importance": "high"},
                {"category_code": "APTI", "category_name": "Aptitude", "required_level": 8, "weight": 0.8, "importance": "medium"},
            ]
        },
        "Microsoft Corporation": {
            "company_name": "Microsoft Corporation",
            "badge": "Enterprise Cloud",
            "description": "Enterprise cloud and productivity pioneer behind Azure, Windows, and Microsoft 365.",
            "role_focus": ["Software Engineer", "Data Analyst"],
            "skillset_expectations": [
                {"category_code": "SWE", "category_name": "Software Engineering", "required_level": 9, "weight": 1.2, "importance": "critical"},
                {"category_code": "COD", "category_name": "Coding", "required_level": 8, "weight": 1.1, "importance": "critical"},
                {"category_code": "CLOUD", "category_name": "Cloud & DevOps", "required_level": 9, "weight": 1.2, "importance": "critical"},
                {"category_code": "SYSD", "category_name": "System Design", "required_level": 8, "weight": 1.0, "importance": "high"},
                {"category_code": "DSA", "category_name": "Data Structures & Algorithms", "required_level": 8, "weight": 1.0, "importance": "high"},
                {"category_code": "SQL", "category_name": "SQL & Databases", "required_level": 8, "weight": 1.0, "importance": "high"},
                {"category_code": "OOD", "category_name": "Object-Oriented Design", "required_level": 8, "weight": 0.9, "importance": "high"},
                {"category_code": "AI", "category_name": "AI & Machine Learning", "required_level": 8, "weight": 0.9, "importance": "medium"},
                {"category_code": "COMM", "category_name": "Communication", "required_level": 8, "weight": 1.0, "importance": "high"},
                {"category_code": "OS", "category_name": "Operating Systems", "required_level": 7, "weight": 0.8, "importance": "medium"},
                {"category_code": "NETW", "category_name": "Networking", "required_level": 7, "weight": 0.8, "importance": "medium"},
                {"category_code": "APTI", "category_name": "Aptitude", "required_level": 7, "weight": 0.7, "importance": "medium"},
            ]
        },
        "Oracle Financial Services Software": {
            "company_name": "Oracle Financial Services Software",
            "badge": "Fintech & Banking",
            "description": "Enterprise financial products powering global tier-1 banking institutions.",
            "role_focus": ["Associate Software Engineer", "Application Support Analyst"],
            "skillset_expectations": [
                {"category_code": "SQL", "category_name": "SQL & Databases", "required_level": 9, "weight": 1.3, "importance": "critical"},
                {"category_code": "SWE", "category_name": "Software Engineering", "required_level": 8, "weight": 1.1, "importance": "high"},
                {"category_code": "COD", "category_name": "Coding", "required_level": 7, "weight": 1.0, "importance": "high"},
                {"category_code": "OS", "category_name": "Operating Systems", "required_level": 8, "weight": 1.1, "importance": "high"},
                {"category_code": "NETW", "category_name": "Networking", "required_level": 7, "weight": 1.0, "importance": "medium"},
                {"category_code": "COMM", "category_name": "Communication", "required_level": 8, "weight": 1.1, "importance": "high"},
                {"category_code": "APTI", "category_name": "Aptitude", "required_level": 8, "weight": 1.0, "importance": "high"},
                {"category_code": "OOD", "category_name": "Object-Oriented Design", "required_level": 7, "weight": 0.8, "importance": "medium"},
                {"category_code": "DSA", "category_name": "Data Structures & Algorithms", "required_level": 7, "weight": 0.8, "importance": "medium"},
                {"category_code": "CLOUD", "category_name": "Cloud & DevOps", "required_level": 6, "weight": 0.7, "importance": "medium"},
                {"category_code": "SYSD", "category_name": "System Design", "required_level": 6, "weight": 0.7, "importance": "medium"},
                {"category_code": "AI", "category_name": "AI & Machine Learning", "required_level": 5, "weight": 0.5, "importance": "low"},
            ]
        }
    }


# -----------------------------------------------------------------------------
# LLM Provider Invocation Helpers (Gemini / OpenRouter / OpenAI)
# -----------------------------------------------------------------------------
def call_gemini(prompt: str) -> Optional[str]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
        return getattr(response, "text", None)
    except Exception as e:
        logger.warning(f"Gemini LLM call failed: {e}")
        return None


def call_openrouter(prompt: str) -> Optional[str]:
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        return None
    model = os.getenv("OPENROUTER_MODEL", "nvidia/nemotron-3.5-super-vl:free")
    
    # Standard library HTTP request (Zero dependencies, guaranteed to work anywhere)
    try:
        import urllib.request
        req_data = json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": "You are a precise technical skill extractor. Return valid JSON only with no markdown."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/chat/completions",
            data=req_data,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "RADIX Talent Match"
            }
        )
        with urllib.request.urlopen(req, timeout=35) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        logger.warning(f"OpenRouter standard request failed: {e}")

    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            timeout=30.0,
            default_headers={
                "HTTP-Referer": "http://localhost:5173",
                "X-Title": "RADIX Talent Match",
            }
        )
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a precise technical skill extractor. Return valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"OpenRouter LLM call failed: {e}")
        return None


def call_openai(prompt: str) -> Optional[str]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, timeout=30.0)
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            messages=[
                {"role": "system", "content": "You are a precise technical skill extractor. Return valid JSON only."},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
        )
        return response.choices[0].message.content
    except Exception as e:
        logger.warning(f"OpenAI LLM call failed: {e}")
        return None


# -----------------------------------------------------------------------------
# Pydantic Schemas Conforming to Shared Data Contract
# -----------------------------------------------------------------------------
class Skill(BaseModel):
    skill_name: str = ""
    category_code: str = "OTHER"
    evidence: Optional[str] = None
    confidence: Optional[str] = "high"


def normalize_skill(s: Any) -> Skill:
    if isinstance(s, Skill):
        return s
    if isinstance(s, str):
        return Skill(skill_name=s.strip(), category_code="OTHER", confidence="medium")
    if isinstance(s, dict):
        name = s.get("skill_name") or s.get("name") or s.get("title") or ""
        cat = s.get("category_code") or s.get("category") or "OTHER"
        return Skill(
            skill_name=str(name).strip(),
            category_code=str(cat).strip(),
            evidence=s.get("evidence"),
            confidence=s.get("confidence") or "high",
        )
    return Skill(skill_name=str(s).strip(), category_code="OTHER", confidence="medium")


class JDTextRequest(BaseModel):
    text: str


class TalentCheckRequest(BaseModel):
    profile: Optional[Dict[str, Any]] = None
    candidate: Optional[Dict[str, Any]] = None
    company: Optional[str] = "Google LLC"


class ExtractedJD(BaseModel):
    source_type: Optional[str] = "jd"
    source_file: Optional[str] = "job_description.docx"
    company: Optional[str] = "Company"
    role: Optional[str] = "Role"
    skills: List[Skill] = Field(default_factory=list)


class CandidateProfileModel(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = "Candidate"
    email: Optional[str] = "candidate@example.com"
    education: Optional[str] = "B.Tech Computer Science"
    skills: List[Skill] = Field(default_factory=list)
    categories: Optional[Dict[str, Any]] = None


# Flexible MatchRequest accepting both Role 5 schema and legacy frontend schemas
class FlexibleMatchRequest(BaseModel):
    jd: Optional[ExtractedJD] = None
    candidate: Optional[CandidateProfileModel] = None
    job: Optional[Dict[str, Any]] = None
    profile: Optional[Dict[str, Any]] = None


# -----------------------------------------------------------------------------
# API Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "RADIX Unified SkillSync AI Engine",
        "version": "2.0.0",
        "modules_supported": [
            "Role 1: JD Analytics (/api/extract/jd)",
            "Role 2: Resume Parser (/api/extract/resume, /api/resume/parse)",
            "Role 4: Talent Check (/api/talent-check)",
            "Role 5: Skill Matching (/api/match, /api/skill-match)"
        ],
        "active_providers": [
            name for name, key in [
                ("Gemini", os.getenv("GEMINI_API_KEY")),
                ("OpenRouter", os.getenv("OPENROUTER_API_KEY")),
                ("OpenAI", os.getenv("OPENAI_API_KEY"))
            ] if key
        ] or ["Offline Multi-Keyword Heuristic"]
    }


# -----------------------------------------------------------------------------
# Module 1: JD Analytics (PDF/DOCX/Text -> ExtractedSkillList)
# -----------------------------------------------------------------------------
@app.post("/api/extract/jd")
async def extract_job_description(
    request: Request,
    file: Optional[UploadFile] = File(None)
):
    raw_text = ""
    file_name = "pasted_text.txt"

    if file is not None:
        file_name = os.path.basename(file.filename or "uploaded_jd")
        content = await file.read(MAX_UPLOAD_BYTES + 1)
        suffix = os.path.splitext(file_name)[1].lower()
        if suffix == ".pdf":
            raw_text = extract_text_from_pdf(content)
        elif suffix in {".docx", ".doc"}:
            raw_text = extract_text_from_docx(content)
        else:
            raw_text = content.decode("utf-8", errors="ignore")
    elif request.headers.get("content-type", "").lower().startswith("application/json"):
        body = await request.json()
        raw_text = str(body.get("text", "")).strip()
    else:
        raise HTTPException(status_code=400, detail="Provide either a PDF/DOCX file or a JSON text payload.")

    if not raw_text:
        raise HTTPException(status_code=422, detail="No readable text found in document.")

    # 1. Try LLM Providers (Gemini -> OpenRouter -> OpenAI)
    categories_prompt = "\n".join(f"{code}: {meta['name']}" for code, meta in RADIX_CATEGORIES.items())
    llm_prompt = f"""You are RADIX JD Analytics. Extract job-relevant skills from this job description.
Return valid JSON only matching:
{{
  "source_type": "jd",
  "source_file": {json.dumps(file_name)},
  "company": "Company Name",
  "role": "Job Title",
  "skills": [{{"skill_name":"...", "category_code":"COD|DSA|OOD|APTI|COMM|AI|CLOUD|SQL|SWE|SYSD|NETW|OS|OTHER", "evidence":"quote", "confidence":"high|medium|low"}}],
  "responsibilities": ["..."],
  "requirements": ["..."],
  "location": "location if stated"
}}
Categories:
{categories_prompt}
JOB DESCRIPTION:
{raw_text[:20000]}
"""
    for caller in [call_gemini, call_openrouter, call_openai]:
        llm_response = caller(llm_prompt)
        if llm_response:
            try:
                cleaned = re.sub(r"^```(?:json)?\s*", "", llm_response.strip(), flags=re.IGNORECASE)
                cleaned = re.sub(r"\s*```$", "", cleaned)
                data = json.loads(cleaned)
                if isinstance(data, dict) and "skills" in data and len(data["skills"]) > 0:
                    data["status"] = "success"
                    data["raw_text_length"] = len(raw_text)
                    return data
            except Exception:
                pass

    # 2. Robust NLP Heuristic Fallback (Extracts ALL matching skills)
    lower_text = raw_text.lower()
    searchable = f"{lower_text} {file_name.lower()}"
    detected_skills = []
    seen_skills = set()

    for cat_code, cat_meta in RADIX_CATEGORIES.items():
        for kw in cat_meta["keywords"]:
            if re.search(r"\b" + re.escape(kw) + r"\b", lower_text):
                skill_title = kw.upper() if kw in {"sql", "dsa", "ai", "oop", "gcp", "aws"} else kw.title()
                if skill_title.lower() not in seen_skills:
                    seen_skills.add(skill_title.lower())
                    # Extract supporting sentence context
                    sentences = [s.strip() for s in re.split(r"[.\n]", raw_text) if kw in s.lower() and len(s.strip()) > 10]
                    evidence = sentences[0] if sentences else f"Explicit requirement for {kw} in job specifications"
                    detected_skills.append({
                        "skill_name": skill_title,
                        "category_code": cat_code,
                        "evidence": evidence[:200],
                        "confidence": "high" if len(sentences) > 1 else "medium",
                    })

    # Heuristic company detection
    company = "Company not identified"
    if "google" in searchable:
        company = "Google LLC"
    elif "microsoft" in searchable:
        company = "Microsoft Corporation"
    elif "oracle" in searchable:
        company = "Oracle Financial Services Software"

    # Heuristic role detection
    role = "Software Engineer"
    if "data scientist" in searchable:
        role = "Data Scientist"
    elif "data analyst" in searchable:
        role = "Data Analyst"
    elif "application support" in searchable or "support analyst" in searchable:
        role = "Application Support Analyst"
    elif "associate software" in searchable:
        role = "Associate Software Engineer"

    lines = [line.strip("-•* \t") for line in raw_text.splitlines() if len(line.strip()) > 20]
    responsibilities = lines[1:6] if len(lines) >= 6 else lines[:3]
    requirements = lines[6:12] if len(lines) >= 12 else lines[3:7]

    return {
        "status": "success",
        "source_type": "jd",
        "source_file": file_name,
        "company": company,
        "role": role,
        "location": "Bengaluru / Hyderabad / Remote",
        "skills": detected_skills,
        "responsibilities": responsibilities,
        "requirements": requirements,
        "raw_text_length": len(raw_text),
    }


# -----------------------------------------------------------------------------
# Module 2: Resume Parser (PDF/DOCX -> CandidateProfile & Skills)
# Handles both /api/extract/resume and /api/resume/parse
# -----------------------------------------------------------------------------
@app.post("/api/extract/resume")
@app.post("/api/resume/parse")
async def extract_resume(file: UploadFile = File(...)):
    file_name = os.path.basename(file.filename or "uploaded_resume")
    suffix = os.path.splitext(file_name)[1].lower()
    if suffix not in {".pdf", ".docx", ".doc", ".txt"}:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    content = await file.read(MAX_UPLOAD_BYTES + 1)
    if suffix == ".pdf":
        raw_text = extract_text_from_pdf(content)
    elif suffix in {".docx", ".doc"}:
        raw_text = extract_text_from_docx(content)
    else:
        raw_text = content.decode("utf-8", errors="ignore")

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="No readable text found in uploaded resume.")

    # 1. Try LLM Providers (Gemini -> OpenRouter -> OpenAI)
    categories_list = ", ".join(RADIX_CATEGORIES.keys())
    resume_prompt = f"""You are RADIX Resume Analyzer. Extract technical candidate information from this resume.
Return valid JSON only matching:
{{
  "id": "cand_{abs(hash(file_name)) % 100000}",
  "name": "Candidate Full Name",
  "email": "Email Address",
  "education": "Degree and Major",
  "skills": [{{"skill_name":"...", "category_code":"{categories_list}|OTHER", "evidence":"quote", "confidence":"high|medium|low"}}],
  "categories": {{"COD": 8, "DSA": 7, "SWE": 8, "SQL": 7, "COMM": 7, "APTI": 7, "OOD": 7, "OS": 6, "NETW": 6, "SYSD": 6, "CLOUD": 6, "AI": 6}},
  "hackathons": ["..."],
  "internships": ["..."],
  "certifications": ["..."],
  "preferred_roles": ["..."]
}}
Allowed category codes: {categories_list}, OTHER.
RESUME TEXT:
{raw_text[:20000]}
"""
    for caller in [call_gemini, call_openrouter, call_openai]:
        llm_response = caller(resume_prompt)
        if llm_response:
            try:
                cleaned = re.sub(r"^```(?:json)?\s*", "", llm_response.strip(), flags=re.IGNORECASE)
                cleaned = re.sub(r"\s*```$", "", cleaned)
                data = json.loads(cleaned)
                if isinstance(data, dict) and "skills" in data:
                    data["status"] = "success"
                    data["fileName"] = file_name
                    return data
            except Exception:
                pass

    # 2. Robust NLP Heuristic Fallback across ALL 12 RADIX Categories
    lower = raw_text.lower()
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    candidate_name = lines[0] if lines else "Extracted Candidate"
    # Basic email regex
    email_match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", raw_text)
    email = email_match.group(0) if email_match else "candidate@example.com"

    extracted_skills = []
    category_levels = {code: 5 for code in RADIX_CATEGORIES.keys()}
    seen_skills = set()

    for cat_code, cat_meta in RADIX_CATEGORIES.items():
        cat_matches = []
        for kw in cat_meta["keywords"]:
            if re.search(r"\b" + re.escape(kw) + r"\b", lower):
                cat_matches.append(kw)
                skill_title = kw.upper() if kw in {"sql", "dsa", "ai", "oop", "gcp", "aws"} else kw.title()
                if skill_title.lower() not in seen_skills:
                    seen_skills.add(skill_title.lower())
                    sentences = [s.strip() for s in re.split(r"[.\n]", raw_text) if kw in s.lower() and len(s.strip()) > 10]
                    evidence = sentences[0] if sentences else f"Demonstrated proficiency in {kw}"
                    extracted_skills.append({
                        "skill_name": skill_title,
                        "category_code": cat_code,
                        "evidence": evidence[:200],
                        "confidence": "high" if len(sentences) > 1 else "medium",
                    })

        # Dynamically calibrate level (1-10) based on verified occurrences
        if cat_matches:
            category_levels[cat_code] = min(10, 5 + len(cat_matches))
        else:
            category_levels[cat_code] = 3

    # Education heuristics
    education = "B.Tech Computer Science & Engineering"
    for line in lines:
        if any(term in line.lower() for term in ["b.tech", "bachelor", "master", "m.tech", "degree", "computer science"]):
            education = line[:100]
            break

    return {
        "status": "success",
        "id": f"cand_{abs(hash(raw_text)) % 100000}",
        "name": candidate_name,
        "email": email,
        "education": education,
        "fileName": file_name,
        "skills": extracted_skills,
        "categories": category_levels,
        "hackathons": ["Built projects for collegiate competitions"],
        "internships": ["Experience in software development lifecycle"],
        "certifications": [],
        "preferred_roles": ["Software Engineer", "Backend Developer"]
    }


# -----------------------------------------------------------------------------
# Module 4: Talent Check (Candidate Profile vs Company Bar)
# -----------------------------------------------------------------------------
@app.post("/api/talent-check")
def run_talent_check(req: TalentCheckRequest):
    benchmarks_data = load_company_benchmarks()
    target_company = req.company or "Google LLC"
    company_data = benchmarks_data.get(target_company)

    if not company_data:
        # Fuzzy fallback match
        req_clean = target_company.strip().lower()
        for comp_name, data in benchmarks_data.items():
            if req_clean in comp_name.lower() or comp_name.lower() in req_clean:
                company_data = data
                break

    if not company_data:
        raise HTTPException(
            status_code=404,
            detail=f"Company '{target_company}' not found in benchmark expectations."
        )

    expectations = company_data.get("skillset_expectations", [])
    candidate_profile = req.profile or req.candidate or {}
    candidate_categories = (
        candidate_profile.get("categories")
        or candidate_profile.get("categoryScores")
        or {}
    )

    # If categories dictionary is not provided, dynamically derive from candidate skills array
    if not candidate_categories and candidate_profile.get("skills"):
        candidate_categories = {}
        for skill in candidate_profile.get("skills", []):
            code = skill.get("category_code") or skill.get("category")
            if code:
                conf = skill.get("confidence", "medium")
                score = 8 if conf == "high" else (6 if conf == "medium" else 5)
                candidate_categories[code] = max(candidate_categories.get(code, 0), score)

    total_weighted_ratio = 0.0
    total_weights = 0.0
    category_scores = []
    strengths = []
    gaps = []
    skillset_gap = []

    for exp in expectations:
        code = exp["category_code"]
        name = exp.get("category_name", RADIX_CATEGORIES.get(code, {}).get("name", code))
        required = float(exp["required_level"])
        weight = float(exp.get("weight", 1.0))
        importance = exp.get("importance", "medium")

        # Candidate level with realistic differentiation
        candidate_level = float(candidate_categories.get(code, 4))
        candidate_level = max(1.0, min(10.0, candidate_level))
        required = max(1.0, min(10.0, required))

        ratio = min(1.0, candidate_level / required) if required > 0 else 1.0
        total_weighted_ratio += ratio * weight
        total_weights += weight

        diff = candidate_level - required
        meets = diff >= 0

        cat_info = {
            "code": code,
            "category_code": code,
            "name": name,
            "category_name": name,
            "candidate_level": int(candidate_level),
            "required_level": int(required),
            "importance": importance,
            "weight": weight,
            "diff": int(diff),
            "meets_expectation": meets,
            "gap": not meets,
        }
        category_scores.append(cat_info)

        if meets:
            strengths.append(cat_info)
        else:
            gaps.append(cat_info)

        # Shared contract format
        skillset_gap.append({
            "category_code": code,
            "required_level": int(required),
            "candidate_level": int(candidate_level),
            "gap": not meets,
        })

    gaps.sort(key=lambda item: item["weight"] * abs(item["diff"]), reverse=True)
    readiness_score = round((total_weighted_ratio / total_weights) * 100) if total_weights > 0 else 0

    return {
        # Role 4 Agreed Contract
        "company": company_data.get("company_name", req.company),
        "skillset_gap": skillset_gap,
        "readiness_score": readiness_score,

        # UI & Backward Compatibility
        "status": "success",
        "score": readiness_score,
        "candidate_name": candidate_profile.get("name", "Candidate"),
        "category_scores": category_scores,
        "strengths": strengths,
        "gaps": gaps,
        "prioritized_actions": [
            f"Close top gap in {item['name']} (Current: {item['candidate_level']}/10 vs Required: {item['required_level']}/10)"
            for item in gaps[:3]
        ],
    }


# -----------------------------------------------------------------------------
# Module 5: Skill Matching (Fuzzy Matching with Actionable Missing Skills)
# Handles both /api/match and /api/skill-match
# -----------------------------------------------------------------------------
@app.post("/api/match")
@app.post("/api/skill-match")
def process_match(req: FlexibleMatchRequest):
    # Normalize input whether received from Role 5 schema {jd, candidate} or legacy {job, profile}
    raw_jd_skills = []
    source_file = "job_description.docx"
    if req.jd:
        raw_jd_skills = req.jd.skills
        source_file = req.jd.source_file or source_file
    elif req.job:
        raw_jd_skills = req.job.get("skills", [])
        source_file = req.job.get("source_file") or req.job.get("sourceFile") or source_file

    raw_cand_skills = []
    if req.candidate:
        raw_cand_skills = req.candidate.skills
    elif req.profile:
        raw_cand_skills = req.profile.get("skills", [])

    jd_skills = [normalize_skill(s) for s in raw_jd_skills if s]
    candidate_skills = [normalize_skill(s) for s in raw_cand_skills if s]

    # 1. Deduplicate JD skills while preserving original objects
    seen_jd = set()
    unique_jd_skills = []
    for s in jd_skills:
        norm = s.skill_name.lower().strip()
        if norm and norm not in seen_jd:
            seen_jd.add(norm)
            unique_jd_skills.append(s)

    # 2. Map normalized candidate skill names
    candidate_skill_map = {}
    for s in candidate_skills:
        norm = s.skill_name.lower().strip()
        if norm and norm not in candidate_skill_map:
            candidate_skill_map[norm] = s.skill_name

    matched_skills = []
    missing_skills = []
    threshold = 75

    for req_skill in unique_jd_skills:
        req_name = req_skill.skill_name.lower().strip()
        best_cand_name = None
        best_score = 0

        for cand_norm, cand_original in candidate_skill_map.items():
            if req_name == cand_norm:
                similarity = 100
            else:
                similarity = fuzz.token_sort_ratio(req_name, cand_norm)

            if similarity > best_score:
                best_score = similarity
                best_cand_name = cand_original

        if best_score >= threshold and best_cand_name is not None:
            matched_skills.append({
                "jd_skill": req_skill.skill_name,
                "name": req_skill.skill_name,
                "candidate_skill": best_cand_name,
                "category": req_skill.category_code,
                "category_code": req_skill.category_code,
                "match_confidence": int(best_score),
                "confidence": "high" if best_score >= 85 else "medium",
                "evidence": f"Demonstrated alignment with candidate skill '{best_cand_name}'",
            })
        else:
            missing_skills.append({
                "skill_name": req_skill.skill_name,
                "name": req_skill.skill_name,
                "category": req_skill.category_code,
                "category_code": req_skill.category_code,
                "recommendation": f"Prioritize coursework, practice questions, and practical projects for {req_skill.skill_name}.",
                "priority": "High Priority" if req_skill.confidence == "high" else "Medium Priority",
            })

    total_required = len(unique_jd_skills)
    match_score = round((len(matched_skills) / max(1, total_required)) * 100) if total_required > 0 else 0

    return {
        # Role 5 Data Contract
        "jd_source_file": source_file,
        "match_score": match_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,

        # UI & Backward Compatibility
        "status": "success",
        "score": match_score,
        "totalCount": total_required,
        "matchedCount": len(matched_skills),
        "missingCount": len(missing_skills),
        "gap_summary": f"{len(missing_skills)} critical skill gaps identified across target requirements.",
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
