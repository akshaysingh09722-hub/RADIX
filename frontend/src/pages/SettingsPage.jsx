import { useState } from 'react';
import {
  Server,
  Database,
  RefreshCw,
  Zap,
  Sliders,
  RotateCcw,
  Code2
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { getSupabaseStatus } from '../lib/supabase';
import { profileService } from '../services/profileService';
import { jobService } from '../services/jobService';
import Card from '../components/ui/Card';

export default function SettingsPage() {
  const { isDemoMode, toggleDemoMode, isBackendOnline, addToast, refreshData } = useApp();
  const { user, isAuthenticated } = useAuth();

  const [backendUrl, setBackendUrl] = useState(import.meta.env.VITE_API_URL || 'http://localhost:8000');
  const [testingBackend, setTestingBackend] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const supabaseStatus = getSupabaseStatus();

  const handleTestConnection = async () => {
    setTestingBackend(true);
    setTestResult(null);
    try {
      const res = await apiClient.checkHealth();
      setTestResult(res);
      if (res.isOnline) {
        addToast('Backend connection verified successfully!', 'success');
      } else {
        addToast(`Backend unreachable at ${backendUrl}. Demo mode active.`, 'warning');
      }
    } catch (err) {
      setTestResult({ isOnline: false, error: err.message });
      addToast(`Connection error: ${err.message}`, 'error');
    } finally {
      setTestingBackend(false);
    }
  };

  const handleResetData = () => {
    profileService.resetDefaults();
    jobService.resetDefaults();
    refreshData();
    addToast('All profiles and job descriptions restored to reference benchmarks!', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
          Platform Settings & Integration
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Manage backend API services, persistence layer, and system preferences.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
        {/* Backend Services Connection Card */}
        <Card
          title="Backend API Services"
          subtitle="API connection for document extraction, talent insights, and skill matching"
          icon={Server}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Backend Status</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: isBackendOnline ? '#35D49A' : '#45D6FF', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isBackendOnline ? '#35D49A' : '#45D6FF' }} />
                  <span>{isBackendOnline ? 'Online (Connected)' : 'Offline / Standalone (Demo Mode Active)'}</span>
                </div>
              </div>
              <button
                onClick={handleTestConnection}
                disabled={testingBackend}
                className="btn btn-outline btn-sm"
              >
                {testingBackend ? <RefreshCw size={13} className="spin-animation" /> : <RefreshCw size={13} />}
                <span>Test Ping</span>
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Backend API URL (VITE_API_URL)</label>
              <input
                type="text"
                className="form-input"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://localhost:8000"
              />
              <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>
                Endpoints expected: <code>/api/health</code>, <code>/api/extract/jd</code>, <code>/api/extract/resume</code>, <code>/api/talent-check</code>, <code>/api/match</code>.
              </p>
            </div>

            {testResult && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '12px',
                  background: testResult.isOnline ? 'rgba(53, 212, 154, 0.1)' : 'rgba(244, 190, 94, 0.1)',
                  color: testResult.isOnline ? '#35D49A' : '#F4BE5E',
                  border: `1px solid ${testResult.isOnline ? 'rgba(53, 212, 154, 0.3)' : 'rgba(244, 190, 94, 0.3)'}`,
                }}
              >
                {testResult.isOnline
                  ? `Success: API responded on ${testResult.url}`
                  : `Note: Backend service not responding. The application will seamlessly use verified client-side algorithms.`}
              </div>
            )}
          </div>
        </Card>

        {/* Supabase Storage Card */}
        <Card
          title="Supabase Storage & Persistence"
          subtitle="Persistent cloud database for candidate profiles, jobs, and reports"
          icon={Database}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supabase Client</div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: supabaseStatus.configured ? '#35D49A' : 'var(--accent-cyan)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: supabaseStatus.configured ? '#35D49A' : 'var(--accent-cyan)' }} />
                  <span>{supabaseStatus.configured ? 'Configured & Connected' : 'Local Storage Fallback (Ready for Credentials)'}</span>
                </div>
              </div>
              <span className={`badge ${supabaseStatus.configured ? 'badge-success' : 'badge-primary'}`}>
                {supabaseStatus.configured ? 'Live Cloud' : 'Local Mode'}
              </span>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>VITE_SUPABASE_URL</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                  {supabaseStatus.url}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>VITE_SUPABASE_ANON_KEY</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: supabaseStatus.hasKey ? '#35D49A' : 'var(--text-subtle)' }}>
                  {supabaseStatus.hasKey ? 'Configured (Hidden for security)' : 'Not Set'}
                </span>
              </div>
              {isAuthenticated && user && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Authenticated User</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#35D49A' }}>
                    {user.email}
                  </span>
                </div>
              )}
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
              Supabase table: <code>candidate_profiles</code> with Row Level Security (RLS) enabled. Private storage bucket: <code>resumes/{'{user_id}'}</code>.
            </div>
          </div>
        </Card>
      </div>

      {/* Demo Controls & Data Management */}
      <Card title="Platform Demonstration & Reference Data" icon={Sliders}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>
              Reset Reference Candidates & Job Openings
            </h4>
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: '520px' }}>
              Restores all reference candidates (Ananya Rao, Karthik Subramaniam, Priya Menon, Rohan Verma) and curated job descriptions to default.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => toggleDemoMode()}
              className="btn btn-outline"
            >
              <Zap size={15} />
              <span>Environment: {isDemoMode ? 'Standalone' : 'Live Services'}</span>
            </button>
            <button
              onClick={handleResetData}
              className="btn btn-secondary"
            >
              <RotateCcw size={15} />
              <span>Reset Reference Data</span>
            </button>
          </div>
        </div>
      </Card>

      {/* 5 Integrated Modules Architecture */}
      <Card title="RADIX Platform Architecture & Core Capabilities" icon={Code2}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[
            { capability: 'JD Intelligence', name: 'Job Analytics', desc: 'Requirement extraction mapped to 12 competency categories' },
            { capability: 'Resume Parsing', name: 'Resume Analyzer', desc: 'Candidate credentials & verified skill evidence extraction' },
            { capability: 'Profile Inventory', name: 'Profile Builder', desc: 'Profile persistence, competency editing & unified storage' },
            { capability: 'Readiness Evaluation', name: 'Talent Insights', desc: '12-category target company readiness scoring' },
            { capability: 'Fuzzy Match Engine', name: 'Skill Matching', desc: 'Role match scoring, gap analysis & targeted recommendations' },
          ].map((m, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--bg-surface-elevated)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontWeight: '700' }}>
                {m.capability}
              </div>
              <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)', margin: '2px 0 4px' }}>
                {m.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {m.desc}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
