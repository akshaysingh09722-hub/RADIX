import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  Building,
  DollarSign,
  Sparkles,
  FileSearch
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { matchService } from '../services/matchService';

export default function JobExplorerPage() {
  const navigate = useNavigate();
  const { jobs, setSelectedJob, activeCandidate } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('ALL');

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.skills?.some((s) => s.skill_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCompany =
      companyFilter === 'ALL' ||
      job.company.toLowerCase().includes(companyFilter.toLowerCase());

    return matchesSearch && matchesCompany;
  });

  const handleSelectJobForMatch = (job) => {
    setSelectedJob(job);
    navigate('/skill-matching');
  };

  const handleSelectJobForAnalytics = (job) => {
    setSelectedJob(job);
    navigate('/jd-analytics');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Job Explorer
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Curated reference dataset · 6 target job descriptions across Google, Microsoft, and Oracle FSS
          </p>
        </div>

        <button
          onClick={() => navigate('/jd-analytics')}
          className="btn btn-primary"
        >
          <FileSearch size={16} />
          <span>Analyze Custom JD</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            className="form-input"
            placeholder="Search by job title, company, or technical skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Company Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'ALL', label: 'All Companies' },
            { id: 'Google', label: 'Google LLC' },
            { id: 'Microsoft', label: 'Microsoft' },
            { id: 'Oracle', label: 'Oracle FSS' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCompanyFilter(c.id)}
              style={{
                background: companyFilter === c.id ? 'var(--bg-surface-elevated)' : 'transparent',
                border: companyFilter === c.id ? '1px solid var(--border-accent)' : '1px solid var(--border-subtle)',
                color: companyFilter === c.id ? 'var(--accent-cyan)' : 'var(--text-muted)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: companyFilter === c.id ? '600' : '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="grid-2">
        {filteredJobs.map((job) => {
          const match = activeCandidate ? matchService.calculateMatch(activeCandidate, job) : null;

          return (
            <div
              key={job.id}
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(69, 214, 255, 0.3)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-primary">{job.companyShort || job.company}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                      {job.roleCategory}
                    </span>
                  </div>

                  {match && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Match:</span>
                      <span
                        style={{
                          fontSize: '15px',
                          fontWeight: '800',
                          color: match.ratingColor,
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        {match.matchScore}%
                      </span>
                    </div>
                  )}
                </div>

                <h3 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                  {job.role}
                </h3>

                <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Building size={14} color="var(--accent-cyan)" />
                    {job.company}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={14} color="#8B7CFF" />
                    {job.location}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <DollarSign size={14} color="#35D49A" />
                    {job.ctc}
                  </span>
                </div>

                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '16px' }}>
                  {job.overview}
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-subtle)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Required Competencies ({job.skills?.length || 0})
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {job.skills?.slice(0, 5).map((skill, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          background: 'var(--bg-surface-elevated)',
                          border: '1px solid var(--border-subtle)',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {skill.skill_name}
                      </span>
                    ))}
                    {job.skills?.length > 5 && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                        +{job.skills.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <button
                  onClick={() => handleSelectJobForMatch(job)}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  <Sparkles size={15} />
                  <span>View Match ({match ? `${match.matchScore}%` : 'Calculate'})</span>
                </button>
                <button
                  onClick={() => handleSelectJobForAnalytics(job)}
                  className="btn btn-secondary"
                >
                  <FileSearch size={15} />
                  <span>JD Analytics</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
