import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { AuthContext } from './AuthContextDef';

// Helper to compute 12 RADIX category levels from candidate skills
const computeCategoryLevels = (skills = []) => {
  const zeroLevels = {
    COD: 0, DSA: 0, SWE: 0, SQL: 0, COMM: 0, APTI: 0, OOD: 0, OS: 0, NETW: 0, SYSD: 0, CLOUD: 0, AI: 0
  };

  if (!Array.isArray(skills) || skills.length === 0) {
    return zeroLevels;
  }

  const sums = {};
  const counts = {};

  skills.forEach((s) => {
    const code = s.category_code;
    if (code && zeroLevels[code] !== undefined) {
      const lvl = Number(s.level || s.proficiency) || (s.confidence === 'high' ? 8 : s.confidence === 'medium' ? 6 : 4);
      sums[code] = (sums[code] || 0) + lvl;
      counts[code] = (counts[code] || 0) + 1;
    }
  });

  const result = { ...zeroLevels };
  Object.keys(sums).forEach((code) => {
    result[code] = Math.min(10, Math.max(1, Math.round(sums[code] / counts[code])));
  });

  return result;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const isConfigured = isSupabaseConfigured();

  const fetchProfile = useCallback(async (userId, authUser) => {
    if (!supabase || !userId) {
      setLoading(false);
      return null;
    }

    try {
      // 1. Check if profile already exists in public.candidate_profiles
      const { data, error } = await supabase
        .from('candidate_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Supabase query error on candidate_profiles:', error.message);
      }

      // 2. If profile already exists, load it directly (DO NOT overwrite with empty data)
      if (data) {
        const skillsArray = Array.isArray(data.skills) ? data.skills : [];
        const educationArray = Array.isArray(data.education) ? data.education : [];
        const projectsArray = Array.isArray(data.projects) ? data.projects : [];
        const certificationsArray = Array.isArray(data.certifications) ? data.certifications : [];
        const experienceArray = Array.isArray(data.experience) ? data.experience : [];

        const primaryDegree = educationArray.length > 0
          ? (typeof educationArray[0] === 'string'
              ? educationArray[0]
              : `${educationArray[0].degree || ''} ${educationArray[0].cgpa ? `(${educationArray[0].cgpa})` : ''}`.trim())
          : 'Profile Pending (Upload Resume)';

        const formatted = {
          id: data.id,
          isCustomer: true,
          name: data.full_name || authUser?.user_metadata?.full_name || authUser?.user_metadata?.name || 'Candidate',
          email: data.email || authUser?.email || '',
          avatar: data.full_name
            ? data.full_name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
            : 'CU',
          education: primaryDegree,
          educationList: educationArray,
          skills: skillsArray,
          categories: computeCategoryLevels(skillsArray),
          projects: projectsArray,
          certifications: certificationsArray,
          experience: experienceArray,
          internships: experienceArray,
          hackathons: [],
          preferredRoles: ['Software Engineer', 'Full Stack Developer'],
          fitSummary: skillsArray.length > 0
            ? `Active profile with ${skillsArray.length} verified competencies.`
            : 'Fresh profile. Upload your resume or add competencies to begin evaluation.',
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        };

        setProfile(formatted);
        return formatted;
      }

      // 3. Profile does not exist yet (first-time login or fresh signup)
      // Safely initialize a profile row using the user's authenticated UUID as id
      const defaultName = authUser?.user_metadata?.full_name ||
        authUser?.user_metadata?.name ||
        authUser?.email?.split('@')[0] ||
        'Candidate';

      const initialRow = {
        id: userId,
        full_name: defaultName,
        email: authUser?.email || '',
        education: [],
        skills: [],
        projects: [],
        certifications: [],
        experience: [],
        updated_at: new Date().toISOString(),
      };

      const { data: inserted, error: insertError } = await supabase
        .from('candidate_profiles')
        .upsert([initialRow], { onConflict: 'id' })
        .select()
        .single();

      if (!insertError && inserted) {
        const skillsArray = Array.isArray(inserted.skills) ? inserted.skills : [];
        const formatted = {
          id: inserted.id,
          isCustomer: true,
          name: inserted.full_name,
          email: inserted.email,
          avatar: inserted.full_name.substring(0, 2).toUpperCase(),
          education: 'Profile Pending (Upload Resume)',
          educationList: inserted.education || [],
          skills: skillsArray,
          categories: computeCategoryLevels(skillsArray),
          projects: inserted.projects || [],
          certifications: inserted.certifications || [],
          experience: inserted.experience || [],
          internships: inserted.experience || [],
          hackathons: [],
          preferredRoles: ['Software Engineer', 'Full Stack Developer'],
          fitSummary: skillsArray.length > 0
            ? `Active profile with ${skillsArray.length} verified competencies.`
            : 'Fresh profile. Upload your resume or add competencies to begin evaluation.',
          createdAt: inserted.created_at,
          updatedAt: inserted.updated_at,
        };
        setProfile(formatted);
        return formatted;
      }
    } catch (err) {
      console.error('Error during candidate_profiles fetch/create:', err);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!isConfigured || !supabase) {
      setLoading(false);
      return;
    }

    // 1. Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!mounted) return;
      if (error) {
        console.warn('Error retrieving session:', error.message);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id, initialSession.user);
      } else {
        setLoading(false);
      }
    });

    // 2. Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          if (currentSession?.user) {
            await fetchProfile(currentSession.user.id, currentSession.user);
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [isConfigured, fetchProfile]);

  // Auth Operations
  const signUp = async ({ email, password, fullName }) => {
    if (!isConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your frontend/.env file.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          name: fullName,
        },
      },
    });

    if (error) throw error;

    // If session established immediately (email confirmation disabled in Supabase)
    if (data.session && data.user) {
      setSession(data.session);
      setUser(data.user);
      await fetchProfile(data.user.id, data.user);
    }

    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation: !data.session,
    };
  };

  const signIn = async ({ email, password }) => {
    if (!isConfigured || !supabase) {
      throw new Error('Supabase is not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your frontend/.env file.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    setSession(data.session);
    setUser(data.user);
    if (data.user) {
      await fetchProfile(data.user.id, data.user);
    }

    return data;
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const resetPassword = async (email) => {
    if (!isConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
    return true;
  };

  const updatePassword = async (newPassword) => {
    if (!isConfigured || !supabase) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
    return true;
  };

  // Strictly saves ONLY the columns that exist in public.candidate_profiles
  const saveProfileToSupabase = async (updatedFields) => {
    if (!isConfigured || !supabase || !user) {
      throw new Error('User is not authenticated with Supabase');
    }

    setProfileSaving(true);
    try {
      // Build education JSONB
      let educationData = [];
      if (Array.isArray(updatedFields.educationList) && updatedFields.educationList.length > 0) {
        educationData = updatedFields.educationList;
      } else if (Array.isArray(updatedFields.education)) {
        educationData = updatedFields.education;
      } else if (updatedFields.education) {
        educationData = [{ degree: updatedFields.education, institution: 'University', year: '2024' }];
      } else if (profile?.educationList) {
        educationData = profile.educationList;
      }

      // Build experience JSONB (internships and work history)
      let experienceData = [];
      if (Array.isArray(updatedFields.experience) && updatedFields.experience.length > 0) {
        experienceData = updatedFields.experience;
      } else if (Array.isArray(updatedFields.internships) && updatedFields.internships.length > 0) {
        experienceData = updatedFields.internships;
      } else if (profile?.experience) {
        experienceData = profile.experience;
      }

      // Exact 8 writable columns of public.candidate_profiles
      const payload = {
        id: user.id,
        full_name: updatedFields.name || updatedFields.full_name || profile?.name || 'Candidate',
        email: user.email,
        education: educationData,
        skills: Array.isArray(updatedFields.skills) ? updatedFields.skills : (profile?.skills || []),
        projects: Array.isArray(updatedFields.projects) ? updatedFields.projects : (profile?.projects || []),
        certifications: Array.isArray(updatedFields.certifications) ? updatedFields.certifications : (profile?.certifications || []),
        experience: experienceData,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('candidate_profiles')
        .upsert([payload], { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Supabase profile save error:', error);
        throw error;
      }

      await fetchProfile(user.id, user);
      return data;
    } finally {
      setProfileSaving(false);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    profileSaving,
    isConfigured,
    isAuthenticated: Boolean(user && session),
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    saveProfileToSupabase,
    refreshProfile: () => user && fetchProfile(user.id, user),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
