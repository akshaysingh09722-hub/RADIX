import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Building,
  ArrowRight,
  Bookmark,
  Info,
  Target,
  GitCompare,
  Sparkles,
  TrendingUp,
  Award,
  ChevronRight,
  RefreshCw,
  FileSearch,
  Layers
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { talentCheckService } from '../services/talentCheckService';
import { apiClient } from '../services/api';
import { matchService } from '../services/matchService';
import Card from '../components/ui/Card';
import ScoreRing from '../components/ui/ScoreRing';
import RadarChart from '../components/ui/RadarChart';
import CategoryBar from '../components/ui/CategoryBar';
import Modal from '../components/ui/Modal';
import { RADIX_CATEGORIES } from '../lib/radixData';

export default function TalentCheckPage() {
  const navigate = useNavigate();
  const { activeCandidate, selectedCompany, setSelectedCompany, addToast } = useApp();

  const [company, setCompany] = useState(selectedCompany || 'Google LLC');
  const [viewMode, setViewMode] = useState('standards'); // 'standards' (Company Hiring Bar) | 'readiness' (Candidate Evaluation)
  const [activeTab, setActiveTab] = useState('all');
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState('');

  const companies = talentCheckService.getCompanies();
  const currentCompanyDetails = talentCheckService.getCompanyDetails(company);
  const companyExpectations = currentCompanyDetails?.skillset_expectations || [];

  // Create pure company benchmark scores for radar visualization
  const companyBenchmarkScores = {};
  companyExpectations.forEach((item) => {
    companyBenchmarkScores[item.category_code] = item.required_level;
  });

  const runEvaluation = useCallback(async (forcedCompany = company) => {
    if (!activeCandidate) {
      setEvaluation(null);
      setEvaluationError('No candidate profile selected.');
      return;
    }

    setIsEvaluating(true);
    setEvaluationError('');

    try {
      const candidateCategories =
        activeCandidate.categoryScores &&
        Object.keys(activeCandidate.categoryScores).length > 0
          ? activeCandidate.categoryScores
          : activeCandidate.categories || {};

      const hasCandidateSkills = (activeCandidate.skills?.length || 0) > 0 ||
        Object.values(candidateCategories).some((v) => Number(v) > 0);

      // If candidate has no skills at all, calculate a clean 0-score baseline without throwing
      if (!hasCandidateSkills) {
        const localEval = talentCheckService.calculateReadiness(activeCandidate, forcedCompany);
        setEvaluation(localEval);
        setIsEvaluating(false);
        return;
      }

      const result = await apiClient.runTalentCheck(
        {
          name: activeCandidate.name,
          categories: candidateCategories,
          skills: activeCandidate.skills || [],
        },
        forcedCompany
      );

      if (result.source !== 'live_backend' || !result.data) {
        const localEval = talentCheckService.calculateReadiness(activeCandidate, forcedCompany);
        if (localEval) {
          setEvaluation(localEval);
          setIsEvaluating(false);
          return;
        }
        throw new Error('Evaluation service is temporarily unavailable.');
      }

      const data = result.data;
      const details = talentCheckService.getCompanyDetails(forcedCompany);
      const expectations = details.skillset_expectations || [];
      const backendScores = Array.isArray(data.category_scores) ? data.category_scores : [];

      const breakdown = backendScores.map((score) => {
        const code = score.code || score.category_code;
        const expected = expectations.find((item) => item.category_code === code) || {};

        const candidateLevel = Number(score.candidate_level || 0);
        const requiredLevel = Number(score.required_level ?? expected.required_level ?? 8);
        const weight = Number(score.weight ?? expected.weight ?? 1);
        const delta = candidateLevel - requiredLevel;
        const gap = score.meets_expectation !== undefined ? !score.meets_expectation : delta < 0;

        let status = 'meets';
        if (delta >= 1) status = 'exceeds';
        else if (delta === -1) status = 'minor_gap';
        else if (delta < -1) status = 'major_gap';

        return {
          category_code: code,
          category_name: score.name || expected.category_name || code,
          required_level: requiredLevel,
          candidate_level: candidateLevel,
          weight,
          importance: score.importance || expected.importance || 'medium',
          description: expected.description || '',
          gap,
          delta,
          status,
          color: RADIX_CATEGORIES[code]?.color || '#45D6FF',
          priority_score: gap ? weight * Math.abs(delta) : 0,
        };
      });

      const meetingSkills = breakdown.filter((item) => !item.gap);
      const skillGaps = breakdown
        .filter((item) => item.gap)
        .sort((a, b) => b.priority_score - a.priority_score);

      const readinessScore = Number(data.readiness_score || 0);

      let readinessTier = 'Early Preparation Stage';
      let readinessBadgeClass = 'badge-danger';
      if (readinessScore >= 85) {
        readinessTier = 'Interview Ready (Exceeds Benchmark)';
        readinessBadgeClass = 'badge-success';
      } else if (readinessScore >= 70) {
        readinessTier = 'Competitive Match (Targeted Polish)';
        readinessBadgeClass = 'badge-primary';
      } else if (readinessScore >= 50) {
        readinessTier = 'Developing Readiness (Key Gaps to Close)';
        readinessBadgeClass = 'badge-warning';
      }

      const mappedEvaluation = {
        companyName: data.company || forcedCompany,
        companyBadge: details.badge,
        companyDescription: details.description,
        readinessScore,
        readinessTier,
        readinessBadgeClass,
        totalCategories: breakdown.length,
        categoriesMeeting: meetingSkills.length,
        categoriesGap: skillGaps.length,
        breakdown,
        meetingSkills,
        skillGaps,
        formulaExplanation: {
          formula: 'Readiness = backend-calculated weighted competency score',
          weightsTotal: breakdown.reduce((sum, item) => sum + item.weight, 0).toFixed(2),
          evaluatedCategories: breakdown.length,
        },
      };

      setEvaluation(mappedEvaluation);
    } catch (error) {
      console.warn('Talent check evaluation notice:', error.message);
      const localEval = talentCheckService.calculateReadiness(activeCandidate, forcedCompany);
      if (localEval) {
        setEvaluation(localEval);
      } else {
        setEvaluationError(error.message || 'Unable to evaluate candidate readiness.');
      }
    } finally {
      setIsEvaluating(false);
    }
  }, [activeCandidate, company]);

  const handleSelectCompany = (compName) => {
    setCompany(compName);
    setSelectedCompany(compName);
    // In readiness mode, automatically re-run evaluation for the newly selected company
    if (viewMode === 'readiness') {
      runEvaluation(compName);
    }
  };

  const handleEvaluateClick = () => {
    setViewMode('readiness');
    runEvaluation(company);
    addToast(`Evaluating readiness against ${company} hiring bar...`, 'info');
  };

  const handleSaveReport = async () => {
    if (!evaluation) return;
    setIsSaving(true);
    try {
      await matchService.saveReport({
        type: 'talent_check',
        title: `Talent Insights — ${company} Readiness`,
        candidateId: activeCandidate?.id || 'candidate',
        candidateName: activeCandidate?.name || 'Candidate',
        company,
        readinessScore: evaluation.readinessScore,
        readinessTier: evaluation.readinessTier,
        summary: `${activeCandidate?.name} achieved ${evaluation.readinessScore}/100 readiness against ${company}'s 12-competency hiring bar. ${evaluation.categoriesMeeting} categories meet expectations; ${evaluation.categoriesGap} categories require targeted preparation.`,
        breakdown: evaluation.breakdown,
      });
      addToast(`Evaluation saved to Saved Reports!`, 'success');
    } catch (err) {
      addToast(`Error saving report: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredCategories = evaluation?.breakdown
    ? evaluation.breakdown.filter((cat) => {
        if (activeTab === 'gaps') return cat.gap;
        if (activeTab === 'met') return !cat.gap;
        return true;
      })
    : [];

  const evaluationBenchmarkScores = {};
  if (evaluation?.breakdown) {
    evaluation.breakdown.forEach((b) => {
      evaluationBenchmarkScores[b.category_code] = b.required_level;
    });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Talent Insights
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {viewMode === 'standards'
              ? 'Inspect verified hiring expectations and competency bars across all 12 RADIX standards.'
              : `Comparing ${activeCandidate?.name}'s competencies against ${company}'s verified hiring standards.`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View Mode Toggle Pill */}
          <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '3px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setViewMode('standards')}
              className={`btn-ghost ${viewMode === 'standards' ? 'btn-primary' : ''}`}
              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-sm)', gap: '6px' }}
            >
              <Building size={14} />
              <span>Company Standards Bar</span>
            </button>
            <button
              onClick={handleEvaluateClick}
              className={`btn-ghost ${viewMode === 'readiness' ? 'btn-primary' : ''}`}
              style={{ padding: '6px 14px', fontSize: '12px', borderRadius: 'var(--radius-sm)', gap: '6px' }}
            >
              <GitCompare size={14} />
              <span>Evaluate My Readiness</span>
            </button>
          </div>

          {viewMode === 'readiness' && (
            <>
              <button
                onClick={() => setShowFormulaModal(true)}
                className="btn btn-outline"
                style={{ height: '36px', padding: '0 12px' }}
                title="View Scoring Formula"
              >
                <Info size={15} />
              </button>
              <button
                onClick={handleSaveReport}
                disabled={isSaving || !evaluation}
                className="btn btn-secondary"
                style={{ height: '36px' }}
              >
                <Bookmark size={15} />
                <span>{isSaving ? 'Saving...' : 'Save Evaluation'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Company Selector Ribbon */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '8px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
        }}
      >
        {companies.map((compName) => {
          const isSelected = company === compName;
          const details = talentCheckService.getCompanyDetails(compName);
          return (
            <div
              key={compName}
              onClick={() => handleSelectCompany(compName)}
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                background: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: isSelected ? 'linear-gradient(135deg, #45D6FF 0%, #8B7CFF 100%)' : 'rgba(255, 255, 255, 0.05)',
                    color: isSelected ? '#0B1020' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '800',
                    fontSize: '13px',
                  }}
                >
                  <Building size={18} />
                </div>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                    {compName}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                    {details?.badge || 'Enterprise Benchmark'}
                  </div>
                </div>
              </div>
              {isSelected && <span className="badge badge-primary">Active Inspection</span>}
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* MODE 1: COMPANY STANDARDS & HIRING BAR INSPECTION (DEFAULT USER EXPERIENCE) */}
      {/* ========================================================================= */}
      {viewMode === 'standards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Top 2 Cards: Company Envelope & Radar */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
            <Card
              title={`${company} — Verified Hiring Bar`}
              subtitle={currentCompanyDetails?.badge || 'Tier-1 Standards'}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '10px 0' }}>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {currentCompanyDetails?.description || 'Curated enterprise hiring standards.'}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '4px' }}>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'var(--accent-cyan)' }}>12</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Categories Evaluated</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#35D49A' }}>
                      {companyExpectations.filter(e => e.importance === 'critical').length}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Critical Priority Bars</div>
                  </div>
                  <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#F4BE5E' }}>Level 7-9</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Expected Range</div>
                  </div>
                </div>

                <div style={{ marginTop: '12px', padding: '16px', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(135deg, rgba(69, 214, 255, 0.08) 0%, rgba(139, 124, 255, 0.08) 100%)', border: '1px solid rgba(69, 214, 255, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Ready to evaluate your readiness?
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Overlay {activeCandidate?.name}&apos;s verified skills against this exact benchmark bar.
                      </div>
                    </div>
                    <button
                      onClick={handleEvaluateClick}
                      className="btn btn-primary"
                      style={{ height: '38px', padding: '0 16px', fontSize: '13px' }}
                    >
                      <GitCompare size={15} />
                      <span>Evaluate My Readiness</span>
                    </button>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              title={`${company} Competency Hiring Envelope`}
              subtitle="Target proficiency threshold (Scale: 1 to 10) across 12 RADIX standards"
            >
              <div style={{ padding: '8px 0', textAlign: 'center' }}>
                <RadarChart
                  candidateScores={companyBenchmarkScores}
                  benchmarkScores={companyBenchmarkScores}
                  size={360}
                />
                <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '12px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B7CFF' }}>
                    <span style={{ width: '14px', height: '3px', background: '#8B7CFF', borderRadius: '2px' }} />
                    {company} Verified Minimum Standards
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* 12 Standards Detailed Breakdown */}
          <Card
            title={`Detailed Requirements Bar — All 12 Competencies for ${company}`}
            subtitle="Understand what this employer expects before submitting applications or scheduling technical interviews"
            icon={Layers}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 24px' }}>
              {companyExpectations.map((exp) => {
                const categoryDef = RADIX_CATEGORIES[exp.category_code] || {};
                return (
                  <div
                    key={exp.category_code}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          className="badge"
                          style={{
                            background: `${categoryDef.color || '#45D6FF'}20`,
                            color: categoryDef.color || '#45D6FF',
                            fontWeight: '700',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '11px',
                          }}
                        >
                          {exp.category_code}
                        </span>
                        <span style={{ fontWeight: '700', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          {exp.category_name || categoryDef.name}
                        </span>
                      </div>
                      <span
                        className="badge"
                        style={{
                          background: exp.importance === 'critical' ? 'rgba(255, 107, 129, 0.15)' : 'rgba(244, 190, 94, 0.15)',
                          color: exp.importance === 'critical' ? '#FF6B81' : '#F4BE5E',
                          fontSize: '10px',
                        }}
                      >
                        {exp.importance}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Required Proficiency Bar:</span>
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                        Level {exp.required_level} / 10
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${(exp.required_level / 10) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #45D6FF, #8B7CFF)',
                        }}
                      />
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, marginTop: '4px' }}>
                      {exp.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE 2: CANDIDATE READINESS EVALUATION (ON DEMAND VIA CLICK)               */}
      {/* ========================================================================= */}
      {viewMode === 'readiness' && (
        <>
          {isEvaluating ? (
            <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}>
              <RefreshCw size={28} className="spin-animation" style={{ color: 'var(--accent-cyan)', margin: '0 auto 16px' }} />
              <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                Evaluating {activeCandidate?.name}&apos;s Readiness vs {company}...
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Running multi-dimensional gap analysis against verified competency thresholds.
              </p>
            </div>
          ) : evaluation ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Main Readiness Gauge & Overview Card */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '20px' }}>
                <Card
                  title="Overall Company Readiness"
                  subtitle={`Evaluated against ${evaluation.companyName}'s tier-1 hiring bar`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0 20px', textAlign: 'center' }}>
                    <ScoreRing
                      score={evaluation.readinessScore}
                      size={170}
                      strokeWidth={14}
                      sublabel={`/ 100`}
                      color={evaluation.readinessScore >= 80 ? '#35D49A' : evaluation.readinessScore >= 65 ? '#45D6FF' : '#F4BE5E'}
                      gradientId="talent-ring-grad"
                    />

                    <div style={{ marginTop: '16px' }}>
                      <span className={`badge ${evaluation.readinessBadgeClass}`} style={{ fontSize: '12px', padding: '6px 14px' }}>
                        {evaluation.readinessTier}
                      </span>
                    </div>

                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '12px', maxWidth: '340px' }}>
                      Candidate {activeCandidate?.name} satisfies the expected level in{' '}
                      <strong style={{ color: '#35D49A' }}>{evaluation.categoriesMeeting}</strong> of{' '}
                      {evaluation.totalCategories} competency categories.
                    </p>

                    <div style={{ display: 'flex', gap: '16px', marginTop: '20px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', width: '100%', justifyContent: 'space-around' }}>
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#35D49A' }}>
                          {evaluation.categoriesMeeting}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Meets / Exceeds</div>
                      </div>
                      <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: '#F4BE5E' }}>
                          {evaluation.categoriesGap}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Skill Gaps</div>
                      </div>
                      <div style={{ width: '1px', background: 'var(--border-subtle)' }} />
                      <div>
                        <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent-cyan)' }}>
                          {activeCandidate?.skills?.length || 0}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Skills</div>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card
                  title="Candidate Level vs Company Expected Bar"
                  subtitle="Dual polygon comparison across all 12 RADIX categories"
                >
                  <div style={{ padding: '8px 0', textAlign: 'center' }}>
                    <RadarChart
                      candidateScores={Object.fromEntries(
                        evaluation.breakdown.map((item) => [
                          item.category_code,
                          item.candidate_level,
                        ])
                      )}
                      benchmarkScores={evaluationBenchmarkScores}
                      size={360}
                    />

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '12px', fontSize: '12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#45D6FF' }}>
                        <span style={{ width: '12px', height: '12px', background: '#45D6FF', borderRadius: '3px' }} />
                        {activeCandidate?.name} (Verified Profile)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B7CFF' }}>
                        <span style={{ width: '14px', height: '2px', borderTop: '2px dashed #8B7CFF' }} />
                        {evaluation.companyName} Bar
                      </span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Category-by-Category Comparisons */}
              <Card
                title="Category-by-Category Evaluation (12 RADIX Standards)"
                subtitle="Candidate verified proficiency versus expected company baseline (Levels 1 to 10)"
                actions={
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[
                      { id: 'all', label: `All (12)` },
                      { id: 'gaps', label: `Gaps (${evaluation.categoriesGap})` },
                      { id: 'met', label: `Meets Bar (${evaluation.categoriesMeeting})` },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        style={{
                          background: activeTab === tab.id ? 'var(--bg-surface-elevated)' : 'transparent',
                          border: activeTab === tab.id ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                          color: activeTab === tab.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                          borderRadius: 'var(--radius-md)',
                          padding: '5px 12px',
                          fontSize: '11.5px',
                          fontWeight: activeTab === tab.id ? '600' : '500',
                          cursor: 'pointer',
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                }
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px 28px' }}>
                  {filteredCategories.map((cat) => (
                    <CategoryBar
                      key={cat.category_code}
                      categoryCode={cat.category_code}
                      categoryName={cat.category_name}
                      candidateLevel={cat.candidate_level}
                      requiredLevel={cat.required_level}
                      importance={cat.importance}
                      description={cat.description}
                    />
                  ))}
                </div>
              </Card>

              {/* Prioritized Improvement Roadmap */}
              <Card
                title="Prioritized Improvement Roadmap"
                subtitle="Ranked by gap severity and company weighting to maximize hiring readiness"
                icon={Target}
              >
                {evaluation.skillGaps.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#35D49A' }}>
                    <CheckCircle2 size={32} style={{ margin: '0 auto 8px' }} />
                    <h4 style={{ fontSize: '16px', color: '#FFFFFF' }}>Candidate Meets All Expected Thresholds!</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      No critical gaps identified for {evaluation.companyName}. Proceed directly to Skill Matching.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {evaluation.skillGaps.map((item, idx) => (
                      <div
                        key={item.category_code}
                        style={{
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                          gap: '16px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              background: idx === 0 ? 'rgba(255, 107, 129, 0.2)' : 'rgba(244, 190, 94, 0.2)',
                              color: idx === 0 ? '#FF6B81' : '#F4BE5E',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '12px',
                              flexShrink: 0,
                            }}
                          >
                            #{idx + 1}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                                {item.category_name} ({item.category_code})
                              </span>
                              <span
                                className="badge"
                                style={{
                                  background: item.importance === 'critical' ? 'rgba(255, 107, 129, 0.15)' : 'rgba(244, 190, 94, 0.15)',
                                  color: item.importance === 'critical' ? '#FF6B81' : '#F4BE5E',
                                  fontSize: '9.5px',
                                }}
                              >
                                {item.importance} Priority
                              </span>
                            </div>

                            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {item.description}
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              <span>Current: <strong style={{ color: 'var(--text-primary)' }}>Level {item.candidate_level}</strong></span>
                              <span>Target: <strong style={{ color: 'var(--accent-cyan)' }}>Level {item.required_level}</strong></span>
                              <span>Weight: <strong>{item.weight}x</strong></span>
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => navigate('/skill-matching')}
                          className="btn btn-outline"
                          style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
                        >
                          <span>Match Role</span>
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-subtle)' }}>
              <h3>No evaluation loaded</h3>
              <button onClick={() => runEvaluation(company)} className="btn btn-primary" style={{ marginTop: '12px' }}>
                Run Evaluation
              </button>
            </div>
          )}
        </>
      )}

      {/* Formula Modal */}
      <Modal
        isOpen={showFormulaModal}
        onClose={() => setShowFormulaModal(false)}
        title="Talent Readiness Calculation Formula"
        subtitle="Transparent weighted scoring methodology"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent-cyan)', marginBottom: '4px' }}>
              Mathematical Formulation
            </div>
            <code style={{ fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              Readiness Score = ∑ [ min(1.0, candidate_level / required_level) * weight ] / ∑ [ weight ] * 100
            </code>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Each of the 12 RADIX categories carries a defined employer importance weight (1.0x to 1.5x for critical disciplines such as COD, DSA, and SYSD). Candidates meeting or exceeding target levels receive full weighted credit. Gaps decrease the readiness score proportionally to gap severity and category weight.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button onClick={() => setShowFormulaModal(false)} className="btn btn-primary">
              Got it
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
