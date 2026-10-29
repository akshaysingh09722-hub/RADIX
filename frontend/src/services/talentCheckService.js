import { COMPANY_EXPECTATIONS, RADIX_CATEGORIES } from '../lib/radixData';

export const talentCheckService = {
  getCompanies() {
    return Object.keys(COMPANY_EXPECTATIONS);
  },

  getCompanyDetails(companyName) {
    return COMPANY_EXPECTATIONS[companyName] || COMPANY_EXPECTATIONS['Google LLC'];
  },

  calculateReadiness(candidateProfile, companyName) {
    const company = this.getCompanyDetails(companyName);
    if (!candidateProfile || !company) return null;

    const expectations = company.skillset_expectations;
    let totalWeightedScore = 0;
    let totalWeight = 0;

    const categoryBreakdown = expectations.map((exp) => {
      const code = exp.category_code;
      // Candidate level from profile categoryScores or derived from skills
      let candidateLevel = 0;
      if (candidateProfile.categoryScores && candidateProfile.categoryScores[code] !== undefined) {
        candidateLevel = candidateProfile.categoryScores[code];
      } else if (Array.isArray(candidateProfile.skills) && candidateProfile.skills.length > 0) {
        const catSkills = candidateProfile.skills.filter((s) => s.category_code === code);
        if (catSkills.length > 0) {
          const profs = catSkills.map((s) => s.proficiency || (s.confidence === 'high' ? 8 : s.confidence === 'medium' ? 6 : 4));
          candidateLevel = Math.round(profs.reduce((a, b) => a + b, 0) / profs.length);
        } else {
          candidateLevel = 0;
        }
      } else {
        candidateLevel = 0;
      }

      const requiredLevel = exp.required_level;
      const weight = exp.weight || 1.0;
      const ratio = Math.min(1.0, candidateLevel / requiredLevel);

      totalWeightedScore += ratio * weight;
      totalWeight += weight;

      const gap = candidateLevel < requiredLevel;
      const delta = candidateLevel - requiredLevel;

      let status = 'meets';
      if (delta >= 1) status = 'exceeds';
      else if (delta === 0) status = 'meets';
      else if (delta === -1) status = 'minor_gap';
      else status = 'major_gap';

      return {
        category_code: code,
        category_name: exp.category_name || RADIX_CATEGORIES[code]?.name || code,
        required_level: requiredLevel,
        candidate_level: candidateLevel,
        weight,
        importance: exp.importance,
        description: exp.description,
        gap,
        delta,
        status,
        color: RADIX_CATEGORIES[code]?.color || '#45D6FF',
        priority_score: gap ? weight * Math.abs(delta) : 0,
      };
    });

    const readinessScore = Math.round((totalWeightedScore / totalWeight) * 100);

    const meetingSkills = categoryBreakdown.filter((c) => !c.gap);
    const skillGaps = categoryBreakdown.filter((c) => c.gap);

    // Sort gaps by priority_score descending
    const prioritizedGaps = [...skillGaps].sort((a, b) => b.priority_score - a.priority_score);

    let readinessTier = 'Developing Readiness';
    let readinessBadgeClass = 'badge-warning';
    if (readinessScore >= 85) {
      readinessTier = 'Interview Ready (Exceeds Benchmark)';
      readinessBadgeClass = 'badge-success';
    } else if (readinessScore >= 70) {
      readinessTier = 'Competitive Match (Targeted Polish)';
      readinessBadgeClass = 'badge-primary';
    } else if (readinessScore >= 55) {
      readinessTier = 'Developing Readiness (Key Gaps to Close)';
      readinessBadgeClass = 'badge-warning';
    } else {
      readinessTier = 'Early Preparation Stage';
      readinessBadgeClass = 'badge-danger';
    }

    return {
      companyName: company.company_name,
      companyBadge: company.badge,
      companyDescription: company.description,
      readinessScore,
      readinessTier,
      readinessBadgeClass,
      totalCategories: expectations.length,
      categoriesMeeting: meetingSkills.length,
      categoriesGap: skillGaps.length,
      breakdown: categoryBreakdown,
      meetingSkills,
      skillGaps: prioritizedGaps,
      formulaExplanation: {
        formula: 'Readiness = (Sum of [Weight_i * min(1.0, CandidateLevel_i / RequiredLevel_i)] / Sum of Weights) * 100',
        weightsTotal: totalWeight.toFixed(2),
        evaluatedCategories: expectations.length,
      }
    };
  }
};
