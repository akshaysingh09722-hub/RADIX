import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Bookmark,
  Sparkles,
  Printer,
  Target,
  RefreshCw,
  AlertTriangle,
  FileText,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { apiClient } from '../services/api';
import { matchService } from '../services/matchService';
import Card from '../components/ui/Card';
import ScoreRing from '../components/ui/ScoreRing';
import { RADIX_CATEGORIES } from '../lib/radixData';

function getFitRating(score) {
  if (score >= 80) return { label: 'High Fit — Prime Interview Candidate', color: '#35D49A' };
  if (score >= 65) return { label: 'Promising Fit — Close Top Gaps', color: '#45D6FF' };
  if (score >= 50) return { label: 'Moderate Fit — Preparation Needed', color: '#F4BE5E' };
  return { label: 'Early Match — Foundational Training Advised', color: '#FF6B81' };
}

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
    COD: 'Solve core implementation problems and focus on writing clean, modular, and well-tested code.',
  };
  return map[categoryCode] || `Build a targeted portfolio project demonstrating hands-on competency in ${skillName}.`;
}

export default function SkillMatchingPage() {
  const {
    activeCandidate,
    candidates,
    switchActiveCandidate,
    jobs,
    selectedJob,
    setSelectedJob,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState('all');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [matchResult, setMatchResult] = useState(null);

  const prioritiesRef = useRef(null);
  const isSubmittingRef = useRef(false);

  const currentJob = selectedJob || jobs[0];

  // Executes POST /api/match using exact Pydantic schema
  const executeMatch = useCallback(async (candidate, job) => {
    if (!candidate || !job) {
      setError('Please select both an active candidate and a target job description.');
      setMatchResult(null);
      return;
    }

    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setLoading(true);
    setError(null);
    // Clear stale results immediately so failed requests never display old data
    setMatchResult(null);

    try {
      const response = await apiClient.matchSkills(candidate, job);
      const data = response?.data;

      if (!data || typeof data.match_score === 'undefined') {
        throw new Error('Invalid response structure received from Skill Matching API.');
      }

      const totalCount = (data.matched_skills?.length || 0) + (data.missing_skills?.length || 0);

      setMatchResult({
        match_score: Number(data.match_score),
        matched_skills: Array.isArray(data.matched_skills) ? data.matched_skills : [],
        missing_skills: Array.isArray(data.missing_skills) ? data.missing_skills : [],
        jd_source_file: data.jd_source_file || null,
        totalCount,
        candidateId: candidate.id,
        candidateName: candidate.name,
        jobId: job.id,
        jobTitle: job.role,
        company: job.company,
        location: job.location,
        ctc: job.ctc,
        calculatedAt: new Date().toISOString(),
      });
      addToast(`Skill Match calculated: ${data.match_score}% match`, 'success');
    } catch (err) {
      console.error('Skill Matching API Error:', err);
      const msg = err.message || 'Failed to calculate skill match.';
      setError(msg);
      setMatchResult(null);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  }, [addToast]);

  // Initial calculation on mount or when candidate/job changes
  useEffect(() => {
    if (activeCandidate && currentJob) {
      executeMatch(activeCandidate, currentJob);
    }
  }, [activeCandidate, currentJob, executeMatch]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    executeMatch(activeCandidate, currentJob);
  };

  const handleSaveReport = async () => {
    if (!matchResult) return;
    setIsSaving(true);
    try {
      const rating = getFitRating(matchResult.match_score);
      await matchService.saveReport({
        type: 'skill_match',
        title: `Skill Match — ${matchResult.jobTitle} at ${matchResult.company}`,
        company: matchResult.company,
        jobTitle: matchResult.jobTitle,
        candidateName: matchResult.candidateName,
        candidateId: matchResult.candidateId,
        match_score: matchResult.match_score,
        matchScore: matchResult.match_score,
        matched_skills: matchResult.matched_skills,
        missing_skills: matchResult.missing_skills,
        matchedCount: matchResult.matched_skills.length,
        missingCount: matchResult.missing_skills.length,
        totalCount: matchResult.totalCount,
        jd_source_file: matchResult.jd_source_file,
        fitRating: rating.label,
        ratingColor: rating.color,
      });
      addToast('Skill match report saved to Saved Reports!', 'success');
    } catch (err) {
      addToast(`Error saving report: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleScrollToPriorities = () => {
    prioritiesRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  const ratingInfo = matchResult ? getFitRating(matchResult.match_score) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Skill Matching
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Compare candidate competencies against target job requirements using fuzzy skill matching.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handlePrint} className="btn btn-outline" disabled={loading || !matchResult}>
            <Printer size={15} />
            <span>Print Report</span>
          </button>
          <button onClick={handleScrollToPriorities} className="btn btn-secondary" disabled={loading || !matchResult}>
            <Target size={15} />
            <span>View Priorities</span>
          </button>
          <button onClick={handleSaveReport} disabled={isSaving || loading || !matchResult} className="btn btn-primary">
            <Bookmark size={15} />
            <span>{isSaving ? 'Saving...' : 'Save Report'}</span>
          </button>
        </div>
      </div>

      {/* Selectors Bar & Form Submission */}
      <form
        onSubmit={handleFormSubmit}
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr auto',
          gap: '16px',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label className="form-label">Active Candidate Profile</label>
          <select
            className="form-select"
            value={activeCandidate?.id || ''}
            onChange={(e) => switchActiveCandidate(e.target.value)}
            disabled={loading}
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — ({c.skills?.length || 0} skills)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label">Target Job Description</label>
          <select
            className="form-select"
            value={currentJob?.id || ''}
            onChange={(e) => {
              const found = jobs.find((j) => j.id === e.target.value);
              if (found) setSelectedJob(found);
            }}
            disabled={loading}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company} — {j.role} ({j.skills?.length || 0} required skills)
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="submit"
            disabled={loading || !activeCandidate || !currentJob}
            className="btn btn-primary"
            style={{ height: '42px', minWidth: '160px' }}
          >
            <RefreshCw size={15} className={loading ? 'spin-animation' : ''} />
            <span>{loading ? 'Matching...' : 'Run Skill Match'}</span>
          </button>
        </div>
      </form>

      {/* LOADING STATE */}
      {loading && (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '60px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              border: '3px solid rgba(69, 214, 255, 0.2)',
              borderTopColor: 'var(--accent-cyan)',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Analyzing Skill Alignment...
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Evaluating candidate capabilities and experience against target job requirements.
            </p>
          </div>
        </div>
      )}

      {/* ERROR STATE WITH RETRY */}
      {error && !loading && (
        <div
          style={{
            background: 'rgba(255, 107, 129, 0.08)',
            border: '1px solid rgba(255, 107, 129, 0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'rgba(255, 107, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} color="var(--error)" />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                Unable to complete skill analysis
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--error)', lineHeight: 1.5, marginBottom: '8px' }}>
                {error}
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Skill analysis is temporarily unavailable. Please verify your connection or try again shortly.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignSelf: 'flex-end' }}>
            <button
              onClick={() => executeMatch(activeCandidate, currentJob)}
              className="btn btn-primary"
            >
              <RefreshCw size={14} />
              <span>Retry Analysis</span>
            </button>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && !matchResult && (
        <Card>
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <HelpCircle size={40} color="var(--border-medium)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              No Active Match Result
            </h3>
            <p style={{ fontSize: '13px', maxWidth: '420px', margin: '0 auto 20px' }}>
              Select a candidate profile and target job description above, then click "Run Skill Match" to calculate the match score and skill gaps.
            </p>
            <button
              onClick={() => executeMatch(activeCandidate, currentJob)}
              className="btn btn-primary"
            >
              <Sparkles size={15} />
              <span>Run Match Analysis</span>
            </button>
          </div>
        </Card>
      )}

      {/* SUCCESS STATE — DISPLAY MATCH RESULTS */}
      {!loading && !error && matchResult && (
        <>
          {/* Hero Match Score Summary Card */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(21, 31, 51, 0.95) 0%, rgba(27, 38, 64, 0.9) 100%)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px 36px',
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              gap: '32px',
              alignItems: 'center',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Score Ring with Prominent Percentage */}
            <div style={{ textAlign: 'center' }}>
              <ScoreRing
                score={matchResult.match_score}
                size={160}
                strokeWidth={14}
                sublabel="/ 100 Match"
                color={ratingInfo.color}
                gradientId="match-score-grad"
              />
            </div>

            <div>
              {/* Job Metadata & Supporting Source File */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                <span className="badge badge-primary">{matchResult.company}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {matchResult.location} · {matchResult.ctc}
                </span>
                {matchResult.jd_source_file && (
                  <span
                    className="badge badge-neutral"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    title={`Source file: ${matchResult.jd_source_file}`}
                  >
                    <FileText size={12} />
                    <span>{matchResult.jd_source_file}</span>
                  </span>
                )}
              </div>

              <h2 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {matchResult.jobTitle}
              </h2>

              {/* Fit Rating Tag */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: `${ratingInfo.color}15`,
                  border: `1px solid ${ratingInfo.color}40`,
                  color: ratingInfo.color,
                  fontSize: '12px',
                  fontWeight: '700',
                  marginBottom: '12px',
                }}
              >
                <Sparkles size={13} />
                <span>{ratingInfo.label}</span>
              </div>

              {/* Linear Progress Bar Indicator */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '5px' }}>
                  <span>Match Progress</span>
                  <span style={{ fontWeight: '700', color: ratingInfo.color }}>{matchResult.match_score}%</span>
                </div>
                <div style={{ height: '7px', background: 'var(--bg-navy)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(0, matchResult.match_score))}%`,
                      background: ratingInfo.color,
                      borderRadius: '4px',
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  />
                </div>
              </div>

              {/* Counts with Green & Orange/Red Badges */}
              <div style={{ display: 'flex', gap: '20px', fontSize: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#35D49A', fontWeight: '700' }}>
                  <CheckCircle2 size={16} />
                  <span className="badge badge-success">{matchResult.matched_skills.length}</span>
                  Matched Skills
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FF6B81', fontWeight: '700' }}>
                  <AlertCircle size={16} />
                  <span className="badge badge-danger">{matchResult.missing_skills.length}</span>
                  Missing Competencies
                </span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '12px' }}>
            {[
              { id: 'all', label: `All Requirements (${matchResult.totalCount})` },
              { id: 'matched', label: `Verified Matched (${matchResult.matched_skills.length})` },
              { id: 'missing', label: `Skill Gaps (${matchResult.missing_skills.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: activeTab === tab.id ? '600' : '500',
                  padding: '10px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* 1. VERIFIED MATCHED SKILLS (GREEN BADGES) */}
          {(activeTab === 'all' || activeTab === 'matched') && matchResult.matched_skills.length > 0 && (
            <Card
              title={`Verified Matched Skills (${matchResult.matched_skills.length})`}
              icon={CheckCircle2}
              subtitle="Skills meeting or exceeding the job description threshold via fuzzy matching"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {matchResult.matched_skills.map((item, idx) => {
                  const cat = RADIX_CATEGORIES[item.category] || RADIX_CATEGORIES['OTHER'];
                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: '3px solid #35D49A',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: cat.bgColor,
                              color: cat.color,
                            }}
                          >
                            {item.category}
                          </span>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                            {item.jd_skill}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Candidate skill:</span>
                          <span style={{ fontWeight: '600', color: 'var(--accent-cyan)' }}>
                            {item.candidate_skill}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <span className="badge badge-success" style={{ fontSize: '11px' }}>
                          {item.match_confidence}% Match
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {activeTab === 'matched' && matchResult.matched_skills.length === 0 && (
            <Card title="Verified Matched Skills (0)" icon={CheckCircle2}>
              <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '13px' }}>
                  No directly matching competencies identified between {matchResult.candidateName} and {matchResult.company}'s requirements.
                </p>
              </div>
            </Card>
          )}

          {/* 2. MISSING JOB REQUIREMENTS (ORANGE/RED BADGES) */}
          {(activeTab === 'all' || activeTab === 'missing') && matchResult.missing_skills.length > 0 && (
            <Card
              title={`Missing Job Requirements (${matchResult.missing_skills.length})`}
              icon={AlertCircle}
              subtitle="Skills requested by the employer that were not identified on candidate profile"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {matchResult.missing_skills.map((item, idx) => {
                  const cat = RADIX_CATEGORIES[item.category] || RADIX_CATEGORIES['OTHER'];
                  const recommendation = getRecommendation(item.skill_name, item.category);

                  return (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--bg-surface-elevated)',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: '3px solid #FF6B81',
                        borderRadius: 'var(--radius-md)',
                        padding: '14px 18px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '10px',
                              fontWeight: '700',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              background: cat.bgColor,
                              color: cat.color,
                            }}
                          >
                            {item.category}
                          </span>
                          <span style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                            {item.skill_name}
                          </span>
                        </div>
                        <span className="badge badge-danger">
                          Missing Requirement
                        </span>
                      </div>

                      <p style={{ fontSize: '12px', color: '#F4BE5E', marginTop: '2px', lineHeight: 1.4 }}>
                        <strong>Action Step: </strong> {recommendation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {activeTab === 'missing' && matchResult.missing_skills.length === 0 && (
            <Card title="Missing Job Requirements (0)" icon={AlertCircle}>
              <div style={{ textAlign: 'center', padding: '36px 16px', color: '#35D49A' }}>
                <p style={{ fontSize: '13px', fontWeight: '600' }}>
                  Outstanding! Zero skill gaps detected — candidate meets or exceeds all required competencies!
                </p>
              </div>
            </Card>
          )}

          {/* 3. IMPROVEMENT PRIORITIES SECTION */}
          <div ref={prioritiesRef}>
            <Card
              title="Candidate Improvement Priorities"
              icon={Target}
              subtitle="Actionable preparation steps before technical interview rounds"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {matchResult.missing_skills.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#35D49A' }}>
                    <CheckCircle2 size={32} style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontWeight: '700', fontSize: '15px' }}>
                      Outstanding! No skill gaps detected.
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {matchResult.candidateName} meets all {matchResult.matched_skills.length} required competencies for this opening.
                    </div>
                  </div>
                ) : (
                  matchResult.missing_skills.map((item, idx) => {
                    const cat = RADIX_CATEGORIES[item.category] || RADIX_CATEGORIES['OTHER'];
                    const recommendation = getRecommendation(item.skill_name, item.category);

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '14px 18px',
                          background: 'var(--bg-surface-elevated)',
                          borderRadius: 'var(--radius-md)',
                          gap: '16px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent-cyan)' }}>
                              Focus #{idx + 1}
                            </span>
                            <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                              {item.skill_name} ({cat.name || item.category})
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {recommendation}
                          </div>
                        </div>

                        <span className="badge badge-warning" style={{ fontSize: '10px', flexShrink: 0 }}>
                          Priority Gap
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
