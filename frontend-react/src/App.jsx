import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';

// Component Imports
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';

// Page Imports
import { DashboardPage } from './pages/DashboardPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { MessagesPage } from './pages/MessagesPage';

// =============================================================================
// === API Service & Utilities (Centralized for the whole app) ===============
// =============================================================================

const showToast = (message, type = 'success') => {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
};

const apiFetch = async (endpoint, options = {}) => {
  try {
    const response = await fetch(endpoint, options);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
    }
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        if (options.method && options.method !== 'GET') {
            showToast('Operation successful!', 'success');
        }
        return null;
    }
    const data = await response.json();
    if (options.method && options.method !== 'GET' && data.message) {
        showToast(data.message, 'success');
    }
    return data;
  } catch (error) {
    console.error(`API Fetch Error (${endpoint}):`, error);
    showToast(error.message, 'error');
    throw error;
  }
};

const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const PIPELINE_STAGES = ["ATS Shortlisted", "L1 interview scheduled", "L2 interview scheduled", "HR scheduled", "Offer Letter Issued", "Candidate Joined", "Resume declined"];
const STATUS_OPTIONS = [ "ATS Shortlisted", "L1 interview scheduled", "L1 Selected", "L1 Rejected", "L2 interview scheduled", "L2 Selected", "L2 Rejected", "HR scheduled", "HR Round Selected", "HR Round Rejected", "Offer Letter Issued", "Offer Accepted", "Offer Rejected", "Candidate Joined", "Candidate Not Joined", "Resume declined" ];
const MESSAGE_TEMPLATES = {
    "ATS Shortlisted": { subject: "Update on your application for {job_title}", body: "Hi {candidate_name},\n\nGreat news! Your application for the {job_title} position has been shortlisted. Our HR team is reviewing it and will be in touch shortly to schedule the next round of interviews if your profile is a match.\n\nBest regards,\nThe Hiring Team" },
    "L1 interview scheduled": { subject: "Invitation to Interview for the {job_title} role", body: "Hi {candidate_name},\n\nCongratulations! We would like to invite you for the first technical interview (L1) for the {job_title} position.\n\nOur HR team will contact you shortly via a separate email to coordinate a suitable time. We look forward to speaking with you.\n\nBest regards,\nThe Hiring Team" },
    "L1 Selected": { subject: "Update on your {job_title} Interview Process", body: "Hi {candidate_name},\n\nGreat news! You have successfully cleared the L1 interview for the {job_title} position. We were impressed with your skills and will be in touch soon to schedule the next round.\n\nBest regards,\nThe Hiring Team" },
    "L1 Rejected": { subject: "Update on your application for {job_title}", body: "Hi {candidate_name},\n\nThank you for your time during the L1 interview for the {job_title} role. After careful consideration, we have decided not to proceed with your application at this time. We wish you the best in your search.\n\nBest regards,\nThe Hiring Team" },
    "Offer Letter Issued": { subject: "Job Offer for the {job_title} Position!", body: "Hi {candidate_name},\n\nCongratulations! We are thrilled to formally offer you the position of {job_title}. An official offer letter has been sent to your email with all the details.\n\nWe look forward to you joining us!\n\nBest regards,\nThe Hiring Team" },
};

// =============================================================================
// === Main App Component (The Conductor) ======================================
// =============================================================================

function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [isCreateJobModalOpen, setCreateJobModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
  const [jobsForModal, setJobsForModal] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // NEW: State to track selected file count for the upload modal
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const appUtils = useMemo(() => ({
      apiFetch, formatDate, showToast, STATUS_OPTIONS, PIPELINE_STAGES, MESSAGE_TEMPLATES
  }), []);

  useEffect(() => {
    if (isBulkUploadModalOpen) {
      apiFetch('/api/jobs').then(setJobsForModal).catch(() => setJobsForModal([]));
    }
  }, [isBulkUploadModalOpen]);

  const renderPage = () => {
    const props = { ...appUtils, refreshTrigger, globalSearchTerm: debouncedSearchTerm, activePageProp: activePage, setActivePage };
    const pageKey = activePage.split('?')[0];
    switch (pageKey) {
        case 'dashboard': return <DashboardPage {...props} />;
        case 'candidates': return <CandidatesPage {...props} />;
        case 'messages': return <MessagesPage {...props} />;
        default: return <DashboardPage {...props} />;
    }
  };

  const handleCreateJob = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const jobData = { title: formData.get('title'), description_text: `Location: ${formData.get('location')}\nSalary: ${formData.get('salary')}\n\nDescription:\n${formData.get('description_text')}\n\nRequirements:\n${formData.get('requirements')}` };
    try {
        await apiFetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jobData) });
        setCreateJobModalOpen(false);
        setRefreshTrigger(t => t + 1);
    } catch (error) {}
  };
  
  // MODIFIED: Corrected validation logic
  const handleBulkUpload = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    if (!formData.get('job_description_id') || fileCount === 0) {
        return showToast('Please select a job and at least one resume file.', 'error');
    }
    apiFetch('/api/candidates/bulk_process', { method: 'POST', body: formData });
    setBulkUploadModalOpen(false);
    setActivePage('candidates?uploading=true');
  };
  
  // NEW: Handler to open the modal and reset the file count
  const openBulkUploadModal = () => {
      setFileCount(0); // Reset count when opening
      setBulkUploadModalOpen(true);
  };

  return (
    <div className="app-container">
      <Sidebar activePage={activePage.split('?')[0]} setActivePage={setActivePage} />
      <main className="main-content">
        <header className="main-header">
          <h1>{activePage.split('?')[0].charAt(0).toUpperCase() + activePage.split('?')[0].slice(1)}</h1>
          <div className="header-actions">
            <div className="search-bar">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input type="text" placeholder="Search candidates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            {/* MODIFIED: Use the new handler */}
            <button className="btn btn-secondary" onClick={openBulkUploadModal}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                Bulk Upload
            </button>
            <button className="btn btn-primary" onClick={() => setCreateJobModalOpen(true)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Create Job
            </button>
          </div>
        </header>
        {renderPage()}
      </main>

      <Modal isOpen={isCreateJobModalOpen} onClose={() => setCreateJobModalOpen(false)}>
        <div className="modal-header"><h2>Create New Job Posting</h2><button className="close-btn" onClick={() => setCreateJobModalOpen(false)}>&times;</button></div>
        <form onSubmit={handleCreateJob}>
            <div className="form-grid"><div className="form-group"><label>Job Title *</label><input name="title" placeholder="e.g., Senior Frontend Developer" required/></div><div className="form-group"><label>Location *</label><input name="location" placeholder="e.g., Remote, New York, NY" required/></div></div>
            <div className="form-group"><label>Salary Range</label><input name="salary" placeholder="e.g., $80,000 - $120,000"/></div>
            <div className="form-group"><label>Job Description *</label><textarea name="description_text" rows="5" placeholder="Describe the role, responsibilities..." required></textarea></div>
            <div className="form-group"><label>Requirements & Qualifications</label><textarea name="requirements" rows="5" placeholder="List the required skills..."></textarea></div>
            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setCreateJobModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary">Create Job</button></div>
        </form>
      </Modal>
      
      {/* =================================================================== */}
      {/* === THIS ENTIRE MODAL IS THE FIX ================================== */}
      {/* =================================================================== */}
      <Modal isOpen={isBulkUploadModalOpen} onClose={() => setBulkUploadModalOpen(false)}>
        <div className="modal-header"><h2>Bulk Upload Resumes</h2><button className="close-btn" onClick={() => setBulkUploadModalOpen(false)}>&times;</button></div>
        <form onSubmit={handleBulkUpload}>
            <div className="form-group"><label>Select Job Posting *</label><select name="job_description_id" required defaultValue=""><option value="" disabled>-- Please select a job --</option>{jobsForModal.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
            <div className="form-group"><label>ATS Shortlist Threshold (%)</label><input type="number" name="ats_threshold" min="0" max="100" defaultValue="70" required/><p className="form-hint">Only candidates with ATS scores above this threshold will be shortlisted.</p></div>
            
            {/* MODIFIED: Replicated original HTML structure and added onChange handler */}
            <div className="form-group">
                <label htmlFor="resumeFiles" className="file-upload-label">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <span>Drop resume files here</span>
                    <p>or click to browse</p>
                </label>
                <input 
                    type="file" 
                    id="resumeFiles" 
                    name="resumes" 
                    multiple 
                    required 
                    accept=".pdf,.doc,.docx,.txt"
                    style={{ display: 'none' }} // Visually hide the input
                    onChange={(e) => setFileCount(e.target.files.length)} // Update state on change
                />
                {/* NEW: Conditional rendering for file count */}
                <p className="file-info" style={{ textAlign: 'center', marginTop: '16px' }}>
                    {fileCount > 0 ? `${fileCount} file(s) selected` : 'Supported formats: PDF, DOC, DOCX, TXT'}
                </p>
            </div>

            <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setBulkUploadModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary">Start Upload & Processing</button></div>
        </form>
      </Modal>

    </div>
  );
}

export default App;