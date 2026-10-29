import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SAMPLE_CANDIDATES } from '../lib/radixData';

const LOCAL_STORAGE_KEY = 'radix_candidate_profiles_v1';
const ACTIVE_PROFILE_KEY = 'radix_active_profile_id_v1';

// Read cached profiles from local storage fallback
const getLocalProfiles = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse local candidate profiles:', e);
  }
  return SAMPLE_CANDIDATES;
};

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

export const profileService = {
  // Returns candidate list combining logged-in customer profile (from Supabase) + benchmark personas
  async getProfiles(customerProfile = null) {
    let baseProfiles = getLocalProfiles();

    // If Supabase is configured and an active session exists, query candidate_profiles
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data, error } = await supabase
            .from('candidate_profiles')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();

          if (!error && data) {
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

            const customerObj = {
              id: data.id,
              isCustomer: true,
              name: data.full_name || session.user.email?.split('@')[0] || 'Customer Candidate',
              email: data.email || session.user.email,
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
              fitSummary: skillsArray.length > 0 ? `Active profile with ${skillsArray.length} verified competencies.` : 'Fresh profile. Upload your resume or add competencies to begin evaluation.',
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            };

            const otherProfiles = baseProfiles.filter((p) => p.id !== customerObj.id);
            return [customerObj, ...otherProfiles];
          }
        }
      } catch (err) {
        console.warn('Supabase profile fetch error, using local/sample profiles:', err);
      }
    }

    if (customerProfile) {
      const filtered = baseProfiles.filter((p) => p.id !== customerProfile.id);
      return [customerProfile, ...filtered];
    }

    return baseProfiles;
  },

  async getProfileById(id, customerProfile = null) {
    if (customerProfile && customerProfile.id === id) {
      return customerProfile;
    }
    const profiles = await this.getProfiles(customerProfile);
    return profiles.find((p) => p.id === id) || profiles[0] || SAMPLE_CANDIDATES[0];
  },

  getActiveProfileId() {
    const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
    return id || SAMPLE_CANDIDATES[0].id;
  },

  setActiveProfileId(id) {
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    window.dispatchEvent(new CustomEvent('radix_profile_changed', { detail: { id } }));
  },

  async getActiveProfile(customerProfile = null) {
    if (customerProfile) {
      const activeId = this.getActiveProfileId();
      if (activeId === customerProfile.id) return customerProfile;
    }
    const activeId = this.getActiveProfileId();
    return this.getProfileById(activeId, customerProfile);
  },

  async saveProfile(profileData) {
    // If saving customer profile to Supabase
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && (profileData.id === session.user.id || profileData.isCustomer)) {
          // Build education JSONB
          let educationData = [];
          if (Array.isArray(profileData.educationList) && profileData.educationList.length > 0) {
            educationData = profileData.educationList;
          } else if (Array.isArray(profileData.education)) {
            educationData = profileData.education;
          } else if (profileData.education) {
            educationData = [{ degree: profileData.education, institution: 'University', year: '2024' }];
          }

          // Build experience JSONB
          let experienceData = [];
          if (Array.isArray(profileData.experience) && profileData.experience.length > 0) {
            experienceData = profileData.experience;
          } else if (Array.isArray(profileData.internships) && profileData.internships.length > 0) {
            experienceData = profileData.internships;
          }

          // Exact 8 writable columns of public.candidate_profiles
          const payload = {
            id: session.user.id,
            full_name: profileData.name || profileData.full_name || 'Candidate',
            email: session.user.email,
            education: educationData,
            skills: Array.isArray(profileData.skills) ? profileData.skills : [],
            projects: Array.isArray(profileData.projects) ? profileData.projects : [],
            certifications: Array.isArray(profileData.certifications) ? profileData.certifications : [],
            experience: experienceData,
            updated_at: new Date().toISOString(),
          };

          const { data, error } = await supabase
            .from('candidate_profiles')
            .upsert([payload], { onConflict: 'id' })
            .select()
            .single();

          if (!error && data) {
            window.dispatchEvent(new CustomEvent('radix_profiles_updated'));
            return {
              ...profileData,
              updatedAt: data.updated_at,
            };
          } else if (error) {
            console.error('Supabase profile save error:', error);
            throw error;
          }
        }
      } catch (err) {
        console.warn('Supabase save error (falling back to local cache):', err);
        throw err;
      }
    }

    // LocalStorage fallback for offline/demo profiles
    const profiles = getLocalProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === profileData.id);
    let updated;

    if (existingIndex >= 0) {
      updated = [...profiles];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...profileData,
        updatedAt: new Date().toISOString(),
      };
    } else {
      const newProfile = {
        ...profileData,
        id: profileData.id || `profile_${Date.now()}`,
        avatar: profileData.name ? profileData.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase() : 'CD',
        updatedAt: new Date().toISOString(),
      };
      updated = [newProfile, ...profiles];
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('radix_profiles_updated'));
    return profileData;
  },

  async mergeResumeSkills(profileId, newSkills) {
    const profile = await this.getProfileById(profileId);
    if (!profile) return null;

    const existingSkills = profile.skills || [];
    const mergedSkills = [...existingSkills];

    newSkills.forEach((newSkill) => {
      const existing = mergedSkills.find(
        (s) => s.skill_name?.toLowerCase() === newSkill.skill_name?.toLowerCase()
      );
      if (existing) {
        existing.evidence = newSkill.evidence || existing.evidence;
        existing.confidence = newSkill.confidence || existing.confidence;
        if (newSkill.proficiency) existing.proficiency = newSkill.proficiency;
      } else {
        mergedSkills.push({
          skill_name: newSkill.skill_name,
          category_code: newSkill.category_code || 'OTHER',
          evidence: newSkill.evidence || 'Extracted from resume upload',
          confidence: newSkill.confidence || 'medium',
          proficiency: newSkill.proficiency || 7,
        });
      }
    });

    const updatedProfile = {
      ...profile,
      skills: mergedSkills,
      categories: computeCategoryLevels(mergedSkills),
      categoryScores: computeCategoryLevels(mergedSkills),
    };

    return this.saveProfile(updatedProfile);
  },

  resetDefaults() {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(SAMPLE_CANDIDATES));
    localStorage.setItem(ACTIVE_PROFILE_KEY, SAMPLE_CANDIDATES[0].id);
    window.dispatchEvent(new CustomEvent('radix_profiles_updated'));
  },
};
