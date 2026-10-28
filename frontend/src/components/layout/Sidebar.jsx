import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  FileText,
  Briefcase,
  FileSearch,
  CheckCircle,
  GitCompare,
  Bookmark,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  X
} from 'lucide-react';
import { useApp } from '../../hooks/useApp';
import { useAuth } from '../../hooks/useAuth';

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const navigate = useNavigate();
  const { activeCandidate, isDemoMode, addToast } = useApp();
  const { isAuthenticated, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      addToast('Signed out of RADIX SkillSync', 'info');
      navigate('/login', { replace: true });
    } catch (err) {
      addToast(`Error signing out: ${err.message}`, 'error');
    }
  };

  const navItems = [
    { name: 'Overview', path: '/', icon: LayoutDashboard },
    { name: 'My Profile', path: '/profile', icon: User },
    { name: 'Resume Analyzer', path: '/resume-analyzer', icon: FileText },
    { name: 'Job Explorer', path: '/job-explorer', icon: Briefcase },
    { name: 'JD Analytics', path: '/jd-analytics', icon: FileSearch },
    { name: 'Talent Insights', path: '/talent-insights', icon: CheckCircle },
    { name: 'Skill Matching', path: '/skill-matching', icon: GitCompare },
    { name: 'Saved Reports', path: '/saved-reports', icon: Bookmark },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand Header */}
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #45D6FF 0%, #8B7CFF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(69, 214, 255, 0.4)',
              flexShrink: 0,
            }}
          >
            <Zap size={18} color="#0B1020" style={{ fill: '#0B1020' }} />
          </div>
          {!collapsed && (
            <div style={{ whiteSpace: 'nowrap' }}>
              <div
                style={{
                  fontWeight: '800',
                  fontSize: '15px',
                  letterSpacing: '-0.02em',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                RADIX <span style={{ color: 'var(--accent-cyan)' }}>SkillSync</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-subtle)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Career Intelligence
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Mobile close button */}
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen && setMobileOpen(false)}
              className="btn-ghost"
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                color: 'var(--text-muted)',
              }}
              title="Close sidebar"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn-ghost"
            style={{
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* Navigation List */}
      <div className="sidebar-nav-container">
        {!collapsed && (
          <div className="sidebar-nav-header">
            Navigation
          </div>
        )}
        <nav className="sidebar-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.name : undefined}
              >
                <span className="sidebar-icon-box">
                  <Icon size={18} />
                </span>
                {!collapsed && (
                  <span className="sidebar-label">{item.name}</span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Candidate Mini Profile Card */}
      {!collapsed && activeCandidate && (
        <div
          style={{
            padding: '12px 14px',
            margin: '8px 14px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-sm)',
                background: activeCandidate.isCustomer
                  ? 'linear-gradient(135deg, #1C2844 0%, #203A43 100%)'
                  : 'linear-gradient(135deg, #1C2844 0%, #283960 100%)',
                color: activeCandidate.isCustomer ? '#35D49A' : 'var(--accent-cyan)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: '12px',
                border: activeCandidate.isCustomer ? '1px solid rgba(53, 212, 154, 0.3)' : '1px solid var(--border-accent)',
                flexShrink: 0,
              }}
            >
              {activeCandidate.avatar || 'CA'}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '12.5px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeCandidate.name}
              </div>
              <div style={{ fontSize: '10.5px', color: 'var(--text-subtle)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {activeCandidate.isCustomer ? 'Active Profile' : (activeCandidate.preferredRoles?.[0] || 'Sample Candidate')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Action (if authenticated) */}
      {isAuthenticated && (
        <div style={{ padding: collapsed ? '4px 10px 8px' : '4px 14px 8px' }}>
          <button
            onClick={handleSignOut}
            className="sidebar-item"
            style={{
              width: '100%',
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px solid transparent',
            }}
            title={collapsed ? 'Sign Out' : undefined}
          >
            <span className="sidebar-icon-box">
              <LogOut size={16} color="var(--error)" />
            </span>
            {!collapsed && (
              <span className="sidebar-label" style={{ color: 'var(--error)' }}>
                Sign Out
              </span>
            )}
          </button>
        </div>
      )}

      {/* Mode Status Footer */}
      <div
        style={{
          padding: '12px 18px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}
      >
        {!collapsed ? (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: isDemoMode ? 'var(--accent-cyan)' : 'var(--success)',
                  boxShadow: `0 0 6px ${isDemoMode ? 'var(--accent-cyan)' : 'var(--success)'}`,
                }}
              />
              {isDemoMode ? 'Standalone' : 'Cloud Sync'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-subtle)', letterSpacing: '0.02em' }}>v1.0 Enterprise</span>
          </>
        ) : (
          <span
            title={isDemoMode ? 'Platform: Standalone' : 'Platform: Cloud Synchronized'}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: isDemoMode ? 'var(--accent-cyan)' : 'var(--success)',
            }}
          />
        )}
      </div>
    </aside>
  );
}
