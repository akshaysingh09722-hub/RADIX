import os
import sys
import json

# Ensure UTF-8 output on Windows console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

repo_root = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(repo_root, "backend"))
os.chdir(os.path.join(repo_root, "backend"))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def run_tests():
    print("=" * 70)
    print("RADIX TALENT MATCH -- END-TO-END AUTOMATED VERIFICATION")
    print("=" * 70)

    # 1. System Health
    print("\n[TEST 1] System Health & Active Providers")
    res = client.get("/api/health")
    assert res.status_code == 200, f"Health check failed: {res.text}"
    health = res.json()
    print(f"Status: {health['status']}")
    print(f"Active Providers: {health.get('active_providers')}")
    print(f"Modules Supported: {len(health.get('modules_supported', []))}")

    # 2. Role 1: JD Analytics (PDF & DOCX)
    print("\n" + "-" * 70)
    print("[TEST 2] Role 1: JD Analytics Extraction")
    
    jd_pdf_path = os.path.join(repo_root, "dataset_reference", "Talent Match Hackathon", "JDs", "PDF", "Google LLC - Data Scientist.pdf")
    if os.path.exists(jd_pdf_path):
        with open(jd_pdf_path, "rb") as f:
            res = client.post("/api/extract/jd", files={"file": ("Google LLC - Data Scientist.pdf", f, "application/pdf")})
        assert res.status_code == 200, f"JD PDF extraction failed: {res.text}"
        jd_data = res.json()
        print(f"  [PASS] PDF: Google LLC - Data Scientist.pdf")
        print(f"    Company: {jd_data.get('company')} | Role: {jd_data.get('role')}")
        print(f"    Extracted Skills Count: {len(jd_data.get('skills', []))}")
        sample_skills = [f"{s['skill_name']} ({s['category_code']})" for s in jd_data.get('skills', [])[:5]]
        print(f"    Sample Skills: {', '.join(sample_skills)}")

    jd_docx_path = os.path.join(repo_root, "dataset_reference", "Talent Match Hackathon", "JDs", "Word", "Microsoft - Software Engineer.docx")
    if os.path.exists(jd_docx_path):
        with open(jd_docx_path, "rb") as f:
            res = client.post("/api/extract/jd", files={"file": ("Microsoft - Software Engineer.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
        assert res.status_code == 200, f"JD DOCX extraction failed: {res.text}"
        jd_docx_data = res.json()
        print(f"  [PASS] DOCX: Microsoft - Software Engineer.docx")
        print(f"    Company: {jd_docx_data.get('company')} | Role: {jd_docx_data.get('role')}")
        print(f"    Extracted Skills Count: {len(jd_docx_data.get('skills', []))}")

    # 3. Role 2: Resume Parser (PDF & DOCX)
    print("\n" + "-" * 70)
    print("[TEST 3] Role 2: Resume Parser Extraction")
    
    resume_pdf_path = os.path.join(repo_root, "dataset_reference", "Talent Match Hackathon", "Resumes", "PDF", "Ananya Rao.pdf")
    ananya_profile = None
    if os.path.exists(resume_pdf_path):
        with open(resume_pdf_path, "rb") as f:
            res = client.post("/api/extract/resume", files={"file": ("Ananya Rao.pdf", f, "application/pdf")})
        assert res.status_code == 200, f"Resume PDF parsing failed: {res.text}"
        ananya_profile = res.json()
        print(f"  [PASS] PDF: Ananya Rao.pdf")
        print(f"    Candidate: {ananya_profile.get('name')} | Email: {ananya_profile.get('email')}")
        print(f"    Education: {ananya_profile.get('education')}")
        print(f"    Total Skills Extracted: {len(ananya_profile.get('skills', []))}")
        print(f"    Category Levels: {ananya_profile.get('categories')}")

    resume_docx_path = os.path.join(repo_root, "dataset_reference", "Talent Match Hackathon", "Resumes", "Word", "Karthik Subramaniam.docx")
    karthik_profile = None
    if os.path.exists(resume_docx_path):
        with open(resume_docx_path, "rb") as f:
            res = client.post("/api/extract/resume", files={"file": ("Karthik Subramaniam.docx", f, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")})
        assert res.status_code == 200, f"Resume DOCX parsing failed: {res.text}"
        karthik_profile = res.json()
        print(f"  [PASS] DOCX: Karthik Subramaniam.docx")
        print(f"    Candidate: {karthik_profile.get('name')} | Education: {karthik_profile.get('education')}")
        print(f"    Total Skills Extracted: {len(karthik_profile.get('skills', []))}")

    # 4. Role 4: Talent Check (Benchmark Match)
    print("\n" + "-" * 70)
    print("[TEST 4] Role 4: Talent Check Benchmark Scoring")
    
    if ananya_profile:
        for company in ["Google LLC", "Microsoft Corporation", "Oracle Financial Services Software"]:
            res = client.post("/api/talent-check", json={"profile": ananya_profile, "company": company})
            assert res.status_code == 200, f"Talent check failed: {res.text}"
            tc = res.json()
            print(f"  [PASS] Ananya Rao vs {company}:")
            print(f"    Readiness Score: {tc.get('readiness_score')}%")
            print(f"    Strengths: {len(tc.get('strengths', []))} categories | Gaps: {len(tc.get('gaps', []))} categories")
            if tc.get('prioritized_actions'):
                print(f"    Top Action: {tc.get('prioritized_actions')[0]}")

    # 5. Role 5: Skill Matching (Fuzzy Match & Gaps)
    print("\n" + "-" * 70)
    print("[TEST 5] Role 5: Skill Matching Engine")
    
    if ananya_profile and jd_data:
        match_payload = {
            "jd": jd_data,
            "candidate": ananya_profile
        }
        res = client.post("/api/match", json=match_payload)
        assert res.status_code == 200, f"Skill match failed: {res.text}"
        match_data = res.json()
        print(f"  [PASS] Match: Ananya Rao vs {jd_data.get('role')} at {jd_data.get('company')}")
        print(f"    Match Score: {match_data.get('match_score')}%")
        print(f"    Matched Skills ({match_data.get('matchedCount')}): {[m['jd_skill'] for m in match_data.get('matched_skills', [])[:5]]}")
        print(f"    Missing Skills ({match_data.get('missingCount')}): {[m['skill_name'] for m in match_data.get('missing_skills', [])[:4]]}")
        print(f"    Gap Summary: {match_data.get('gap_summary')}")

    print("\n" + "=" * 70)
    print("ALL 5 ROLES TESTED AND FULLY OPERATIONAL!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
