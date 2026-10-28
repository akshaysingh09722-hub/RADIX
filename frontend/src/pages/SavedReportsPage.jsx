import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bookmark,
  Calendar,
  User,
  Trash2,
  ExternalLink,
  Printer
} from 'lucide-react';
import { matchService } from '../services/matchService';
import { useApp } from '../hooks/useApp';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

export default function SavedReportsPage() {
  const navigate = useNavigate();
  const { addToast } = useApp();
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [activeReport, setActiveReport] = useState(null);

  const loadReports = async () => {
    try {
      const data = await matchService.getSavedReports();
      setReports(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadReports();
    const handleUpdate = () => loadReports();
    window.addEventListener('radix_reports_updated', handleUpdate);
    return () => window.removeEventListener('radix_reports_updated', handleUpdate);
  }, []);

  const handleDelete = (id, e) => {
    e.stopPropagation();
    matchService.deleteReport(id);
    addToast('Report deleted', 'info');
    loadReports();
  };

  const filteredReports = reports.filter((r) => {
    if (filterType === 'ALL') return true;
    return r.type === filterType;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Saved Career Intelligence Reports
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Review past job match calculations, company readiness evaluations, and improvement plans.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ALL', label: 'All Reports' },
            { id: 'skill_match', label: 'Job Matches' },
            { id: 'talent_check', label: 'Talent Insights' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              style={{
                background: filterType === f.id ? 'var(--bg-surface-elevated)' : 'transparent',
                border: filterType === f.id ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                color: filterType === f.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: filterType === f.id ? '600' : '500',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Grid */}
      {filteredReports.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
            <Bookmark size={36} color="var(--border-medium)" style={{ margin: '0 auto 12px' }} />
            <h4 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '6px' }}>
              No Saved Reports Found
            </h4>
            <p style={{ fontSize: '13px', maxWidth: '380px', margin: '0 auto 18px' }}>
              Run a Skill Match or Talent Insights evaluation and click "Save Report" to persist evaluations for future review.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => navigate('/skill-matching')} className="btn btn-primary btn-sm">
                Go to Skill Matching
              </button>
              <button onClick={() => navigate('/talent-insights')} className="btn btn-secondary btn-sm">
                Go to Talent Insights
              </button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid-2">
          {filteredReports.map((report) => {
            const isMatch = report.type === 'skill_match';
            const score = isMatch ? report.matchScore : report.readinessScore;
            const scoreColor = score >= 80 ? '#35D49A' : score >= 65 ? '#45D6FF' : '#F4BE5E';
            const dateStr = report.savedAt ? new Date(report.savedAt).toLocaleDateString() : 'Recent';

            return (
              <div
                key={report.id}
                onClick={() => setActiveReport(report)}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(69, 214, 255, 0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`badge ${isMatch ? 'badge-primary' : 'badge-violet'}`}>
                        {isMatch ? 'Job Match' : 'Talent Insights'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                        {report.company}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px', fontWeight: '800', color: scoreColor, fontFamily: 'var(--font-mono)' }}>
                        {score}%
                      </span>
                      <button
                        onClick={(e) => handleDelete(report.id, e)}
                        className="btn-ghost"
                        style={{ padding: '4px', color: '#FF6B81' }}
                        title="Delete report"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    {report.title || `${report.jobTitle} at ${report.company}`}
                  </h3>

                  <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <User size={13} />
                      {report.candidateName}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      {dateStr}
                    </span>
                  </div>

                  <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {report.summary}
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', marginTop: '14px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                    Click to view full report
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                    <span>Open Details</span>
                    <ExternalLink size={13} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Report Details Modal */}
      {activeReport && (
        <Modal
          isOpen={Boolean(activeReport)}
          onClose={() => setActiveReport(null)}
          title={activeReport.title}
          subtitle={`Evaluated for ${activeReport.candidateName}`}
          maxWidth={680}
          footer={
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => window.print()} className="btn btn-secondary btn-sm">
                <Printer size={14} />
                <span>Print</span>
              </button>
              <button onClick={() => setActiveReport(null)} className="btn btn-primary btn-sm">
                Close
              </button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Overall Evaluation Score</div>
                <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                  {activeReport.type === 'skill_match' ? activeReport.matchScore : activeReport.readinessScore}%
                </div>
              </div>
              <div>
                <span className="badge badge-primary">{activeReport.company}</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '14px', color: 'var(--text-primary)', marginBottom: '6px' }}>Executive Summary</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {activeReport.summary}
              </p>
            </div>

            {activeReport.matchedSkills && (
              <div>
                <h4 style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Verified Matched Skills ({activeReport.matchedSkills.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeReport.matchedSkills.map((s, idx) => (
                    <span key={idx} className="badge badge-success" style={{ fontSize: '11px', padding: '4px 8px' }}>
                      {s.skill_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {activeReport.missingSkills && (
              <div>
                <h4 style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  Identified Skill Gaps ({activeReport.missingSkills.length})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {activeReport.missingSkills.map((s, idx) => (
                    <span key={idx} className="badge badge-warning" style={{ fontSize: '11px', padding: '4px 8px' }}>
                      {s.skill_name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
