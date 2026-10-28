import io
import pypdf
import docx
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="RADIX Role 2: LLM-Powered Resume Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Skill(BaseModel):
    skill_name: str
    category_code: str
    evidence: Optional[str] = None
    confidence: Optional[str] = None

class CandidateProfile(BaseModel):
    id: str
    name: str
    email: str
    skills: List[Skill]

client = genai.Client()

def extract_pdf_text(file_bytes: bytes) -> str:
    try:
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        text = ""
        for page in reader.pages:
            content = page.extract_text()
            if content:
                text += content + "\n"
        return text
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF file: {str(e)}")

def extract_docx_text(file_bytes: bytes) -> str:
    try:
        doc = docx.Document(io.BytesIO(file_bytes))
        return "\n".join([paragraph.text for paragraph in doc.paragraphs])
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read DOCX file: {str(e)}")

@app.post("/api/resume/parse", response_model=CandidateProfile)
async def parse_resume_with_llm(file: UploadFile = File(...)):
    filename = file.filename.lower()
    if not (filename.endswith('.pdf') or filename.endswith('.docx')):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")
    
    file_bytes = await file.read()
    
    # Route to the correct text extractor based on file extension
    if filename.endswith('.pdf'):
        raw_text = extract_pdf_text(file_bytes)
    else:
        raw_text = extract_docx_text(file_bytes)
    
    prompt = f"""
    You are an expert technical recruiter and resume parser for the RADIX platform.
    Analyze the following resume text and extract:
    1. The candidate's full name.
    2. Their email address.
    3. A comprehensive list of their technical skills. 
    
    For each skill, assign an appropriate category code from this exact list: [SWE, CLOUD, SQL, DSA, AI, SYSD, OTHER].
    Provide short text evidence from the text where it was found, and set confidence to 'high', 'medium', or 'low'.

    Resume Text:
    {raw_text}
    """

    try:
        response = client.models.generate_content(
            model='gemini-3.8-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CandidateProfile,
                temperature=0.1, 
            ),
        )
        
        profile = CandidateProfile.model_validate_json(response.text)
        
        if not profile.id:
            profile.id = f"cand_{abs(hash(raw_text)) % 100000}"
            
        return profile

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM Parsing failed: {str(e)}")