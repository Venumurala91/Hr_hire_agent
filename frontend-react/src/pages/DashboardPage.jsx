import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KpiCard } from '../components/KpiCard';
import { Modal } from '../components/Modal';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

export function DashboardPage({ refreshTrigger, apiFetch, formatDate, showToast }) {
    const [stats, setStats] = useState({ active_jobs: 0, total_candidates_shortlisted: 0, candidates_interviewing: 0, offers_extended: 0 });
    const [allJobs, setAllJobs] = useState([]);
    const [filteredJobs, setFilteredJobs] = useState([]);
    const [chartData, setChartData] = useState({ labels: [], datasets: [] });
    const [selectedJobIds, setSelectedJobIds] = useState(new Set());
    const [jobSearchTerm, setJobSearchTerm] = useState('');
    
    const [actionMenu, setActionMenu] = useState({ visible: false, x: 0, y: 0, jobId: null });
    const [viewJobModal, setViewJobModal] = useState({ isOpen: false, job: null, isEditing: false });
    
    const selectAllCheckboxRef = useRef();

    const fetchDashboardData = useCallback(async () => {
        try {
            const [statsData, jobsData, distributionData] = await Promise.all([
                apiFetch('/api/dashboard/stats'),
                apiFetch('/api/jobs'),
                apiFetch('/api/candidates/distribution')
            ]);
            setStats(statsData);
            setAllJobs(jobsData);
            setFilteredJobs(jobsData); 
            const colors = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'];
            setChartData({
                labels: distributionData.labels,
                datasets: [{ data: distributionData.data, backgroundColor: colors, borderColor: '#FFFFFF', borderWidth: 2 }]
            });
        } catch (error) { console.error("Failed to load dashboard data"); }
    }, [apiFetch]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData, refreshTrigger]);

    useEffect(() => {
        const filtered = allJobs.filter(job => job.title.toLowerCase().includes(jobSearchTerm.toLowerCase()));
        setFilteredJobs(filtered);
    }, [jobSearchTerm, allJobs]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (actionMenu.visible && !e.target.closest('.action-dropdown')) {
                setActionMenu({ visible: false });
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [actionMenu.visible]);
    
    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const allVisibleIds = new Set(filteredJobs.map(j => j.id));
            const selectedVisibleCount = [...selectedJobIds].filter(id => allVisibleIds.has(id)).length;
            selectAllCheckboxRef.current.checked = allVisibleIds.size > 0 && selectedVisibleCount === allVisibleIds.size;
            selectAllCheckboxRef.current.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < allVisibleIds.size;
        }
    }, [selectedJobIds, filteredJobs]);

    const handleSelectJob = (jobId) => {
        setSelectedJobIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(jobId)) newSet.delete(jobId);
            else newSet.add(jobId);
            return newSet;
        });
    };

    const handleSelectAllJobs = (e) => {
        const visibleJobIds = filteredJobs.map(j => j.id);
        if (e.target.checked) {
            setSelectedJobIds(prev => new Set([...prev, ...visibleJobIds]));
        } else {
            setSelectedJobIds(prev => {
                const newSet = new Set(prev);
                visibleJobIds.forEach(id => newSet.delete(id));
                return newSet;
            });
        }
    };
    
    const handleDeleteSelectedJobs = async () => {
        if (selectedJobIds.size === 0) return;
        if (window.confirm(`Are you sure you want to delete ${selectedJobIds.size} job(s)?`)) {
            try {
                await apiFetch('/api/jobs/bulk', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ job_ids: [...selectedJobIds] })
                });
                setSelectedJobIds(new Set());
                fetchDashboardData();
            } catch (error) {}
        }
    };
    
    const openActionMenu = (e, jobId) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        setActionMenu({ visible: true, x: rect.right, y: rect.bottom + window.scrollY, jobId });
    };

    // =================================================================
    // === THIS IS THE CRITICAL FIX ====================================
    // =================================================================
    const handleJobAction = async (action) => {
        const { jobId } = actionMenu;
        setActionMenu({ visible: false });

        if (action === 'view') {
            try {
                // 1. Fetch the FULL job details, including the description
                const fullJobData = await apiFetch(`/api/jobs/${jobId}`);
                // 2. Set this full data and open the modal
                setViewJobModal({ isOpen: true, job: fullJobData, isEditing: false });
            } catch (error) {
                showToast("Could not load job details.", "error");
            }
        } else if (action === 'delete') {
            if (window.confirm('Are you sure you want to delete this job?')) {
                try {
                    await apiFetch('/api/jobs/bulk', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ job_ids: [jobId] })
                    });
                    fetchDashboardData();
                } catch (error) {}
            }
        }
    };

    const handleUpdateJob = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const updatedData = {
            title: formData.get('title'),
            description_text: formData.get('description_text')
        };
        try {
            await apiFetch(`/api/jobs/${viewJobModal.job.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedData)
            });
            setViewJobModal({ isOpen: false, job: null, isEditing: false });
            fetchDashboardData();
        } catch(error) {}
    };

    return (
        <div id="dashboard-view">
            <section className="kpi-cards">
                <KpiCard title="Active Jobs" value={stats.active_jobs} color="blue" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>} />
                <KpiCard title="Total Candidates" value={stats.total_candidates_shortlisted} color="green" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>} />
                <KpiCard title="In Process" value={stats.candidates_interviewing} color="orange" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
                <KpiCard title="Offers Extended" value={stats.offers_extended} color="purple" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>} />
            </section>
            <div className="dashboard-grid">
                <section className="jobs-list-section card">
                    <div className="card-header jobs-list-header">
                        <h2>Active Job Postings</h2>
                        <div className="job-actions-bar">
                            <div className="search-bar small">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                                <input type="text" placeholder="Search jobs..." value={jobSearchTerm} onChange={e => setJobSearchTerm(e.target.value)} />
                            </div>
                            {selectedJobIds.size > 0 && <button className="btn btn-danger" onClick={handleDeleteSelectedJobs}>Delete ({selectedJobIds.size})</button>}
                            <button className="btn btn-tertiary" onClick={() => { showToast("Refreshing data..."); fetchDashboardData(); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                            </button>
                        </div>
                    </div>
                    <div className="jobs-table-container">
                        <table id="jobsTable">
                            <thead><tr>
                                <th style={{width: "40px"}}><input type="checkbox" ref={selectAllCheckboxRef} onChange={handleSelectAllJobs} /></th>
                                <th>Job Title</th>
                                <th className="text-center">Candidates</th>
                                <th>Status</th>
                                <th>Date Posted</th>
                                <th className="text-center">Actions</th>
                            </tr></thead>
                            <tbody>
                                {filteredJobs.length > 0 ? filteredJobs.map(job => (
                                    <tr key={job.id} className={selectedJobIds.has(job.id) ? 'selected' : ''} onClick={() => handleSelectJob(job.id)}>
                                        <td><input type="checkbox" checked={selectedJobIds.has(job.id)} readOnly /></td>
                                        <td><div className="job-title">{job.title}</div></td>
                                        <td className="text-center">{job.candidate_count}</td>
                                        <td className="text-center"><span className="status-pill status-active">Active</span></td>
                                        <td>{formatDate(job.created_at)}</td>
                                        <td className="text-center">
                                            <button className="action-btn" onClick={(e) => openActionMenu(e, job.id)}>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                                            </button>
                                        </td>
                                    </tr>
                                )) : <tr><td colSpan="6" className="placeholder-row">No active jobs found.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </section>
                <section className="status-distribution-section card">
                    <div className="card-header"><h2>Candidate Status Distribution</h2></div>
                    <div className="chart-container">
                        {chartData.labels.length > 0 && <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }}, cutout: '60%' }} />}
                    </div>
                </section>
            </div>

            {actionMenu.visible && (
                <div className="action-dropdown" style={{ top: actionMenu.y, left: actionMenu.x - 180 }}>
                    <ul>
                        <li><button onClick={() => handleJobAction('view')}>View Details</button></li>
                        <li className="separator"></li>
                        <li><button className="delete-action" onClick={() => handleJobAction('delete')}>Delete Job</button></li>
                    </ul>
                </div>
            )}

            <Modal isOpen={viewJobModal.isOpen} onClose={() => setViewJobModal({ isOpen: false, job: null, isEditing: false })}>
                <div className="modal-header">
                    <h2>{viewJobModal.isEditing ? 'Edit Job' : 'Job Details'}</h2>
                    <button className="close-btn" onClick={() => setViewJobModal({ isOpen: false, job: null, isEditing: false })}>&times;</button>
                </div>
                <form onSubmit={handleUpdateJob}>
                    <div className="form-group">
                        <label>Job Title</label>
                        <input name="title" type="text" defaultValue={viewJobModal.job?.title} readOnly={!viewJobModal.isEditing} className={viewJobModal.isEditing ? 'editable' : ''} required />
                    </div>
                    <div className="form-group">
                        <label>Job Description</label>
                        <textarea name="description_text" rows="12" defaultValue={viewJobModal.job?.description_text} readOnly={!viewJobModal.isEditing} className={viewJobModal.isEditing ? 'editable' : ''} required></textarea>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={() => setViewJobModal({ isOpen: false, job: null, isEditing: false })}>Close</button>
                        {viewJobModal.isEditing ? (
                            <button type="submit" className="btn btn-primary">Save Changes</button>
                        ) : (
                            <button type="button" className="btn btn-secondary" onClick={() => setViewJobModal(prev => ({ ...prev, isEditing: true }))}>Edit</button>
                        )}
                    </div>
                </form>
            </Modal>
        </div>
    );
}