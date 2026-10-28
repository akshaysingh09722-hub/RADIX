import os
import difflib
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Dict, List, Optional

try:
    from thefuzz import fuzz
except ImportError:
    class FuzzFallback:
        @staticmethod
        def token_sort_ratio(s1: str, s2: str) -> int:
            t1 = " ".join(sorted(s1.lower().split()))
            t2 = " ".join(sorted(s2.lower().split()))
            return round(difflib.SequenceMatcher(None, t1, t2).ratio() * 100)
    fuzz = FuzzFallback()

app = FastAPI(title="RADIX Role 5: Skill Matching", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. THE SHARED DATA CONTRACT
class Skill(BaseModel):
    skill_name: str = ""
    category_code: str = "OTHER"
    evidence: Optional[str] = None
    confidence: Optional[str] = None

def normalize_skill(s: Any) -> Skill:
    if isinstance(s, Skill):
        return s
    if isinstance(s, str):
        return Skill(skill_name=s.strip(), category_code="OTHER")
    if isinstance(s, dict):
        name = s.get("skill_name") or s.get("name") or s.get("title") or ""
        cat = s.get("category_code") or s.get("category") or "OTHER"
        return Skill(
            skill_name=str(name).strip(),
            category_code=str(cat).strip(),
            evidence=s.get("evidence"),
            confidence=s.get("confidence") or "high"
        )
    return Skill(skill_name=str(s).strip(), category_code="OTHER")

class ExtractedJD(BaseModel):
    source_type: Optional[str] = "jd"
    source_file: Optional[str] = "job_description.docx"
    company: Optional[str] = "Company"
    role: Optional[str] = "Role"
    skills: List[Skill] = []

class CandidateProfile(BaseModel):
    name: Optional[str] = "Candidate"
    email: Optional[str] = "candidate@example.com"
    skills: List[Skill] = []

class MatchRequest(BaseModel):
    jd: Optional[ExtractedJD] = None
    candidate: Optional[CandidateProfile] = None
    job: Optional[Dict[str, Any]] = None
    profile: Optional[Dict[str, Any]] = None

# 2. THE FUZZY MATCHING LOGIC
def calculate_match(jd_skills: List[Skill], candidate_skills: List[Skill], threshold: int = 75):
    # 1. Deduplicate JD skills while preserving original Skill objects
    seen_jd = set()
    unique_jd_skills = []
    for s in jd_skills:
        norm = s.skill_name.lower().strip()
        if norm and norm not in seen_jd:
            seen_jd.add(norm)
            unique_jd_skills.append(s)

    # 2. Map normalized candidate skill names to original strings
    candidate_skill_map = {}
    for s in candidate_skills:
        norm = s.skill_name.lower().strip()
        if norm and norm not in candidate_skill_map:
            candidate_skill_map[norm] = s.skill_name

    matched_skills = []
    missing_skills = []

    for req_skill in unique_jd_skills:
        req_name = req_skill.skill_name.lower().strip()
        best_cand_name = None
        best_score = 0

        # Evaluate ALL candidate skills to find the BEST score
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
                "match_confidence": int(best_score)
            })
        else:
            missing_skills.append({
                "skill_name": req_skill.skill_name,
                "name": req_skill.skill_name,
                "category": req_skill.category_code,
                "category_code": req_skill.category_code
            })

    total_required = len(unique_jd_skills)
    score = (len(matched_skills) / total_required * 100) if total_required > 0 else 0

    return {
        "match_score": round(score, 1),
        "score": round(score, 1),
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "totalCount": total_required,
        "matchedCount": len(matched_skills),
        "missingCount": len(missing_skills),
    }

# 3. THE API ENDPOINTS
@app.get("/api/health")
def health_check():
    return {"status": "online", "service": "RADIX Role 5: Skill Matching", "port": 8001}

@app.post("/api/match")
@app.post("/api/skill-match")
async def process_match(request: MatchRequest):
    # Normalize input whether received from {jd, candidate} or {job, profile}
    jd_skills = []
    source_file = "job_description.docx"
    candidate_skills = []

    raw_jd_skills = []
    if request.jd:
        raw_jd_skills = request.jd.skills
        source_file = request.jd.source_file or source_file
    elif request.job:
        raw_jd_skills = request.job.get("skills", [])
        source_file = request.job.get("source_file") or request.job.get("sourceFile") or source_file

    raw_cand_skills = []
    if request.candidate:
        raw_cand_skills = request.candidate.skills
    elif request.profile:
        raw_cand_skills = request.profile.get("skills", [])

    jd_skills = [normalize_skill(s) for s in raw_jd_skills if s]
    candidate_skills = [normalize_skill(s) for s in raw_cand_skills if s]

    result = calculate_match(jd_skills, candidate_skills)
    return {
        "status": "success",
        "jd_source_file": source_file,
        "match_score": result["match_score"],
        "score": result["score"],
        "matched_skills": result["matched_skills"],
        "missing_skills": result["missing_skills"],
        "totalCount": result["totalCount"],
        "matchedCount": result["matchedCount"],
        "missingCount": result["missingCount"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
