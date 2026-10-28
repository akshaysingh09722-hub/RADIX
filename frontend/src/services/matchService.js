import { apiClient } from './api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { RADIX_CATEGORIES } from '../lib/radixData';

const SAVED_REPORTS_KEY = 'radix_saved_reports_v1';

const getLocalSavedReports = () => {
  try {
    const raw = localStorage.getItem(SAVED_REPORTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Error reading saved reports:', e);
  }
  return [];
};

export const matchService = {
  async calculateMatch(candidateProfile, jobDescription) {
    if (!candidateProfile || !jobDescription) return null;

    // 1. TRY LIVE FASTAPI BACKEND FIRST
    try {
      const health = await apiClient.checkHealth();
      if (health.isOnline) {
        const { data } = await apiClient.matchSkills(candidateProfile, jobDescription);
        
        const matchScore = data.match_score;

        // Rehydrate matched skills for UI card components
        const matchedSkills = (data.matched_skills || []).map((m) => {
          const code = m.category || 'OTHER';
          return {
            skill_name: m.jd_skill || m.skill_name,
            category_code: code,
            category_name: RADIX_CATEGORIES[code]?.name || code,
            evidence: `Verified proficiency matching candidate skill ${m.candidate_skill || m.jd_skill}`,
            confidence: m.match_confidence >= 90 ? 'high' : 'medium',
            matched_with: m.candidate_skill || m.jd_skill,
          };
        });

        // Rehydrate missing skills for UI gap recommendation components
        const missingSkills = (data.missing_skills || []).map((m) => {
          const code = m.category || 'OTHER';
          const name = m.skill_name || m.jd_skill;
          return {
            skill_name: name,
            category_code: code,
            category_name: RADIX_CATEGORIES[code]?.name || code,
            job_requirement: `Required competency in ${name}`,
            importance: 'High Impact',
            recommendation: getRecommendation(name, code),
          };
        });

        let fitRating = 'Strong Match';
        let ratingColor = '#35D49A';
        if (matchScore >= 80) {
          fitRating = 'High Fit — Prime Interview Candidate';
          ratingColor = '#35D49A';
        } else if (matchScore >= 65) {
          fitRating = 'Promising Fit — Close Top Gaps';
          ratingColor = '#45D6FF';
        } else if (matchScore >= 50) {
          fitRating = 'Moderate Fit — Significant Preparation Needed';
          ratingColor = '#F4BE5E';
        } else {
          fitRating = 'Early Match — Foundational Training Advised';
          ratingColor = '#FF6B81';
        }

        return {
          candidateId: candidateProfile.id,
          candidateName: candidateProfile.name,
          jobId: jobDescription.id,
          jobTitle: jobDescription.role,
          company: jobDescription.company,
          companyShort: jobDescription.companyShort || jobDescription.company,
          location: jobDescription.location || 'Remote / Hybrid',
          ctc: jobDescription.ctc || 'Competitive',
          matchScore,
          fitRating,
          ratingColor,
          matchedCount: matchedSkills.length,
          partialCount: 0,
          missingCount: missingSkills.length,
          totalCount: matchedSkills.length + missingSkills.length,
          matchedSkills,
          partialSkills: [],
          missingSkills,
          summary: `${candidateProfile.name} scored ${matchScore}% match for ${jobDescription.role} at ${jobDescription.company}. Verified ${matchedSkills.length} core competencies across evaluated requirements.`,
          calculatedAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Live FastAPI match failed, falling back to local JS calculation:', err);
    }

    // 2. OFFLINE FALLBACK (Local JS fallback if backend server is not running)
    const candidateSkills = candidateProfile.skills || [];
    const jobSkills = jobDescription.skills || [];

    const matched = [];
    const partial = [];
    const missing = [];

    jobSkills.forEach((req) => {
      const reqName = req.skill_name.toLowerCase();
      const reqCat = req.category_code;

      const exactCandidateSkill = candidateSkills.find((cand) => {
        const cName = cand.skill_name.toLowerCase();
        return (
          cName === reqName ||
          cName.includes(reqName) ||
          reqName.includes(cName) ||
          (cName.includes('algo') && reqName.includes('algo')) ||
          (cName.includes('data struct') && reqName.includes('data struct')) ||
          (cName.includes('system design') && reqName.includes('system design')) ||
          (cName.includes('sql') && reqName.includes('sql')) ||
          (cName.includes('c++') && reqName.includes('c++')) ||
          (cName.includes('python') && reqName.includes('python')) ||
          (cName.includes('java') && reqName.includes('java'))
        );
      });

      if (exactCandidateSkill) {
        matched.push({
          skill_name: req.skill_name,
          category_code: req.category_code,
          category_name: RADIX_CATEGORIES[req.category_code]?.name || req.category_code,
          evidence: exactCandidateSkill.evidence || req.evidence,
          confidence: exactCandidateSkill.confidence || req.confidence || 'high',
          matched_with: exactCandidateSkill.skill_name,
        });
        return;
      }

      const categoryMatch = candidateSkills.find(
        (cand) => cand.category_code === reqCat
      );

      if (categoryMatch) {
        partial.push({
          skill_name: req.skill_name,
          category_code: req.category_code,
          category_name: RADIX_CATEGORIES[req.category_code]?.name || req.category_code,
          job_requirement: req.evidence,
          candidate_foundation: categoryMatch.skill_name,
          candidate_evidence: categoryMatch.evidence,
          recommendation: `Extend existing ${categoryMatch.skill_name} foundation to meet ${jobDescription.companyShort || jobDescription.company}'s specific ${req.skill_name} requirement.`,
        });
        return;
      }

      missing.push({
        skill_name: req.skill_name,
        category_code: req.category_code,
        category_name: RADIX_CATEGORIES[req.category_code]?.name || req.category_code,
        job_requirement: req.evidence,
        importance: req.confidence === 'high' ? 'High Impact' : 'Medium Impact',
        recommendation: getRecommendation(req.skill_name, req.category_code),
      });
    });

    const totalRequired = jobSkills.length || 1;
    const scoreRaw = ((matched.length * 1.0 + partial.length * 0.55) / totalRequired) * 100;
    const matchScore = Math.min(98, Math.max(25, Math.round(scoreRaw)));

    let fitRating = 'Strong Match';
    let ratingColor = '#35D49A';
    if (matchScore >= 80) {
      fitRating = 'High Fit — Prime Interview Candidate';
      ratingColor = '#35D49A';
    } else if (matchScore >= 65) {
      fitRating = 'Promising Fit — Close Top Gaps';
      ratingColor = '#45D6FF';
    } else if (matchScore >= 50) {
      fitRating = 'Moderate Fit — Significant Preparation Needed';
      ratingColor = '#F4BE5E';
    } else {
      fitRating = 'Early Match — Foundational Training Advised';
      ratingColor = '#FF6B81';
    }

    return {
      candidateId: candidateProfile.id,
      candidateName: candidateProfile.name,
      jobId: jobDescription.id,
      jobTitle: jobDescription.role,
      company: jobDescription.company,
      companyShort: jobDescription.companyShort || jobDescription.company,
      location: jobDescription.location,
      ctc: jobDescription.ctc,
      matchScore,
      fitRating,
      ratingColor,
      matchedCount: matched.length,
      partialCount: partial.length,
      missingCount: missing.length,
      totalCount: jobSkills.length,
      matchedSkills: matched,
      partialSkills: partial,
      missingSkills: missing,
      summary: `${candidateProfile.name} demonstrates ${matched.length} directly verified competencies for ${jobDescription.role} at ${jobDescription.company}. Closing ${missing.length} key area(s) will substantially elevate interview competitiveness.`,
      calculatedAt: new Date().toISOString(),
    };
  },

  async saveReport(report) {
    const reports = getLocalSavedReports();
    const newReport = {
      ...report,
      id: `report_${Date.now()}`,
      savedAt: new Date().toISOString(),
    };

    const updated = [newReport, ...reports];
    localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(updated));

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('saved_reports')
          .insert([newReport]);
      } catch (err) {
        console.warn('Supabase save report error (saved locally):', err);
      }
    }

    window.dispatchEvent(new CustomEvent('radix_reports_updated'));
    return newReport;
  },

  async getSavedReports() {
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('saved_reports')
          .select('*')
          .order('savedAt', { ascending: false });
        if (!error && data && data.length > 0) return data;
      } catch (err) {
        console.warn('Supabase fetch reports error, using local storage:', err);
      }
    }
    return getLocalSavedReports();
  },

  deleteReport(id) {
    const reports = getLocalSavedReports().filter((r) => r.id !== id);
    localStorage.setItem(SAVED_REPORTS_KEY, JSON.stringify(reports));
    window.dispatchEvent(new CustomEvent('radix_reports_updated'));
  }
};

function getRecommendation(skillName, categoryCode) {
  const map = {
    DSA: 'Practice intermediate to advanced graph & tree problems on LeetCode; focus on explaining time/space complexities.',
    SYSD: 'Review system design architectures (load balancers, caching, distributed messaging) and sketch sample mock designs.',
    SQL: 'Write complex JOINs, subqueries, and understand execution plans and indexing techniques.',
    CLOUD: 'Deploy a containerized application to AWS/Azure/GCP and set up a basic CI/CD pipeline.',
    SWE: 'Implement rigorous unit testing with 80%+ coverage and document code review practices.',
    AI: 'Build an applied ML model pipeline with scikit-learn and analyze classification/regression metrics under ambiguity.',
    OS: 'Review concurrency primitives, multithreading, and Linux terminal command line workflows.',
    NETW: 'Study HTTP/HTTPS protocols, RESTful endpoint lifecycle, and network latency diagnosis.',
    OOD: 'Design a system using Gang-of-Four design patterns (Factory, Observer, Strategy) adhering to SOLID principles.',
    COMM: 'Rehearse presenting project architectural tradeoffs to non-technical and engineering peers alike.',
    APTI: 'Practice quantitative and logical problem-solving questions under time pressure.',
  };
  return map[categoryCode] || `Build a targeted portfolio project demonstrating hands-on competency in ${skillName}.`;
}