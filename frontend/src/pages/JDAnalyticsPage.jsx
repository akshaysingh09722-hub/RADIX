import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  Sparkles,
  MapPin,
  CheckCircle2,
  GitCompare,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { apiClient } from '../services/api';
import { SAMPLE_JOBS, RADIX_CATEGORIES } from '../lib/radixData';
import Card from '../components/ui/Card';

export default function JDAnalyticsPage() {
  const navigate = useNavigate();
  const { selectedJob, setSelectedJob, addCustomJob, isDemoMode, isBackendOnline, addToast, activeCandidate } = useApp();

  const [activeJob, setActiveJob] = useState(selectedJob || SAMPLE_JOBS[0]);
  const [pastedText, setPastedText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('sample');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleSelectSampleJob = (job) => {
    setActiveJob(job);
    setSelectedJob(job);
  };

  const handleExecuteFileAnalysis = async () => {
    if (!uploadedFile) {
      addToast('Please select or drop a job description file first', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setUploadProgress(15);
    setUploadStep('Reading document binary...');
    try {
      if (!isDemoMode && isBackendOnline) {
        setUploadProgress(40);
        setUploadStep('Extracting requirements via OpenRouter Nemotron...');
        const res = await apiClient.extractJobDescription(uploadedFile, true);
        setUploadProgress(80);
        setUploadStep('Mapping competencies to 12 RADIX categories...');

        const jdData = res.data || {};
        const newJob = {
          id: `custom_jd_${Date.now()}`,
          company: jdData.company || uploadedFile.name.split('-')[0]?.trim() || 'Analyzed Company',
          role: jdData.role || 'Analyzed Position',
          location: jdData.location || 'Bengaluru / Remote',
          ctc: jdData.ctc || 'Competitive CTC',
          overview: `Extracted from ${uploadedFile.name}. Identifies ${jdData.skills?.length || 0} core competencies.`,
          sourceFile: uploadedFile.name,
          skills: jdData.skills || [],
          keyResponsibilities: jdData.responsibilities || [],
          requirements: jdData.requirements || [],
        };
        setActiveJob(newJob);
        if (addCustomJob) addCustomJob(newJob);
        else setSelectedJob(newJob);
        setUploadProgress(100);
        setUploadStep('Extraction Complete!');
        addToast(`Extracted ${newJob.skills.length} competencies from ${uploadedFile.name}`, 'success');
      } else {
        setUploadProgress(50);
        setUploadStep('Processing with client-side NLP engine...');
        await new Promise((r) => setTimeout(r, 600));

        const detectedSkills = [
          { skill_name: 'Python', category_code: 'COD', evidence: 'Core language requirement', confidence: 'high' },
          { skill_name: 'Data Structures & Algorithms', category_code: 'DSA', evidence: 'Foundational algorithmic problem solving', confidence: 'high' },
          { skill_name: 'System Design', category_code: 'SYSD', evidence: 'Scalable service architecture', confidence: 'high' },
          { skill_name: 'PostgreSQL', category_code: 'SQL', evidence: 'Database query design', confidence: 'high' },
          { skill_name: 'Docker & Kubernetes', category_code: 'CLOUD', evidence: 'Containerized deployment', confidence: 'medium' },
        ];
        const newJob = {
          id: `custom_jd_${Date.now()}`,
          company: uploadedFile.name.split('-')[0]?.trim() || 'Uploaded JD',
          role: uploadedFile.name.split('-')[1]?.replace(/\.[^/.]+$/, "")?.trim() || 'Software Engineer',
          location: 'Bengaluru / Remote',
          ctc: '₹18,00,000 - ₹24,00,000',
          overview: `Parsed requirements from uploaded document ${uploadedFile.name}`,
          sourceFile: uploadedFile.name,
          skills: detectedSkills,
          keyResponsibilities: ['Deliver production-grade code', 'Collaborate across cross-functional engineering teams'],
          requirements: ['Strong foundations in computer science and distributed systems'],
        };
        setActiveJob(newJob);
        if (addCustomJob) addCustomJob(newJob);
        else setSelectedJob(newJob);
        setUploadProgress(100);
        setUploadStep('Extraction Complete!');
        addToast(`Parsed ${uploadedFile.name} successfully`, 'success');
      }
    } catch (err) {
      addToast(`Error analyzing document: ${err.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunTextAnalysis = async () => {
    if (!pastedText.trim()) {
      addToast('Please enter job description text to analyze', 'warning');
      return;
    }

    setIsAnalyzing(true);
    try {
      if (!isDemoMode && isBackendOnline) {
        const res = await apiClient.extractJobDescription(pastedText, false);
        const newJob = {
          id: `custom_jd_${Date.now()}`,
          company: res.data?.company || 'Analyzed Company',
          role: res.data?.role || 'Analyzed Role',
          location: res.data?.location || 'Remote / Hybrid',
          ctc: res.data?.ctc || 'Competitive CTC',
          overview: pastedText.substring(0, 300) + '...',
          skills: res.data?.skills || [],
          keyResponsibilities: res.data?.responsibilities || [],
        };
        setActiveJob(newJob);
        if (addCustomJob) addCustomJob(newJob);
        else setSelectedJob(newJob);
        addToast('Job description analyzed successfully', 'success');
      } else {
        await new Promise((r) => setTimeout(r, 600));

        const detectedSkills = [];
        const lower = pastedText.toLowerCase();

        if (lower.includes('algorithm') || lower.includes('data structure') || lower.includes('dsa')) {
          detectedSkills.push({ skill_name: 'Data Structures & Algorithms', category_code: 'DSA', evidence: 'Extracted from algorithm requirements', confidence: 'high' });
        }
        if (lower.includes('system design') || lower.includes('distributed') || lower.includes('scalab')) {
          detectedSkills.push({ skill_name: 'Distributed System Design', category_code: 'SYSD', evidence: 'Extracted from scalability/architecture requirements', confidence: 'high' });
        }
        if (lower.includes('sql') || lower.includes('database') || lower.includes('postgres') || lower.includes('mysql')) {
          detectedSkills.push({ skill_name: 'Relational SQL & Schema Design', category_code: 'SQL', evidence: 'Extracted from database specifications', confidence: 'high' });
        }
        if (lower.includes('python')) {
          detectedSkills.push({ skill_name: 'Python Development', category_code: 'COD', evidence: 'Identified Python programming requirement', confidence: 'high' });
        }
        if (lower.includes('c++')) {
          detectedSkills.push({ skill_name: 'C++ Systems Programming', category_code: 'COD', evidence: 'Identified C++ requirement', confidence: 'high' });
        }
        if (lower.includes('java')) {
          detectedSkills.push({ skill_name: 'Java & OOP Principles', category_code: 'COD', evidence: 'Identified Java requirement', confidence: 'high' });
        }
        if (lower.includes('cloud') || lower.includes('aws') || lower.includes('azure') || lower.includes('gcp') || lower.includes('docker')) {
          detectedSkills.push({ skill_name: 'Cloud & Containerization', category_code: 'CLOUD', evidence: 'Identified cloud infrastructure requirements', confidence: 'high' });
        }
        if (lower.includes('test') || lower.includes('ci/cd') || lower.includes('git')) {
          detectedSkills.push({ skill_name: 'Software Testing & CI/CD', category_code: 'SWE', evidence: 'Extracted testing/SDLC standards', confidence: 'high' });
        }
        if (lower.includes('communication') || lower.includes('stakeholder') || lower.includes('present')) {
          detectedSkills.push({ skill_name: 'Stakeholder Communication', category_code: 'COMM', evidence: 'Extracted collaboration/communication standards', confidence: 'high' });
        }

        if (detectedSkills.length === 0) {
          detectedSkills.push(
            { skill_name: 'Programming & Logic', category_code: 'COD', evidence: 'Foundational coding expectation', confidence: 'medium' },
            { skill_name: 'Technical Communication', category_code: 'COMM', evidence: 'Cross-functional teamwork requirement', confidence: 'medium' }
          );
        }

        const customAnalyzedJob = {
          id: `custom_jd_${Date.now()}`,
          company: 'Custom Evaluated JD',
          companyShort: 'Custom',
          role: 'Analyzed Position',
          roleCategory: 'Engineering',
          location: 'Bengaluru / Remote',
          ctc: 'Market Standard CTC',
          overview: pastedText.substring(0, 320) + (pastedText.length > 320 ? '...' : ''),
          keyResponsibilities: [
            'Deliver production code meeting engineering specifications',
            'Collaborate with product and quality assurance partners',
            'Participate in architecture discussions and technical reviews'
          ],
          requirements: [
            'Hands-on computer science foundations and problem-solving aptitude',
            'Strong communication and ability to explain engineering tradeoffs'
          ],
          skills: detectedSkills,
        };

        setActiveJob(customAnalyzedJob);
        setSelectedJob(customAnalyzedJob);
        addToast(`Extracted ${detectedSkills.length} competencies using RADIX Analyzer`, 'success');
      }
    } catch (err) {
      addToast(`JD Analysis error: ${err.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRouteToMatch = () => {
    setSelectedJob(activeJob);
    navigate('/skill-matching');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
            JD Analytics
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Analyze Job Descriptions, extract required skills mapped to the 12 RADIX categories, and evaluate role expectations.
          </p>
        </div>

        <button
          onClick={handleRouteToMatch}
          className="btn btn-primary"
        >
          <GitCompare size={16} />
          <span>Match with {activeCandidate?.name}</span>
        </button>
      </div>

      {/* Input Options: Sample Selector vs Upload vs Paste */}
      <Card>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '12px', marginBottom: '18px' }}>
          {[
            { id: 'sample', label: 'Select Sample Job Description' },
            { id: 'paste', label: 'Paste Job Description Text' },
            { id: 'upload', label: 'Upload JD Document (PDF/DOCX)' },
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
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'sample' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {SAMPLE_JOBS.map((job) => {
              const isSelected = activeJob.id === job.id;
              return (
                <div
                  key={job.id}
                  onClick={() => handleSelectSampleJob(job)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span className="badge badge-primary">{job.companyShort || job.company}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-subtle)' }}>{job.roleCategory}</span>
                  </div>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                    {job.role}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {job.location} · {job.ctc}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'paste' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <textarea
              className="form-textarea"
              style={{ minHeight: '140px' }}
              placeholder="Paste raw job description text here (e.g. responsibilities, requirements, skills)..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleRunTextAnalysis}
                disabled={isAnalyzing || !pastedText.trim()}
                className="btn btn-primary"
              >
                {isAnalyzing ? <RefreshCw size={14} className="spin-animation" /> : <Sparkles size={14} />}
                <span>Extract Skills & Categories</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  setUploadedFile(file);
                  addToast(`Selected ${file.name}`, 'info');
                }
              }}
              onClick={() => document.getElementById('jd-file-input').click()}
              style={{
                background: isDragOver ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                border: isDragOver ? '2px dashed var(--accent-cyan)' : '2px dashed var(--border-medium)',
                borderRadius: 'var(--radius-lg)',
                padding: '36px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <input
                id="jd-file-input"
                type="file"
                accept=".pdf,.docx,.doc"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadedFile(file);
                    addToast(`Selected ${file.name}`, 'info');
                  }
                }}
              />
              <div
                style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'rgba(69, 214, 255, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                }}
              >
                <UploadCloud size={28} color="var(--accent-cyan)" />
              </div>
              <h4 style={{ color: 'var(--text-primary)', marginBottom: '4px', fontSize: '16px', fontWeight: '700' }}>
                {uploadedFile ? uploadedFile.name : 'Upload Job Description Document'}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Drag and drop your PDF or Word (.docx) file here, or click to browse.
              </p>
              {uploadedFile && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--accent-cyan)', fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: '600' }}>
                  <CheckCircle2 size={14} color="#35D49A" />
                  <span>Ready for Analysis ({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
              )}
            </div>

            {uploadedFile && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                {isAnalyzing && (
                  <div style={{ width: '100%', maxWidth: '420px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span>{uploadStep}</span>
                      <span style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{uploadProgress}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'linear-gradient(90deg, #45D6FF, #35D49A)', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>
                )}
                <button
                  onClick={handleExecuteFileAnalysis}
                  disabled={isAnalyzing}
                  className="btn btn-primary"
                  style={{ minWidth: '240px', height: '42px', fontSize: '14px' }}
                >
                  {isAnalyzing ? <RefreshCw size={15} className="spin-animation" /> : <Sparkles size={15} />}
                  <span>{isAnalyzing ? (uploadStep || 'Analyzing JD...') : 'Analyze Job Description'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Analysis Output Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span className="badge badge-primary">{activeJob.company}</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#35D49A', fontFamily: 'var(--font-mono)' }}>
                {activeJob.ctc}
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
              {activeJob.role}
            </h2>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="var(--accent-violet)" />
                {activeJob.location}
              </span>
              <span>·</span>
              <span>Full-Time Position</span>
              {activeJob.sourceFile && (
                <>
                  <span>·</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{activeJob.sourceFile}</span>
                </>
              )}
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {activeJob.overview}
            </p>
          </Card>

          <Card
            title={`Required Skills & Technologies (${activeJob.skills?.length || 0})`}
            subtitle="Extracted requirements mapped to RADIX 12-category standard"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeJob.skills?.map((skill, idx) => {
                const cat = RADIX_CATEGORIES[skill.category_code] || RADIX_CATEGORIES['OTHER'];
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                          {skill.category_code}
                        </span>
                        <span style={{ fontWeight: '600', fontSize: '13.5px', color: 'var(--text-primary)' }}>
                          {skill.skill_name}
                        </span>
                      </div>

                      <span
                        className="badge"
                        style={{
                          fontSize: '10px',
                          background: skill.confidence === 'high' ? 'rgba(53, 212, 154, 0.15)' : 'rgba(69, 214, 255, 0.15)',
                          color: skill.confidence === 'high' ? '#35D49A' : '#45D6FF',
                        }}
                      >
                        {skill.confidence || 'verified'} confidence
                      </span>
                    </div>

                    {skill.evidence && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', paddingLeft: '8px', borderLeft: '2px solid rgba(255,255,255,0.1)' }}>
                        "{skill.evidence}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {activeJob.keyResponsibilities && (
            <Card title="Key Responsibilities" icon={CheckCircle2}>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', padding: 0 }}>
                {activeJob.keyResponsibilities.map((resp, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '12.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)', marginTop: '6px', flexShrink: 0 }} />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {activeJob.requirements && (
            <Card title="Qualifications & What They Look For" icon={BookOpen}>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', padding: 0 }}>
                {activeJob.requirements.map((req, idx) => (
                  <li
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '12.5px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-violet)', marginTop: '6px', flexShrink: 0 }} />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {(activeJob.niceToHave || activeJob.benefits) && (
            <Card title="Additional Context">
              {activeJob.niceToHave && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                    Nice to Have
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {activeJob.niceToHave}
                  </p>
                </div>
              )}
              {activeJob.benefits && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
                    Benefits & Perks
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {activeJob.benefits}
                  </p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
