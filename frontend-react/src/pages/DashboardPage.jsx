import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KpiCard } from '../components/KpiCard';
import { Modal } from '../components/Modal';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

// Reusable Button Component
const Button = ({ variant = 'primary', children, ...props }) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary";
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-dark",
        secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
        danger: "bg-red-600 text-white hover:bg-red-700",
    };
    return <button className={`${baseClasses} ${variants[variant]}`} {...props}>{children}</button>;
};

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
            setStats(statsData); setAllJobs(jobsData); setFilteredJobs(jobsData);
            const colors = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444'];
            setChartData({
                labels: distributionData.labels,
                datasets: [{ data: distributionData.data, backgroundColor: colors, borderColor: '#FFFFFF', borderWidth: 2 }]
            });
        } catch (error) { console.error("Failed to load dashboard data"); }
    }, [apiFetch]);

    useEffect(() => { fetchDashboardData(); }, [fetchDashboardData, refreshTrigger]);
    useEffect(() => { const filtered = allJobs.filter(job => job.title.toLowerCase().includes(jobSearchTerm.toLowerCase())); setFilteredJobs(filtered); }, [jobSearchTerm, allJobs]);
    useEffect(() => {
        const handleOutsideClick = (e) => { if (actionMenu.visible && !e.target.closest('.action-dropdown')) { setActionMenu({ visible: false }); } };
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

    const handleSelectJob = (jobId) => { setSelectedJobIds(prev => { const newSet = new Set(prev); if (newSet.has(jobId)) newSet.delete(jobId); else newSet.add(jobId); return newSet; }); };
    const handleSelectAllJobs = (e) => { const visibleJobIds = filteredJobs.map(j => j.id); if (e.target.checked) { setSelectedJobIds(prev => new Set([...prev, ...visibleJobIds])); } else { setSelectedJobIds(prev => { const newSet = new Set(prev); visibleJobIds.forEach(id => newSet.delete(id)); return newSet; }); } };
    const handleDeleteSelectedJobs = async () => { if (selectedJobIds.size === 0) return; if (window.confirm(`Are you sure you want to delete ${selectedJobIds.size} job(s)?`)) { try { await apiFetch('/api/jobs/bulk', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_ids: [...selectedJobIds] }) }); setSelectedJobIds(new Set()); fetchDashboardData(); } catch (error) {} } };
    const openActionMenu = (e, jobId) => { e.stopPropagation(); const rect = e.target.getBoundingClientRect(); setActionMenu({ visible: true, x: rect.right, y: rect.bottom + window.scrollY, jobId }); };

    const handleJobAction = async (action) => {
        const { jobId } = actionMenu; setActionMenu({ visible: false });
        if (action === 'view') { try { const fullJobData = await apiFetch(`/api/jobs/${jobId}`); setViewJobModal({ isOpen: true, job: fullJobData, isEditing: false }); } catch (error) { showToast("Could not load job details.", "error"); } }
        else if (action === 'delete') { if (window.confirm('Are you sure you want to delete this job?')) { try { await apiFetch('/api/jobs/bulk', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_ids: [jobId] }) }); fetchDashboardData(); } catch (error) {} } }
    };

    const handleUpdateJob = async (e) => {
        e.preventDefault(); const formData = new FormData(e.target);
        const updatedData = { title: formData.get('title'), description_text: formData.get('description_text'), location: formData.get('location'), salary_range: formData.get('salary_range') };
        try { await apiFetch(`/api/jobs/${viewJobModal.job.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedData) }); setViewJobModal({ isOpen: false, job: null, isEditing: false }); fetchDashboardData(); } catch(error) {}
    };

    return (
        <div className="space-y-6">
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard title="Active Jobs" value={stats.active_jobs} color="blue" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>} />
                <KpiCard title="Total Candidates" value={stats.total_candidates_shortlisted} color="green" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><polyline points="16 11 18 13 22 9"></polyline></svg>} />
                <KpiCard title="In Process" value={stats.candidates_interviewing} color="orange" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
                <KpiCard title="Offers Extended" value={stats.offers_extended} color="purple" icon={<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>} />
            </section>
            
            {/* === SCROLL ONLY FOR ACTIVE JOB POSTINGS === */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col max-h-[calc(100vh-280px)]">
                    <div className="p-4 flex justify-between items-center border-b border-slate-200 shrink-0">
                        <h2 className="text-lg font-bold text-slate-800">Active Job Postings</h2>
                        <div className="flex items-center gap-2">
                            <div className="relative"><svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg><input type="text" placeholder="Search jobs..." value={jobSearchTerm} onChange={e => setJobSearchTerm(e.target.value)} className="w-48 pl-9 pr-3 py-1.5 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" /></div>
                            {selectedJobIds.size > 0 && <Button variant="danger" onClick={handleDeleteSelectedJobs}>Delete ({selectedJobIds.size})</Button>}
                            <button onClick={() => { showToast("Refreshing data..."); fetchDashboardData(); }} className="p-2 text-slate-500 hover:bg-slate-100 rounded-md"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></button>
                        </div>
                    </div>

                    {/* THIS IS THE SCROLLABLE AREA (only this scrolls) */}
                    <div className="overflow-y-auto custom-scrollbar">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-xs text-slate-500 uppercase sticky top-0"><tr><th className="px-4 py-3 w-12 text-center"><input type="checkbox" ref={selectAllCheckboxRef} onChange={handleSelectAllJobs} className="rounded border-slate-300 text-primary focus:ring-primary-light" /></th><th className="px-4 py-3">Job Title</th><th className="px-4 py-3 text-center">Candidates</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Date Posted</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
                                <tbody>{filteredJobs.length > 0 ? filteredJobs.map(job => (<tr key={job.id} className={`border-t border-slate-200 ${selectedJobIds.has(job.id) ? 'bg-primary-light' : 'hover:bg-slate-50'}`}><td className="px-4 py-3 text-center"><input type="checkbox" checked={selectedJobIds.has(job.id)} onChange={() => handleSelectJob(job.id)} className="rounded border-slate-300 text-primary focus:ring-primary-light" /></td><td className="px-4 py-3 font-semibold text-slate-700">{job.title}</td><td className="px-4 py-3 text-center text-slate-600">{job.candidate_count}</td><td className="px-4 py-3"><div className="flex justify-center"><span className="px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 bg-green-100 text-green-700"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>Active</span></div></td><td className="px-4 py-3 text-slate-600">{formatDate(job.created_at)}</td><td className="px-4 py-3 text-center"><button onClick={(e) => openActionMenu(e, job.id)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button></td></tr>)) : <tr><td colSpan="6" className="text-center py-16 text-slate-500">No active jobs found.</td></tr>}</tbody>
                            </table>
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div className="p-4 border-b border-slate-200"><h2 className="text-lg font-bold text-slate-800">Candidate Status Distribution</h2></div>
                    <div className="p-4 h-80">{chartData.labels.length > 0 && <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }}, cutout: '65%' }} />}</div>
                </section>
            </div>

            {actionMenu.visible && (<div className="absolute z-10 w-48 bg-white rounded-md shadow-lg border border-slate-200" style={{ top: actionMenu.y, left: actionMenu.x - 180 }}><ul className="p-1"><li><button onClick={() => handleJobAction('view')} className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md">View Details</button></li><li className="my-1 border-t border-slate-200"></li><li><button onClick={() => handleJobAction('delete')} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md">Delete Job</button></li></ul></div>)}
            <Modal isOpen={viewJobModal.isOpen} onClose={() => setViewJobModal({ isOpen: false, job: null, isEditing: false })} size="large"><div className="p-6"><div className="flex justify-between items-start"><h2 className="text-xl font-bold text-slate-800">{viewJobModal.isEditing ? 'Edit Job' : 'Job Details'}</h2><button onClick={() => setViewJobModal({ isOpen: false, job: null, isEditing: false })} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button></div><form onSubmit={handleUpdateJob} className="mt-6 space-y-4"><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="text-sm font-medium text-slate-600 mb-1 block">Job Title</label><input name="title" type="text" defaultValue={viewJobModal.job?.title} readOnly={!viewJobModal.isEditing} required className={`w-full px-3 py-2 border border-slate-300 rounded-md outline-none ${viewJobModal.isEditing ? 'bg-white focus:ring-2 focus:ring-primary-light focus:border-primary' : 'bg-slate-50'}`} /></div><div><label className="text-sm font-medium text-slate-600 mb-1 block">Location</label><input name="location" type="text" defaultValue={viewJobModal.job?.location} readOnly={!viewJobModal.isEditing} required className={`w-full px-3 py-2 border border-slate-300 rounded-md outline-none ${viewJobModal.isEditing ? 'bg-white focus:ring-2 focus:ring-primary-light focus:border-primary' : 'bg-slate-50'}`} /></div></div><div><label className="text-sm font-medium text-slate-600 mb-1 block">Salary Range</label><input name="salary_range" type="text" defaultValue={viewJobModal.job?.salary_range} readOnly={!viewJobModal.isEditing} className={`w-full px-3 py-2 border border-slate-300 rounded-md outline-none ${viewJobModal.isEditing ? 'bg-white focus:ring-2 focus:ring-primary-light focus:border-primary' : 'bg-slate-50'}`} /></div><div><label className="text-sm font-medium text-slate-600 mb-1 block">Job Description</label><textarea name="description_text" rows="12" defaultValue={viewJobModal.job?.description_text} readOnly={!viewJobModal.isEditing} required className={`w-full px-3 py-2 border border-slate-300 rounded-md outline-none ${viewJobModal.isEditing ? 'bg-white focus:ring-2 focus:ring-primary-light focus:border-primary' : 'bg-slate-50'}`}></textarea></div><div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-200"><Button type="button" variant="secondary" onClick={() => setViewJobModal({ isOpen: false, job: null, isEditing: false })}>Close</Button>{viewJobModal.isEditing ? (<Button type="submit">Save Changes</Button>) : (<Button type="button" variant="secondary" onClick={() => setViewJobModal(prev => ({ ...prev, isEditing: true }))}>Edit</Button>)}</div></form></div></Modal>
        </div>
    );
}
