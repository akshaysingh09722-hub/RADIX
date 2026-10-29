import { useState, useEffect, useCallback } from 'react';
import { profileService } from '../services/profileService';
import { jobService } from '../services/jobService';
import { apiClient } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { AppContext } from './AppContextDef';

export function AppProvider({ children }) {
  const { user, profile: customerProfile, isAuthenticated } = useAuth();

  const [candidates, setCandidates] = useState([]);
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState('Google LLC');
  const [isBackendOnline, setIsBackendOnline] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const health = await apiClient.checkHealth();
      setIsBackendOnline(health.isOnline);
      setIsDemoMode(!health.isOnline);

      const loadedCandidates = await profileService.getProfiles(customerProfile);
      const loadedJobs = await jobService.getJobs();

      // If user is authenticated, default to customer profile
      let current = null;
      if (isAuthenticated && customerProfile) {
        current = customerProfile;
      } else {
        const activeId = profileService.getActiveProfileId();
        current = loadedCandidates.find((c) => c.id === activeId) || loadedCandidates[0];
      }

      setCandidates(loadedCandidates);
      setActiveCandidate(current);
      setJobs(loadedJobs);
      setSelectedJob(loadedJobs[0]);
    } catch (err) {
      console.error('Error loading initial state:', err);
      addToast('Error loading application data', 'error');
    } finally {
      setLoading(false);
    }
  }, [customerProfile, isAuthenticated, addToast]);

  // Sync customer profile when authentication state changes
  useEffect(() => {
    if (isAuthenticated && customerProfile) {
      setActiveCandidate(customerProfile);
      setCandidates((prev) => {
        const filtered = prev.filter((p) => p.id !== customerProfile.id);
        return [customerProfile, ...filtered];
      });
    }
  }, [isAuthenticated, customerProfile]);

  useEffect(() => {
    loadData();

    const handleProfileChanged = async (e) => {
      const activeId = e.detail?.id || profileService.getActiveProfileId();
      const loadedCandidates = await profileService.getProfiles(customerProfile);
      setCandidates(loadedCandidates);
      const current = loadedCandidates.find((c) => c.id === activeId) || loadedCandidates[0];
      setActiveCandidate(current);
    };

    const handleProfilesUpdated = async () => {
      const loadedCandidates = await profileService.getProfiles(customerProfile);
      setCandidates(loadedCandidates);
      const activeId = profileService.getActiveProfileId();
      const current = loadedCandidates.find((c) => c.id === activeId) || loadedCandidates[0];
      setActiveCandidate(current);
    };

    const handleJobsUpdated = async () => {
      const loadedJobs = await jobService.getJobs();
      setJobs(loadedJobs);
    };

    window.addEventListener('radix_profile_changed', handleProfileChanged);
    window.addEventListener('radix_profiles_updated', handleProfilesUpdated);
    window.addEventListener('radix_jobs_updated', handleJobsUpdated);

    return () => {
      window.removeEventListener('radix_profile_changed', handleProfileChanged);
      window.removeEventListener('radix_profiles_updated', handleProfilesUpdated);
      window.removeEventListener('radix_jobs_updated', handleJobsUpdated);
    };
  }, [loadData, customerProfile]);

  const switchActiveCandidate = useCallback((candidateId) => {
    profileService.setActiveProfileId(candidateId);
    const found = candidates.find((c) => c.id === candidateId);
    if (found) {
      setActiveCandidate(found);
      addToast(`Active candidate switched to ${found.name}`, 'info');
    }
  }, [candidates, addToast]);

  const toggleDemoMode = useCallback((val) => {
    setIsDemoMode(val !== undefined ? val : (prev) => !prev);
  }, []);

  const addCustomJob = useCallback((newJob) => {
    if (!newJob) return;
    setJobs((prev) => {
      const filtered = prev.filter((j) => j.id !== newJob.id);
      return [newJob, ...filtered];
    });
    setSelectedJob(newJob);
  }, []);

  const value = {
    candidates,
    activeCandidate,
    setActiveCandidate,
    switchActiveCandidate,
    jobs,
    selectedJob,
    setSelectedJob,
    addCustomJob,
    selectedCompany,
    setSelectedCompany,
    isBackendOnline,
    isDemoMode,
    toggleDemoMode,
    loading,
    toasts,
    addToast,
    removeToast,
    refreshData: loadData,
    user,
    customerProfile,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
