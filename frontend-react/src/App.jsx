import React, { useState, useEffect, useMemo, useRef, forwardRef } from 'react';

// Component Imports
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';

// Page Imports
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { MessagesPage } from './pages/MessagesPage';
import { CandidateDetailPage } from './pages/CandidateDetailPage';
import { AdminPage } from './pages/AdminPage'; // New User Management page

// UTILITIES
const showToast = (message, type = 'success') => { let toastContainer = document.getElementById('toast-container'); if (!toastContainer) { toastContainer = document.createElement('div'); toastContainer.id = 'toast-container'; document.body.appendChild(toastContainer); } const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.textContent = message; toastContainer.appendChild(toast); setTimeout(() => toast.remove(), 4000); };
const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const MESSAGE_TEMPLATES = { "ATS Shortlisted": { subject: "Update on your application for {job_title}", body: "Hi {candidate_name},\n\nGreat news! Your application for the {job_title} position has been shortlisted for further review. Our team will be in touch if your profile is selected for an interview.\n\nBest regards,\nThe Hiring Team" }, "L1 interview scheduled": { subject: "Invitation to Interview for the {job_title} role", body: "Hi {candidate_name},\n\nCongratulations! We would like to invite you for the first technical interview (L1) for the {job_title} position.\n\nOur HR team will contact you shortly via a separate email to coordinate a suitable time. We look forward to speaking with you.\n\nBest regards,\nThe Hiring Team" }, "L1 Selected": { subject: "Update on your {job_title} Interview Process", body: "Hi {candidate_name},\n\nGreat news! You have successfully cleared the L1 interview for the {job_title} position. We were impressed with your skills and will be in touch soon to schedule the next round.\n\nBest regards,\nThe Hiring Team" }, "L2 interview scheduled": { subject: "Invitation to Second Interview for {job_title}", body: "Hi {candidate_name},\n\nFollowing your successful L1 interview, we would like to invite you for the second technical interview (L2). Our team will be in touch shortly to schedule a time.\n\nWell done, and we look forward to speaking with you again.\n\nBest regards,\nThe Hiring Team" }, "Offer Letter Issued": { subject: "Job Offer for the {job_title} Position!", body: "Hi {candidate_name},\n\nCongratulations! We are thrilled to formally offer you the position of {job_title}. An official offer letter has been sent to your email with all the details.\n\nWe look forward to you joining us!\n\nBest regards,\nThe Hiring Team" }, "Offer Accepted": { subject: "Welcome to the Team!", body: "Hi {candidate_name},\n\nWe are delighted that you have accepted our offer for the {job_title} position. Welcome aboard! Our HR team will be in touch soon to guide you through the onboarding process.\n\nWe are excited to have you join us.\n\nBest regards,\nThe Hiring Team" } };
const Button = forwardRef(({ variant = 'primary', children, ...props }, ref) => { const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"; const variants = { primary: "bg-primary text-white hover:bg-primary-dark", secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50", danger: "bg-red-600 text-white hover:bg-red-700", }; return (<button ref={ref} className={`${baseClasses} ${variants[variant]}`} {...props}>{children}</button>); });

// NEW: apiFetch that handles cookies automatically. `credentials: 'include'` is the key.
const apiFetch = async (endpoint, options = {}) => {
    const newOptions = { ...options, credentials: 'include' };
    try {
        const response = await fetch(endpoint, newOptions);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
            throw new Error(errorData.message);
        }
        if (response.status === 204 || response.headers.get("content-length") === "0") {
            if (options.method && options.method !== 'GET') { showToast('Operation successful!', 'success'); }
            return null;
        }
        const data = await response.json();
        if (options.method && options.method !== 'GET' && data.message) { showToast(data.message, 'success'); }
        return data;
    } catch (error) {
        console.error(`API Fetch Error (${endpoint}):`, error);
        showToast(error.message, 'error');
        throw error;
    }
};

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const userProfile = await apiFetch('/api/auth/profile');
                setCurrentUser(userProfile);
                setIsLoggedIn(true);
            } catch (error) {
                setIsLoggedIn(false);
                setCurrentUser(null);
            } finally {
                setAuthLoading(false);
            }
        };
        checkLoginStatus();
    }, []);

    const handleLoginSuccess = (userData) => {
        setCurrentUser(userData);
        setIsLoggedIn(true);
    };

    const handleLogout = async () => {
        try {
            await apiFetch('/api/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error("Logout API call failed, but logging out on client.", error);
        } finally {
            setIsLoggedIn(false);
            setCurrentUser(null);
        }
    };

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500">Authenticating...</div>;
    }

    if (!isLoggedIn) {
        return <LoginPage onLoginSuccess={handleLoginSuccess} apiFetch={apiFetch} />;
    }

    return <AppContent onLogout={handleLogout} currentUser={currentUser} />;
}

function AppContent({ onLogout, currentUser }) {
    const [activePage, setActivePage] = useState('dashboard');
    const [isCreateJobModalOpen, setCreateJobModalOpen] = useState(false);
    const [isBulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);
    const [jobsForModal, setJobsForModal] = useState([]);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [fileCount, setFileCount] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusConfig, setStatusConfig] = useState(null);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);
    const [filters, setFilters] = useState({ job_id: '', status: '' });
    const [isFilterOpen, setFilterOpen] = useState(false);
    const filterButtonRef = useRef(null);
    const filterPanelRef = useRef(null);

    useEffect(() => { apiFetch('/api/config/statuses').then(config => { setStatusConfig(config); setIsLoadingConfig(false); }).catch(err => { setIsLoadingConfig(false); }); }, []);
    useEffect(() => { const timerId = setTimeout(() => { setDebouncedSearchTerm(searchTerm); }, 500); return () => clearTimeout(timerId); }, [searchTerm]);
    const appUtils = useMemo(() => ({ apiFetch, formatDate, showToast, MESSAGE_TEMPLATES, statusConfig }), [statusConfig]);
    useEffect(() => { if (isBulkUploadModalOpen || isFilterOpen) { apiFetch('/api/jobs').then(setJobsForModal).catch(() => setJobsForModal([])); } }, [isBulkUploadModalOpen, isFilterOpen]);
    const pageKey = activePage.split('/')[0];
    const isDetailPage = activePage.startsWith('candidates/');
    useEffect(() => { const handleOutsideClick = (e) => { if (isFilterOpen && !filterButtonRef.current?.contains(e.target) && !filterPanelRef.current?.contains(e.target)) { setFilterOpen(false); } }; document.addEventListener('click', handleOutsideClick); return () => document.removeEventListener('click', handleOutsideClick); }, [isFilterOpen]);
    
    const handleFilterChange = (e) => { setFilters(prev => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleClearFilters = () => { setFilters({ job_id: '', status: '' }); setFilterOpen(false); };
    
    const handleCreateJob = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const jobData = { title: formData.get('title'), location: formData.get('location'), salary_range: formData.get('salary_range'), description_text: formData.get('description_text') };
        try {
            await apiFetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(jobData) });
            setCreateJobModalOpen(false);
            setRefreshTrigger(t => t + 1);
        } catch (error) {}
    };
    
    const handleBulkUpload = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        if (!formData.get('job_description_id') || fileCount === 0) { return showToast('Please select a job and at least one resume file.', 'error'); }
        setIsProcessing(true);
        try {
            const summary = await apiFetch('/api/candidates/bulk_process', { method: 'POST', body: formData });
            setBulkUploadModalOpen(false); setActivePage('candidates'); setRefreshTrigger(t => t + 1);
            if (summary) { showToast(`Processing complete. Shortlisted: ${summary.shortlisted}, Rejected: ${summary.rejected}, Failed: ${summary.failed}.`, 'success'); }
        } catch (error) { /* Handled by apiFetch */ } 
        finally { setIsProcessing(false); }
    };
    
    return (
        <div className="flex bg-slate-50 min-h-screen">
            <Sidebar activePage={pageKey} setActivePage={setActivePage} onLogout={onLogout} />
            <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen flex flex-col">
                {(() => {
                    if (isLoadingConfig) { return <div className="p-8 text-center">Loading Configuration...</div>; }
                    
                    const props = { ...appUtils, refreshTrigger, globalSearchTerm: debouncedSearchTerm, setActivePage, filters, setFilters };

                    if (isDetailPage && activePage.split('/').length > 1) {
                        const candidateId = parseInt(activePage.split('/')[1], 10);
                        return <CandidateDetailPage candidateId={candidateId} {...props} />;
                    }

                    return <>
                        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 shrink-0">
                          <h1 className="text-3xl font-bold text-slate-800">
                            { (pageKey === 'admin') ? 'User Management' : pageKey.charAt(0).toUpperCase() + pageKey.slice(1) }
                          </h1>
                          <div className="flex items-center gap-3">
                                {pageKey === 'candidates' && (<>
                                    <div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><input type="text" placeholder="Search candidates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-64 pl-10 pr-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" /></div>
                                    <div className="relative">
                                        <Button variant="secondary" ref={filterButtonRef} onClick={() => setFilterOpen(!isFilterOpen)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg><span>Filter</span></Button>
                                        {isFilterOpen && (<div ref={filterPanelRef} className="absolute top-full right-0 mt-2 w-72 bg-white rounded-lg border border-slate-200 shadow-lg z-20 p-4 space-y-4"><div><label className="text-sm font-medium text-slate-600 mb-1 block">Filter by Job Posting</label><select name="job_id" value={filters.job_id} onChange={handleFilterChange} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"><option value="">All Jobs</option>{jobsForModal.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div><div><label className="text-sm font-medium text-slate-600 mb-1 block">Filter by Status</label><select name="status" value={filters.status} onChange={handleFilterChange} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"><option value="">All Statuses</option>{statusConfig?.all_status_options.map(o => <option key={o} value={o}>{o}</option>)}</select></div><div className="flex justify-end pt-2"><button onClick={handleClearFilters} className="text-sm font-semibold text-primary hover:underline">Clear Filters</button></div></div>)}
                                    </div>
                                </>)}
                                <Button variant="secondary" onClick={() => { setFileCount(0); setBulkUploadModalOpen(true); }}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg><span>Bulk Upload</span></Button>
                                <Button onClick={() => setCreateJobModalOpen(true)}><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg><span>Create Job</span></Button>
                            </div>
                        </header>
                        <div className="flex-1 min-h-0">
                            { pageKey === 'dashboard' ? <DashboardPage {...props} /> :
                              pageKey === 'candidates' ? <CandidatesPage {...props} /> :
                              pageKey === 'messages' ? <MessagesPage {...props} /> :
                              pageKey === 'admin' ? <AdminPage {...props} /> :
                              <DashboardPage {...props} />
                            }
                        </div>
                    </>
                })()}
            </main>
            
            <Modal isOpen={isCreateJobModalOpen} onClose={() => setCreateJobModalOpen(false)} size="large">
                <div className="p-6"><div className="flex justify-between items-start"><h2 className="text-xl font-bold text-slate-800">Create New Job Posting</h2><button onClick={() => setCreateJobModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button></div><form onSubmit={handleCreateJob} className="mt-6 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-sm font-medium text-slate-600 mb-1 block">Job Title *</label><input name="title" placeholder="e.g., Senior Frontend Developer" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" /></div><div><label className="text-sm font-medium text-slate-600 mb-1 block">Location *</label><input name="location" placeholder="e.g., Remote, New York, NY" required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" /></div></div><div><label className="text-sm font-medium text-slate-600 mb-1 block">Salary Range</label><input name="salary_range" placeholder="e.g., $80,000 - $120,000" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" /></div><div><label className="text-sm font-medium text-slate-600 mb-1 block">Job Description *</label><textarea name="description_text" rows="8" placeholder="Describe the role, responsibilities..." required className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"></textarea></div><div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-200"><Button type="button" variant="secondary" onClick={() => setCreateJobModalOpen(false)}>Cancel</Button><Button type="submit">Create Job</Button></div></form></div>
            </Modal>
            <Modal isOpen={isBulkUploadModalOpen} onClose={() => !isProcessing && setBulkUploadModalOpen(false)}>
                <div className="p-6"><div className="flex justify-between items-start"><h2 className="text-xl font-bold text-slate-800">Bulk Upload Resumes</h2><button disabled={isProcessing} onClick={() => setBulkUploadModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button></div><form onSubmit={handleBulkUpload} className="mt-6 space-y-4">{isProcessing && (<div className="text-center p-4"><h3 className="font-semibold text-slate-700 mb-3">Processing Resumes... Please wait.</h3><div className="progress-bar animated h-2 bg-slate-200 rounded-full overflow-hidden"><div className="progress-bar-fill h-full rounded-full"></div></div></div>)}<div><label className="text-sm font-medium text-slate-600 mb-1 block">Select Job Posting *</label><select name="job_description_id" required defaultValue="" disabled={isProcessing} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"><option value="" disabled>-- Please select a job --</option>{jobsForModal.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div><div><label className="text-sm font-medium text-slate-600 mb-1 block">ATS Shortlist Threshold (%)</label><input type="number" name="ats_threshold" min="0" max="100" defaultValue="70" required disabled={isProcessing} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" /><p className="text-xs text-slate-500 mt-1">Only candidates with scores above this will be shortlisted.</p></div><div><label htmlFor="resumeFiles" className={`flex flex-col items-center justify-center gap-2 p-8 border-2 border-dashed border-slate-300 rounded-lg transition-colors ${isProcessing ? 'bg-slate-100 cursor-not-allowed' : 'hover:border-primary cursor-pointer'}`}><svg className="w-12 h-12 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg><span className="font-semibold text-slate-700">Drop resume files here or click to browse</span></label><input type="file" id="resumeFiles" name="resumes" multiple required accept=".pdf,.doc,.docx,.txt" className="hidden" disabled={isProcessing} onChange={(e) => setFileCount(e.target.files.length)} /><p className="text-center text-sm text-slate-500 mt-3">{fileCount > 0 ? `${fileCount} file(s) selected` : 'Supported formats: PDF, DOC, DOCX, TXT'}</p></div><div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-200"><Button type="button" variant="secondary" disabled={isProcessing} onClick={() => setBulkUploadModalOpen(false)}>Cancel</Button><Button type="submit" disabled={isProcessing}>{isProcessing ? 'Processing...' : 'Start Upload & Processing'}</Button></div></form></div>
            </Modal>
        </div>
    );
}

export default App;