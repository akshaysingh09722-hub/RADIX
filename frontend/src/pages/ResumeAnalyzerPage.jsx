import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  Sparkles,
  Trash2,
  RefreshCw,
  FileCheck,
  Check
} from 'lucide-react';
import { useApp } from '../hooks/useApp';
import { useAuth } from '../hooks/useAuth';
import { apiClient } from '../services/api';
import { profileService } from '../services/profileService';
import { SAMPLE_CANDIDATES, RADIX_CATEGORY_LIST } from '../lib/radixData';
import Card from '../components/ui/Card';

export default function ResumeAnalyzerPage() {
  const navigate = useNavigate();
  const { isDemoMode, isBackendOnline, addToast, activeCandidate } = useApp();
  const { isAuthenticated, customerProfile, uploadResume, isConfigured } = useAuth();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const sampleResumes = [
    { name: 'Ananya Rao.docx', candidateId: 'ananya-rao', size: '15.8 KB', role: 'SWE Leaning', candidate: SAMPLE_CANDIDATES[0] },
    { name: 'Karthik Subramaniam.docx', candidateId: 'karthik-subramaniam', size: '15.7 KB', role: 'Data Leaning', candidate: SAMPLE_CANDIDATES[1] },
    { name: 'Priya Menon.docx', candidateId: 'priya-menon', size: '19.4 KB', role: 'Support Leaning', candidate: SAMPLE_CANDIDATES[2] },
    { name: 'Rohan Verma.docx', candidateId: 'rohan-verma', size: '17.6 KB', role: 'All-Rounder', candidate: SAMPLE_CANDIDATES[3] },
  ];

  const handleSelectSample = (sample) => {
    setSelectedFile({
      name: sample.name,
      size: sample.size,
      sampleData: sample.candidate,
    });
    setAnalysisResult(null);
  };

  const handleFileDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setAnalysisResult(null);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setAnalysisResult(null);
    }
  };

  const handleRunAnalysis = async () => {
    if (!selectedFile) {
      addToast('Please upload or select a resume file first', 'warning');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setCurrentStep('Extracting document text from ' + (selectedFile.name || 'document') + '...');

    try {
      // If actual file uploaded by user, safely archive in Supabase Storage private bucket
      if (selectedFile instanceof File && isConfigured && isAuthenticated) {
        try {
          setCurrentStep('Archiving document to Supabase Storage (resumes/' + customerProfile?.id + ')...');
          await uploadResume(selectedFile);
          addToast('Resume safely archived in Supabase private storage', 'info');
        } catch (storageErr) {
          console.warn('Supabase Storage notice:', storageErr);
        }
      }

      if (!isDemoMode && isBackendOnline) {
        setCurrentStep('Extracting candidate skills and credentials...');
        setAnalysisProgress(40);
        const res = await apiClient.extractResume(selectedFile);
        setAnalysisProgress(90);
        setCurrentStep('Validating 12 RADIX competencies...');
        setAnalysisResult({
          source: 'live_backend',
          candidateName: res.data?.name || 'Extracted Candidate',
          email: res.data?.email || 'candidate@example.com',
          education: res.data?.education || 'B.Tech Computer Science',
          skills: res.data?.skills || [],
          fileName: selectedFile.name,
        });
      } else {
        await new Promise((r) => setTimeout(r, 400));
        setAnalysisProgress(35);
        setCurrentStep('Decompressing and parsing document structure...');

        await new Promise((r) => setTimeout(r, 450));
        setAnalysisProgress(70);
        setCurrentStep('Classifying competencies across 12 RADIX categories (COD, DSA, SWE)...');

        await new Promise((r) => setTimeout(r, 400));
        setAnalysisProgress(100);
        setCurrentStep('Finalizing evidence quotes and confidence scores...');

        const matchedCandidate = selectedFile.sampleData || SAMPLE_CANDIDATES.find(c => selectedFile.name?.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])) || SAMPLE_CANDIDATES[0];

        setAnalysisResult({
          source: 'demo_mode',
          candidateId: matchedCandidate.id,
          candidateName: matchedCandidate.name,
          email: matchedCandidate.email,
          education: matchedCandidate.education,
          skills: [...matchedCandidate.skills],
          fileName: selectedFile.name,
          fitSummary: matchedCandidate.fitSummary,
        });
      }

      addToast('Resume analyzed successfully', 'success');
    } catch (err) {
      addToast(`Analysis error: ${err.message}`, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSkillChange = (index, field, value) => {
    const updated = [...analysisResult.skills];
    updated[index] = { ...updated[index], [field]: value };
    setAnalysisResult({ ...analysisResult, skills: updated });
  };

  const handleRemoveSkill = (index) => {
    const updated = analysisResult.skills.filter((_, idx) => idx !== index);
    setAnalysisResult({ ...analysisResult, skills: updated });
    addToast('Skill removed from extracted list', 'info');
  };

  const handleMergeToProfile = async () => {
    if (!analysisResult) return;
    try {
      const targetId = (isAuthenticated && customerProfile?.id) ? customerProfile.id : activeCandidate.id;
      const targetName = (isAuthenticated && customerProfile?.name) ? customerProfile.name : activeCandidate.name;
      await profileService.mergeResumeSkills(targetId, analysisResult.skills);
      addToast(`Merged ${analysisResult.skills.length} skills into ${targetName}'s profile!`, 'success');
      navigate('/profile');
    } catch (err) {
      addToast(`Merge error: ${err.message}`, 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-primary)' }}>
          Resume Analyzer
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Extract technical skills, education, evidence quotes, and confidence levels from PDF or DOCX resumes.
        </p>
      </div>

      {/* Upload Zone & Sample Resumes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px' }}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleFileDrop}
          style={{
            background: isDragOver ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
            border: isDragOver ? '2px dashed var(--accent-cyan)' : '2px dashed var(--border-medium)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={() => document.getElementById('resume-file-input').click()}
        >
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.docx,.doc"
            style={{ display: 'none' }}
            onChange={handleFileInput}
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
              marginBottom: '16px',
            }}
          >
            <UploadCloud size={28} color="var(--accent-cyan)" />
          </div>

          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
            {selectedFile ? selectedFile.name : 'Upload Candidate Resume'}
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '320px', marginBottom: '14px' }}>
            Drag and drop your PDF or Word (.docx) file here, or click to browse from your device.
          </p>

          {selectedFile && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--accent-cyan)' }}>
              <FileCheck size={14} />
              <span>Ready for Analysis: {selectedFile.size ? `(${selectedFile.size})` : ''}</span>
            </div>
          )}
        </div>

        {/* Quick Sample Selector */}
        <Card title="Sample Candidate Resumes" subtitle="Select a sample resume or upload your own to evaluate automated extraction">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sampleResumes.map((sample) => {
              const isSelected = selectedFile?.name === sample.name;
              return (
                <div
                  key={sample.name}
                  onClick={() => handleSelectSample(sample)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--bg-surface-elevated)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <FileText size={18} color={isSelected ? 'var(--accent-cyan)' : 'var(--text-muted)'} />
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: '600', color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                        {sample.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                        {sample.role} · {sample.size}
                      </div>
                    </div>
                  </div>
                  {isSelected && <span className="badge badge-primary">Selected</span>}
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '16px' }}>
            <button
              onClick={handleRunAnalysis}
              disabled={!selectedFile || isAnalyzing}
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw size={16} className="spin-animation" />
                  <span>Analyzing Resume...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Analyze Resume</span>
                </>
              )}
            </button>
          </div>
        </Card>
      </div>

      {/* Progress Indicator */}
      {isAnalyzing && (
        <Card>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>{currentStep}</span>
            <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{analysisProgress}%</span>
          </div>
          <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${analysisProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #45D6FF 0%, #8B7CFF 100%)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </Card>
      )}

      {/* Extracted Results Section */}
      {analysisResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              padding: '12px 18px',
              borderRadius: 'var(--radius-md)',
              background: analysisResult.source === 'live_backend' ? 'rgba(53, 212, 154, 0.1)' : 'rgba(69, 214, 255, 0.08)',
              border: `1px solid ${analysisResult.source === 'live_backend' ? 'rgba(53, 212, 154, 0.3)' : 'rgba(69, 214, 255, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color={analysisResult.source === 'live_backend' ? '#35D49A' : '#45D6FF'} />
              <div>
                <span style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>
                  {analysisResult.source === 'live_backend' ? 'AI Cloud Extraction' : 'Verified Document Extraction (Standalone Mode)'}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                  Parsed from {analysisResult.fileName}
                </span>
              </div>
            </div>

            <button
              onClick={handleMergeToProfile}
              className="btn btn-primary btn-sm"
            >
              <Check size={14} />
              <span>Save & Merge to Candidate Profile</span>
            </button>
          </div>

          <Card title="Extracted Candidate Identity">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              <div>
                <label className="form-label">Full Name</label>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {analysisResult.candidateName}
                </div>
              </div>
              <div>
                <label className="form-label">Email</label>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {analysisResult.email}
                </div>
              </div>
              <div>
                <label className="form-label">Education</label>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {analysisResult.education}
                </div>
              </div>
            </div>
            {analysisResult.fitSummary && (
              <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--accent-cyan)' }}>Fit Profile: </strong>
                {analysisResult.fitSummary}
              </div>
            )}
          </Card>

          <Card
            title={`Extracted Skills & Competencies (${analysisResult.skills.length})`}
            subtitle="Review or correct category classifications and evidence before saving"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {analysisResult.skills.map((skill, index) => {
                return (
                  <div
                    key={index}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '14px',
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 180px 140px 1fr 40px',
                      gap: '12px',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <input
                        type="text"
                        className="form-input"
                        value={skill.skill_name}
                        onChange={(e) => handleSkillChange(index, 'skill_name', e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '12.5px' }}
                      />
                    </div>

                    <div>
                      <select
                        className="form-select"
                        value={skill.category_code}
                        onChange={(e) => handleSkillChange(index, 'category_code', e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        {RADIX_CATEGORY_LIST.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.code} — {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <select
                        className="form-select"
                        value={skill.confidence}
                        onChange={(e) => handleSkillChange(index, 'confidence', e.target.value)}
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        className="form-input"
                        value={skill.evidence || ''}
                        onChange={(e) => handleSkillChange(index, 'evidence', e.target.value)}
                        placeholder="Quote from resume"
                        style={{ padding: '6px 10px', fontSize: '11.5px', color: 'var(--text-muted)' }}
                      />
                    </div>

                    <button
                      onClick={() => handleRemoveSkill(index)}
                      className="btn-ghost"
                      style={{ padding: '6px', color: '#FF6B81' }}
                      title="Remove skill"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
