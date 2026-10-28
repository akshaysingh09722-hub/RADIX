import { useState, useEffect } from 'react';
import {
  Save,
  Upload,
  Plus,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Trophy,
  Tag,
  ShieldCheck,
  Award,
  Trash2
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { useAuth } from '../hooks/useAuth';
import { profileService } from '../services/profileService';
import { RADIX_CATEGORY_LIST, SAMPLE_CANDIDATES } from '../lib/radixData';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import SkillChip from '../components/ui/SkillChip';

export default function ProfilePage() {
  const { activeCandidate, setActiveCandidate, addToast } = useApp();
  const { user, saveProfileToSupabase, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    headline: '',
    location: '',
    education: '',
    college: '',
    fitSummary: '',
    skills: [],
    projects: [],
    experience: [],
    internships: [],
    hackathons: [],
    certifications: [],
    preferredRoles: [],
    cvFile: '',
    categoryScores: {},
  });

  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('skills');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newSkill, setNewSkill] = useState({
    skill_name: '',
    category_code: 'COD',
    proficiency: 8,
    confidence: 'high',
    evidence: '',
  });

  const [newCert, setNewCert] = useState('');
  const [newProject, setNewProject] = useState({
    title: '',
    category: 'SWE',
    technologies: '',
    description: '',
  });
  const [newExperience, setNewExperience] = useState({
    company: '',
    role: '',
    period: '',
    description: '',
  });

  useEffect(() => {
    if (activeCandidate) {
      const expList = activeCandidate.experience || activeCandidate.internships || [];
      setFormData({
        ...activeCandidate,
        skills: activeCandidate.skills || [],
        projects: activeCandidate.projects || [],
        experience: expList,
        internships: expList,
        hackathons: activeCandidate.hackathons || [],
        certifications: activeCandidate.certifications || [],
        preferredRoles: activeCandidate.preferredRoles || [],
        categoryScores: activeCandidate.categoryScores || {},
      });
    }
  }, [activeCandidate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!formData.name.trim()) {
      addToast('Candidate name is required', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const expList = formData.experience?.length ? formData.experience : (formData.internships || []);
      const eduList = formData.educationList?.length
        ? formData.educationList
        : [{ degree: formData.education, institution: formData.college || 'University', year: '2024' }];

      const toSave = {
        ...formData,
        id: (isAuthenticated && user?.id) ? user.id : formData.id,
        name: formData.name,
        email: user?.email || formData.email,
        education: formData.education,
        educationList: eduList,
        experience: expList,
        internships: expList,
        skills: formData.skills,
        projects: formData.projects,
        certifications: formData.certifications,
        isCustomer: Boolean(isAuthenticated),
      };

      if (isAuthenticated && user?.id) {
        await saveProfileToSupabase(toSave);
        setActiveCandidate(toSave);
        addToast('Profile saved directly to Supabase with Row Level Security (RLS)!', 'success');
      } else {
        await profileService.saveProfile(toSave);
        setActiveCandidate(toSave);
        addToast('Candidate profile updated and persisted successfully', 'success');
      }
    } catch (err) {
      addToast(`Save error: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCert = () => {
    if (!newCert.trim()) {
      addToast('Please enter a certification name', 'warning');
      return;
    }
    const updated = [...(formData.certifications || []), newCert.trim()];
    setFormData((prev) => ({ ...prev, certifications: updated }));
    setNewCert('');
    addToast(`Added certification: ${newCert.trim()}`, 'info');
  };

  const handleRemoveCert = (index) => {
    const updated = formData.certifications.filter((_, idx) => idx !== index);
    setFormData((prev) => ({ ...prev, certifications: updated }));
    addToast('Certification removed', 'info');
  };

  const handleAddProject = () => {
    if (!newProject.title.trim()) {
      addToast('Project title is required', 'warning');
      return;
    }
    const projObj = {
      title: newProject.title.trim(),
      category: newProject.category || 'SWE',
      technologies: newProject.technologies ? newProject.technologies.split(',').map((t) => t.trim()).filter(Boolean) : [],
      description: newProject.description.trim(),
    };
    setFormData((prev) => ({ ...prev, projects: [...prev.projects, projObj] }));
    setNewProject({ title: '', category: 'SWE', technologies: '', description: '' });
    addToast(`Added project: ${projObj.title}`, 'info');
  };

  const handleRemoveProject = (index) => {
    const updated = formData.projects.filter((_, idx) => idx !== index);
    setFormData((prev) => ({ ...prev, projects: updated }));
    addToast('Project removed', 'info');
  };

  const handleAddExperience = () => {
    if (!newExperience.company.trim() || !newExperience.role.trim()) {
      addToast('Company and Role are required', 'warning');
      return;
    }
    const expObj = {
      company: newExperience.company.trim(),
      role: newExperience.role.trim(),
      period: newExperience.period.trim() || '2024',
      description: newExperience.description.trim(),
    };
    const updated = [...(formData.experience || formData.internships || []), expObj];
    setFormData((prev) => ({
      ...prev,
      experience: updated,
      internships: updated,
    }));
    setNewExperience({ company: '', role: '', period: '', description: '' });
    addToast(`Added experience at ${expObj.company}`, 'info');
  };

  const handleRemoveExperience = (index) => {
    const list = formData.experience || formData.internships || [];
    const updated = list.filter((_, idx) => idx !== index);
    setFormData((prev) => ({ ...prev, experience: updated, internships: updated }));
    addToast('Experience record removed', 'info');
  };

  const handleAddSkill = () => {
    if (!newSkill.skill_name.trim()) {
      addToast('Please enter a skill name', 'warning');
      return;
    }

    const skillObj = {
      skill_name: newSkill.skill_name.trim(),
      category_code: newSkill.category_code,
      proficiency: Number(newSkill.proficiency) || 7,
      confidence: newSkill.confidence || 'high',
      evidence: newSkill.evidence.trim() || 'Added manually via Profile Builder',
    };

    const updatedSkills = [...formData.skills, skillObj];

    const updatedCategoryScores = { ...(formData.categoryScores || {}) };
    const catSkills = updatedSkills.filter((s) => s.category_code === newSkill.category_code);
    const avgProf = Math.round(
      catSkills.reduce((sum, s) => sum + (s.proficiency || 7), 0) / catSkills.length
    );
    updatedCategoryScores[newSkill.category_code] = Math.min(10, Math.max(1, avgProf));

    setFormData((prev) => ({
      ...prev,
      skills: updatedSkills,
      categoryScores: updatedCategoryScores,
    }));

    setNewSkill({
      skill_name: '',
      category_code: 'COD',
      proficiency: 8,
      confidence: 'high',
      evidence: '',
    });

    addToast(`Added skill: ${skillObj.skill_name}`, 'info');
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updatedSkills = formData.skills.filter(
      (s) => s.skill_name.toLowerCase() !== skillToRemove.skill_name.toLowerCase()
    );

    const updatedCategoryScores = { ...(formData.categoryScores || {}) };
    const catSkills = updatedSkills.filter((s) => s.category_code === skillToRemove.category_code);
    if (catSkills.length > 0) {
      const avgProf = Math.round(
        catSkills.reduce((sum, s) => sum + (s.proficiency || 7), 0) / catSkills.length
      );
      updatedCategoryScores[skillToRemove.category_code] = avgProf;
    } else {
      updatedCategoryScores[skillToRemove.category_code] = 4;
    }

    setFormData((prev) => ({
      ...prev,
      skills: updatedSkills,
      categoryScores: updatedCategoryScores,
    }));
  };

  const handleImportSampleResume = (candidateSample) => {
    setFormData((prev) => ({
      ...candidateSample,
      id: prev.isCustomer && user ? user.id : (prev.id || candidateSample.id),
      isCustomer: prev.isCustomer,
      name: prev.isCustomer && prev.name ? prev.name : candidateSample.name,
      email: prev.isCustomer && prev.email ? prev.email : candidateSample.email,
    }));
    setIsImportModalOpen(false);
    addToast(`Imported skills and projects from ${candidateSample.name}`, 'success');
  };

  const skillsByCategory = {};
  RADIX_CATEGORY_LIST.forEach((cat) => {
    skillsByCategory[cat.code] = [];
  });
  formData.skills.forEach((skill) => {
    const code = skill.category_code || 'OTHER';
    if (!skillsByCategory[code]) skillsByCategory[code] = [];
    skillsByCategory[code].push(skill);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Candidate Profile Builder
            </h1>
            {isAuthenticated && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(53, 212, 154, 0.12)',
                  border: '1px solid rgba(53, 212, 154, 0.3)',
                  color: 'var(--success)',
                  fontSize: '11px',
                  fontWeight: '600',
                }}
                title={`Logged in user: ${user?.email}`}
              >
                <ShieldCheck size={13} />
                <span>Supabase RLS Protected</span>
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Manage verified credentials, category proficiency levels, and career achievements
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="btn btn-secondary"
          >
            <Upload size={16} />
            <span>Import from Resume</span>
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="btn btn-primary"
          >
            <Save size={16} />
            <span>{isSaving ? 'Saving...' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      {/* Basic Info & Education Overview Card */}
      <Card title="Candidate Overview" icon={GraduationCap}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g. Ananya Rao"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="e.g. ananya.rao@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              name="location"
              className="form-input"
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g. Bengaluru, India"
            />
          </div>

          <div className="form-group" style={{ gridColumn: 'span 2' }}>
            <label className="form-label">Professional Headline & Degree</label>
            <input
              type="text"
              name="education"
              className="form-input"
              value={formData.education}
              onChange={handleInputChange}
              placeholder="e.g. B.Tech, Computer Science and Engineering, Class of 2026 — CGPA 8.6 / 10"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Attached CV / Resume File</label>
            <input
              type="text"
              name="cvFile"
              className="form-input"
              value={formData.cvFile || 'Ananya Rao.docx'}
              onChange={handleInputChange}
              placeholder="Filename"
            />
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Professional Summary & Target Fit</label>
          <input
            type="text"
            name="fitSummary"
            className="form-input"
            value={formData.fitSummary}
            onChange={handleInputChange}
            placeholder="e.g. Systems-leaning generalist — strong fit for SWE-heavy roles"
          />
        </div>
      </Card>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '8px', overflowX: 'auto' }}>
        {[
          { id: 'skills', label: `Technical Skills (${formData.skills.length})`, icon: Tag },
          { id: 'projects', label: `Projects (${formData.projects.length})`, icon: FolderGit2 },
          { id: 'experience', label: `Experience & Internships (${(formData.experience?.length || formData.internships?.length || 0)})`, icon: Briefcase },
          { id: 'certifications', label: `Certifications (${formData.certifications.length})`, icon: Award },
          { id: 'roles', label: 'Preferred Roles & Targets', icon: Trophy },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: isActive ? '600' : '500',
                fontSize: '13.5px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={16} color={isActive ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: TECHNICAL SKILLS */}
      {activeTab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card title="Add / Update Technical Skill" icon={Plus}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto', gap: '14px', alignItems: 'flex-end' }}>
              <div>
                <label className="form-label">Skill Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Docker, Redis, C++"
                  value={newSkill.skill_name}
                  onChange={(e) => setNewSkill({ ...newSkill, skill_name: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">RADIX Category</label>
                <select
                  className="form-select"
                  value={newSkill.category_code}
                  onChange={(e) => setNewSkill({ ...newSkill, category_code: e.target.value })}
                >
                  {RADIX_CATEGORY_LIST.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.code} — {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">Proficiency (1-10)</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="form-input"
                  value={newSkill.proficiency}
                  onChange={(e) => setNewSkill({ ...newSkill, proficiency: e.target.value })}
                />
              </div>

              <div>
                <label className="form-label">Confidence</label>
                <select
                  className="form-select"
                  value={newSkill.confidence}
                  onChange={(e) => setNewSkill({ ...newSkill, confidence: e.target.value })}
                >
                  <option value="high">High Confidence</option>
                  <option value="medium">Medium Confidence</option>
                  <option value="low">Low Confidence</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleAddSkill}
                className="btn btn-primary"
                style={{ height: '38px' }}
              >
                <Plus size={16} />
                <span>Add Skill</span>
              </button>
            </div>

            <div style={{ marginTop: '12px' }}>
              <label className="form-label">Supporting Evidence / Quote (From Resume or Project)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Shipped a rate-limiter in production handling high concurrency"
                value={newSkill.evidence}
                onChange={(e) => setNewSkill({ ...newSkill, evidence: e.target.value })}
              />
            </div>
          </Card>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {RADIX_CATEGORY_LIST.map((cat) => {
              const catSkills = skillsByCategory[cat.code] || [];
              const categoryScore = formData.categoryScores?.[cat.code] || (catSkills.length > 0 ? 7 : 0);

              return (
                <div
                  key={cat.code}
                  style={{
                    background: 'var(--bg-surface)',
                    border: `1px solid ${catSkills.length > 0 ? 'var(--border-subtle)' : 'rgba(255, 255, 255, 0.04)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: cat.bgColor,
                          color: cat.color,
                        }}
                      >
                        {cat.code}
                      </span>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                        {cat.name}
                      </span>
                    </div>

                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: cat.color, fontWeight: '700' }}>
                      Lvl {categoryScore}/10
                    </span>
                  </div>

                  {catSkills.length === 0 ? (
                    <p style={{ fontSize: '11.5px', color: 'var(--text-subtle)', fontStyle: 'italic' }}>
                      No skills added in this category yet.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {catSkills.map((s, idx) => (
                        <SkillChip
                          key={`${s.skill_name}-${idx}`}
                          skill={s}
                          editable
                          onRemove={handleRemoveSkill}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PROJECTS */}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card title="Add New Project" icon={Plus}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label className="form-label">Project Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Distributed Cache & KV Store"
                  value={newProject.title}
                  onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={newProject.category}
                  onChange={(e) => setNewProject({ ...newProject, category: e.target.value })}
                >
                  <option value="SWE">SWE / Systems</option>
                  <option value="DSA">Algorithms</option>
                  <option value="AI">AI / ML</option>
                  <option value="CLOUD">Cloud / DevOps</option>
                  <option value="SQL">Database / Data</option>
                </select>
              </div>
              <div>
                <label className="form-label">Technologies (comma separated)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Go, Redis, Docker, gRPC"
                  value={newProject.technologies}
                  onChange={(e) => setNewProject({ ...newProject, technologies: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Project Overview & Technical Outcomes</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: '70px' }}
                placeholder="Architected an in-memory distributed cache with consistent hashing and write-through persistence..."
                value={newProject.description}
                onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={handleAddProject}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>Add Project</span>
            </button>
          </Card>

          <Card title={`Projects & Technical Implementation (${formData.projects.length})`} icon={FolderGit2}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {formData.projects.length === 0 ? (
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>No projects added yet.</p>
              ) : (
                formData.projects.map((proj, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', fontWeight: '600' }}>
                          {proj.title}
                        </h4>
                        <span className="badge badge-primary">{proj.category || 'SWE'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProject(idx)}
                        className="btn-ghost"
                        style={{ color: 'var(--error)', padding: '4px 8px', borderRadius: '4px' }}
                        title="Remove project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
                      {proj.description}
                    </p>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {proj.technologies?.map((t, tidx) => (
                        <span
                          key={tidx}
                          style={{
                            fontSize: '11px',
                            background: 'rgba(255,255,255,0.06)',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: WORK EXPERIENCE & INTERNSHIPS */}
      {activeTab === 'experience' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card title="Add Work Experience or Internship" icon={Plus}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label className="form-label">Company / Organization *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Oracle India, Microsoft, Startup"
                  value={newExperience.company}
                  onChange={(e) => setNewExperience({ ...newExperience, company: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Role / Position *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Software Engineering Intern"
                  value={newExperience.role}
                  onChange={(e) => setNewExperience({ ...newExperience, role: e.target.value })}
                />
              </div>
              <div>
                <label className="form-label">Time Period / Duration</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. May 2024 - July 2024"
                  value={newExperience.period}
                  onChange={(e) => setNewExperience({ ...newExperience, period: e.target.value })}
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label">Key Contributions & Engineering Impact</label>
              <textarea
                className="form-textarea"
                style={{ minHeight: '70px' }}
                placeholder="Built backend endpoints, optimized database indexes, and participated in Agile standups..."
                value={newExperience.description}
                onChange={(e) => setNewExperience({ ...newExperience, description: e.target.value })}
              />
            </div>
            <button
              type="button"
              onClick={handleAddExperience}
              className="btn btn-primary"
            >
              <Plus size={16} />
              <span>Add Experience Record</span>
            </button>
          </Card>

          <Card title="Saved Experience & Internships" icon={Briefcase}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(formData.experience?.length || formData.internships?.length || 0) === 0 ? (
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No experience records listed yet.</p>
              ) : (
                (formData.experience?.length ? formData.experience : formData.internships).map((intern, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--accent-cyan)',
                      position: 'relative',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
                          {intern.role}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', margin: '2px 0 6px' }}>
                          {intern.company} · {intern.period}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExperience(idx)}
                        className="btn-ghost"
                        style={{ color: 'var(--error)', padding: '4px' }}
                        title="Remove experience"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {intern.description}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: CERTIFICATIONS */}
      {activeTab === 'certifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card title="Add Certification" icon={Award}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label className="form-label">Certification Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. AWS Certified Solutions Architect, Oracle Java SE 11 Developer"
                  value={newCert}
                  onChange={(e) => setNewCert(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCert()}
                />
              </div>
              <button
                type="button"
                onClick={handleAddCert}
                className="btn btn-primary"
                style={{ height: '38px' }}
              >
                <Plus size={16} />
                <span>Add Certification</span>
              </button>
            </div>
          </Card>

          <Card title={`Active Certifications (${formData.certifications.length})`} icon={Award}>
            {formData.certifications.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                No certifications added yet. Add industry certifications to boost your readiness scores.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {formData.certifications.map((cert, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Award size={18} color="var(--accent-cyan)" />
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {cert}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveCert(idx)}
                      className="btn-ghost"
                      style={{ color: 'var(--error)', padding: '4px' }}
                      title="Remove certification"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 5: PREFERRED ROLES */}
      {activeTab === 'roles' && (
        <Card title="Preferred Roles & Target Alignment" icon={Trophy}>
          <div style={{ maxWidth: '600px' }}>
            <label className="form-label">Preferred Job Roles (Comma separated)</label>
            <input
              type="text"
              className="form-input"
              value={formData.preferredRoles.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  preferredRoles: e.target.value.split(',').map((r) => r.trim()).filter(Boolean),
                })
              }
              placeholder="e.g. Software Engineer, Backend Engineer, Systems Architect"
            />

            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Active role focus tags:
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {formData.preferredRoles.map((role, idx) => (
                  <span key={idx} className="badge badge-primary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    {role}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Candidate Data"
        subtitle="Select an official sample resume to load verified skills, projects, and credentials"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {SAMPLE_CANDIDATES.map((cand) => (
            <div
              key={cand.id}
              onClick={() => handleImportSampleResume(cand)}
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.15s ease',
              }}
            >
              <div>
                <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '14px' }}>
                  {cand.name}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {cand.fitSummary}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '4px' }}>
                  {cand.skills?.length || 0} skills · {cand.projects?.length || 0} projects
                </div>
              </div>
              <button className="btn btn-outline btn-sm">
                Load Profile
              </button>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
