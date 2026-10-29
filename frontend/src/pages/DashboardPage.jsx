import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertTriangle,
  Briefcase,
  FileSearch,
  UserCheck,
  ChevronRight,
  Target
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { talentCheckService } from '../services/talentCheckService';
import { matchService } from '../services/matchService';
import Card from '../components/ui/Card';
import RadarChart from '../components/ui/RadarChart';
import CategoryBar from '../components/ui/CategoryBar';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { activeCandidate, switchActiveCandidate, candidates, jobs, setSelectedJob } = useApp();
  const [chartView, setChartView] = useState('radar');

  if (!activeCandidate) {
    return (
      <div style={{ padding: '60px', textAlign: 'center' }}>
        <p>Loading candidate profile intelligence...</p>
      </div>
    );
  }

  const [matchResult, setMatchResult] = useState(null);
  const talentCheckResult = talentCheckService.calculateReadiness(activeCandidate, 'Google LLC');
  const targetJob = jobs[0] || null;

  useEffect(() => {
    let cancelled = false;
    async function loadMatch() {
      if (activeCandidate && targetJob) {
        try {
          const res = await matchService.calculateMatch(activeCandidate, targetJob);
          if (!cancelled && res) {
            setMatchResult(res);
          }
        } catch (e) {
          console.warn('Dashboard match calculation error:', e);
        }
      }
    }
    loadMatch();
    return () => { cancelled = true; };
  }, [activeCandidate, targetJob]);

  const [savedReportsCount, setSavedReportsCount] = useState(0);

  useEffect(() => {
    async function loadReportsCount() {
      try {
        const reports = await matchService.getReports();
        setSavedReportsCount(reports?.length || 0);
      } catch (e) {
        setSavedReportsCount(0);
      }
    }
    loadReportsCount();
  }, []);

  const hasSkills = (activeCandidate.skills?.length || 0) > 0;
  const hasPendingEdu = !activeCandidate.education || activeCandidate.education.includes('Pending');

  let completionPoints = 0;
  if (activeCandidate.name && activeCandidate.email) completionPoints += 20;
  if (!hasPendingEdu) completionPoints += 20;
  if (activeCandidate.skills?.length > 4) completionPoints += 30;
  else if (hasSkills) completionPoints += 15;
  if (activeCandidate.projects?.length > 0) completionPoints += 15;
  if (activeCandidate.internships?.length > 0 || activeCandidate.hackathons?.length > 0) completionPoints += 15;
  const profileCompletion = Math.min(100, completionPoints);

  const identifiedSkillsCount = activeCandidate.skills?.length || 0;
  const topGaps = talentCheckResult?.skillGaps?.slice(0, 3) || [];
  const topStrengths = talentCheckResult?.meetingSkills?.slice(0, 4) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Hero Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(21, 31, 51, 0.95) 0%, rgba(16, 24, 43, 0.9) 100%)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          padding: '32px 36px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '240px',
            height: '240px',
            background: 'radial-gradient(circle, rgba(69, 214, 255, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-40px',
            right: '25%',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(139, 124, 255, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', position: 'relative', zIndex: 2 }}>
          <div style={{ maxWidth: '680px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '4px 12px', borderRadius: 'var(--radius-full)', background: 'rgba(69, 214, 255, 0.1)', border: '1px solid rgba(69, 214, 255, 0.25)', color: 'var(--accent-cyan)', fontSize: '12px', fontWeight: '600', marginBottom: '14px' }}>
              <Sparkles size={14} />
              <span>RADIX SkillSync · AI Career Intelligence</span>
            </div>
            <h1 style={{ fontSize: '32px', fontWeight: '800', letterSpacing: '-0.03em', marginBottom: '10px', color: '#FFFFFF' }}>
              Your career, decoded.
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '22px' }}>
              Discover your strengths, close your skill gaps, and get ready for your next opportunity with the 12-competency hiring framework.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
              <button
                onClick={() => navigate('/jd-analytics')}
                className="btn btn-primary btn-lg"
              >
                <FileSearch size={18} />
                <span>Analyze a Job</span>
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="btn btn-secondary btn-lg"
              >
                <UserCheck size={18} />
                <span>Complete Your Profile</span>
              </button>
              <button
                onClick={() => navigate('/talent-insights')}
                className="btn btn-outline"
                style={{ padding: '12px 18px' }}
              >
                <Target size={16} />
                <span>View Talent Insights</span>
              </button>
            </div>
          </div>

          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              minWidth: '240px',
            }}
          >
            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-subtle)', fontWeight: '600', marginBottom: '8px', letterSpacing: '0.04em' }}>
              Current Profile
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #45D6FF 0%, #8B7CFF 100%)',
                  color: '#0B1020',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '14px',
                }}
              >
                {activeCandidate.avatar || 'CD'}
              </div>
              <div>
                <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-primary)' }}>
                  {activeCandidate.name}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {activeCandidate.preferredRoles?.[0] || 'Software Engineer'}
                </div>
              </div>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              {activeCandidate.fitSummary}
            </div>
          </div>
        </div>
      </div>

      {/* 5 Key Metric Cards */}
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Profile Completion</span>
            <UserCheck size={16} color="var(--accent-cyan)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>{profileCompletion}%</span>
            <span style={{ fontSize: '11px', color: '#35D49A', fontWeight: '600' }}>Ready</span>
          </div>
          <div style={{ marginTop: '10px', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${profileCompletion}%`, height: '100%', background: 'linear-gradient(90deg, #45D6FF, #8B7CFF)' }} />
          </div>
        </Card>

        <Card interactive onClick={() => navigate('/skill-matching')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Latest Job Match</span>
            <Briefcase size={16} color="var(--accent-violet)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: hasSkills ? (matchResult?.ratingColor || '#45D6FF') : 'var(--text-muted)' }}>
              {hasSkills ? `${matchResult?.matchScore ?? 0}%` : '--'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {hasSkills ? `vs ${targetJob?.companyShort || 'Target'}` : 'Pending Match'}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hasSkills ? (targetJob?.role || 'Software Engineer') : 'Upload resume to evaluate'}
          </p>
        </Card>

        <Card interactive onClick={() => navigate('/talent-insights')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Company Readiness</span>
            <Award size={16} color="var(--success)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: hasSkills ? '#35D49A' : 'var(--text-muted)' }}>
              {hasSkills ? `${talentCheckResult?.readinessScore ?? 0}/100` : '--'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {hasSkills ? 'Google Bar' : 'Pending Skills'}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            {hasSkills ? `${talentCheckResult?.categoriesMeeting ?? 0} of 12 categories met` : '0 of 12 standards met'}
          </p>
        </Card>

        <Card interactive onClick={() => navigate('/profile')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Skills Identified</span>
            <TrendingUp size={16} color="var(--warning)" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>
              {identifiedSkillsCount}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>Competencies</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            Across 12 RADIX standards
          </p>
        </Card>

        <Card interactive onClick={() => navigate('/saved-reports')}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Saved Matches</span>
            <Target size={16} color="#45D6FF" />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
            <span style={{ fontSize: '28px', fontWeight: '800', color: 'var(--text-primary)' }}>{savedReportsCount}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Available</span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
            View report history
          </p>
        </Card>
      </div>

      {/* Main Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
        <Card
          title="Skill Proficiency across 12 RADIX Categories"
          subtitle="Real-time multi-dimensional evaluation based on candidate profile"
          actions={
            <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', padding: '2px' }}>
              <button
                onClick={() => setChartView('radar')}
                className={`btn-ghost ${chartView === 'radar' ? 'btn-primary' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
              >
                Radar Chart
              </button>
              <button
                onClick={() => setChartView('bars')}
                className={`btn-ghost ${chartView === 'bars' ? 'btn-primary' : ''}`}
                style={{ padding: '4px 10px', fontSize: '11px', borderRadius: '4px' }}
              >
                Horizontal Bars
              </button>
            </div>
          }
        >
          {!hasSkills ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(69, 214, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={26} color="var(--accent-cyan)" />
              </div>
              <h4 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>
                No Competency Data Identified Yet
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.6 }}>
                Upload your resume in Resume Analyzer or add skills to activate your 12-competency RADIX radar profile and benchmark readiness comparisons.
              </p>
              <button onClick={() => navigate('/resume-analyzer')} className="btn btn-primary" style={{ marginTop: '8px' }}>
                <FileSearch size={16} />
                <span>Launch Resume Analyzer</span>
              </button>
            </div>
          ) : chartView === 'radar' ? (
            <div style={{ padding: '10px 0', textAlign: 'center' }}>
              <RadarChart
                candidateScores={activeCandidate.categoryScores}
                benchmarkScores={{
                  COD: 9, DSA: 9, OOD: 8, APTI: 8, COMM: 8, AI: 8,
                  CLOUD: 8, SQL: 7, SWE: 8, SYSD: 8, NETW: 7, OS: 7
                }}
                size={340}
              />
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '12px', fontSize: '11px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#45D6FF' }}>
                  <span style={{ width: '10px', height: '10px', background: '#45D6FF', borderRadius: '2px' }} />
                  {activeCandidate.name} (Verified)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8B7CFF' }}>
                  <span style={{ width: '10px', height: '2px', borderTop: '2px dashed #8B7CFF' }} />
                  Google SWE Benchmark
                </span>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '380px', overflowY: 'auto', paddingRight: '8px' }}>
              {Object.keys(activeCandidate.categoryScores || {}).map((code) => {
                if (code === 'OTHER') return null;
                const candLvl = activeCandidate.categoryScores[code] || 0;
                return (
                  <CategoryBar
                    key={code}
                    categoryCode={code}
                    candidateLevel={candLvl}
                    requiredLevel={8}
                    compact
                  />
                );
              })}
            </div>
          )}
        </Card>

        {/* Right Persona Switcher */}
        <Card
          title="Sample Candidates Comparison"
          subtitle="Compare candidate readiness and skill match profiles"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {candidates.map((cand) => {
              const isSelected = cand.id === activeCandidate.id;
              return (
                <div
                  key={cand.id}
                  onClick={() => switchActiveCandidate(cand.id)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        background: isSelected ? 'linear-gradient(135deg, #45D6FF, #8B7CFF)' : 'rgba(255, 255, 255, 0.08)',
                        color: isSelected ? '#0B1020' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '11px',
                      }}
                    >
                      {cand.avatar || 'CD'}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {cand.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                        {cand.headline?.split('·')[0]}
                      </div>
                    </div>
                  </div>
                  {isSelected ? (
                    <span className="badge badge-primary">Active</span>
                  ) : (
                    <ChevronRight size={15} color="var(--text-subtle)" />
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '18px', padding: '12px 14px', background: 'rgba(69, 214, 255, 0.05)', border: '1px dashed rgba(69, 214, 255, 0.25)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: '600', color: 'var(--accent-cyan)' }}>Platform Insight: </span>
            Switching candidates dynamically recalculates all matching algorithms, radar comparisons, and company gap priorities.
          </div>
        </Card>
      </div>

      {/* Strengths & Priority Gaps */}
      <div className="grid-2">
        <Card
          title="Top Verified Strengths"
          subtitle="Areas where candidate meets or exceeds tier-1 standards"
          icon={CheckCircle2}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topStrengths.map((item) => (
              <div
                key={item.category_code}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '3px solid #35D49A',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                    {item.category_name} ({item.category_code})
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {item.description}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#35D49A', fontFamily: 'var(--font-mono)' }}>
                    Lvl {item.candidate_level}/10
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Top Skill Gaps to Close"
          subtitle="Prioritized recommendations based on company bar weights"
          icon={AlertTriangle}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {topGaps.length === 0 ? (
              <p style={{ fontSize: '12px', color: '#35D49A', padding: '12px 0' }}>
                All evaluated categories meet or exceed the selected benchmark bar!
              </p>
            ) : (
              topGaps.map((item) => (
                <div
                  key={item.category_code}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    background: 'var(--bg-surface-elevated)',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid #F4BE5E',
                  }}
                >
                  <div style={{ maxWidth: '75%' }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{item.category_name}</span>
                      <span className="badge badge-warning" style={{ fontSize: '9px', padding: '1px 5px' }}>
                        Gap -{item.required_level - item.candidate_level}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Required Lvl {item.required_level} · Candidate Lvl {item.candidate_level}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/talent-check')}
                    className="btn btn-outline btn-sm"
                  >
                    View Plan
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Recent Job Match Opportunities */}
      <Card
        title="Featured Job Opportunities"
        subtitle="Explore how candidate competencies align with enterprise job specifications"
        actions={
          <button
            onClick={() => navigate('/job-explorer')}
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--accent-cyan)' }}
          >
            <span>View All 6 Jobs</span>
            <ArrowRight size={14} />
          </button>
        }
      >
        <div className="grid-3">
          {jobs.slice(0, 3).map((job) => {
            const match = matchService.calculateMatch(activeCandidate, job);
            return (
              <div
                key={job.id}
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span className="badge badge-primary">{job.companyShort || job.company}</span>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: match?.ratingColor || '#45D6FF', fontFamily: 'var(--font-mono)' }}>
                      {match?.matchScore}% Match
                    </span>
                  </div>
                  <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {job.role}
                  </h4>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    {job.location} · {job.ctc}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      navigate('/skill-matching');
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                  >
                    View Match Report
                  </button>
                  <button
                    onClick={() => {
                      setSelectedJob(job);
                      navigate('/jd-analytics');
                    }}
                    className="btn btn-secondary btn-sm"
                  >
                    JD Analytics
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
