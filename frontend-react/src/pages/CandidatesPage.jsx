import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '../components/Modal';
import { Pagination } from '../components/Pagination';
import { ProcessingWidget } from '../components/ProcessingWidget';

const Button = ({ variant = 'primary', children, ...props }) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary";
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-dark",
        secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
        danger: "bg-red-600 text-white hover:bg-red-700",
    };
    return <button className={`${baseClasses} ${variants[variant]}`} {...props}>{children}</button>;
};

const ITEMS_PER_PAGE = 10;

export function CandidatesPage({ apiFetch, showToast, statusConfig, globalSearchTerm, refreshTrigger, setActivePage, filters, setFilters, activeTasks, onCancelTask }) {
    const [candidates, setCandidates] = useState([]);
    const [counts, setCounts] = useState({});
    const [activeTab, setActiveTab] = useState('All');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCandidates, setTotalCandidates] = useState(0);
    const [currentCandidate, setCurrentCandidate] = useState(null);
    const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
    const [actionMenu, setActionMenu] = useState({ visible: false, x: 0, y: 0, candidate: null });
    const selectAllCheckboxRef = useRef();
    
    const { pipeline_stages = [], all_status_options = [], tab_status_groups = {} } = statusConfig || {};

    const fetchData = useCallback(async () => {
        const params = new URLSearchParams({ search: globalSearchTerm, page: currentPage, limit: ITEMS_PER_PAGE });
        let isFiltering = false;
        if (filters.job_id) { params.set('job_id', filters.job_id); isFiltering = true; }
        if (filters.status) { params.set('status', filters.status); isFiltering = true; }
        
        if (isFiltering) {
            setActiveTab('');
        } else if (activeTab !== 'All') {
            const statusesToFetch = tab_status_groups[activeTab] || [activeTab];
            statusesToFetch.forEach(status => params.append('status', status));
        }

        try {
            const [data, countData] = await Promise.all([
                apiFetch(`/api/candidates?${params.toString()}`),
                apiFetch('/api/candidates/counts'),
            ]);
            setCandidates(data.candidates); setTotalCandidates(data.total); setCounts(countData);
        } catch (error) { setCandidates([]); setTotalCandidates(0); }
    }, [filters, activeTab, globalSearchTerm, currentPage, apiFetch, tab_status_groups]);

    useEffect(() => { fetchData(); }, [fetchData, refreshTrigger]);
    useEffect(() => { setCurrentPage(1); }, [globalSearchTerm, filters, activeTab]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            const allVisibleIds = new Set(candidates.map(c => c.id));
            const selectedVisibleCount = [...selectedIds].filter(id => allVisibleIds.has(id)).length;
            selectAllCheckboxRef.current.checked = allVisibleIds.size > 0 && selectedVisibleCount === allVisibleIds.size;
            selectAllCheckboxRef.current.indeterminate = selectedVisibleCount > 0 && selectedVisibleCount < allVisibleIds.size;
        }
    }, [selectedIds, candidates]);

    useEffect(() => {
        const handleOutsideClick = (e) => { if (actionMenu.visible && !e.target.closest('.action-dropdown')) { setActionMenu({ visible: false }); } };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [actionMenu.visible]);

    const handleTabClick = (tabStatus) => { setFilters({ job_id: '', status: '' }); setActiveTab(tabStatus); };
    const handleSelect = (candidateId) => { setSelectedIds(prev => { const newSet = new Set(prev); if (newSet.has(candidateId)) newSet.delete(candidateId); else newSet.add(candidateId); return newSet; }); };
    const handleSelectAll = (e) => { if (e.target.checked) { setSelectedIds(new Set(candidates.map(c => c.id))); } else { setSelectedIds(new Set()); } };
    const handleDeleteSelected = async () => { if (selectedIds.size === 0) return; if (window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} candidate(s)?`)) { try { await apiFetch('/api/candidates/bulk', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidate_ids: [...selectedIds] }) }); setSelectedIds(new Set()); fetchData(); } catch (error) {} } };
    const openActionMenu = (e, candidate) => { e.stopPropagation(); const rect = e.target.getBoundingClientRect(); setActionMenu({ visible: true, x: rect.right, y: rect.bottom + window.scrollY, candidate: candidate }); };

    const handleActionClick = async (action) => {
        const { candidate } = actionMenu; setActionMenu({ visible: false });
        if (action === 'view-profile') { setActivePage(`candidates/${candidate.id}`); return; }
        setCurrentCandidate(candidate);
        if (action === 'update-status') setUpdateModalOpen(true);
        if (action === 'delete') { if (window.confirm('Are you sure you want to delete this candidate?')) { apiFetch('/api/candidates/bulk', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidate_ids: [candidate.id] }) }).then(fetchData).catch(err => {}); } }
    };
    
    const handleUpdateStatus = async (e) => { e.preventDefault(); const formData = new FormData(e.target); const newStatus = formData.get('status'); const comments = formData.get('comments'); try { await apiFetch(`/api/candidates/${currentCandidate.id}/update_status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus, comments }) }); setUpdateModalOpen(false); fetchData(); } catch (error) {} };

    const getStatusPillClass = (status) => { const s = (status || '').toLowerCase(); if (s.includes('shortlisted')) return 'bg-blue-100 text-blue-700'; if (s.includes('interview')) return 'bg-amber-100 text-amber-700'; if (s.includes('offer') || s.includes('cleared') || s.includes('document')) return 'bg-purple-100 text-purple-700'; if (s.includes('joined')) return 'bg-green-100 text-green-700'; if (s.includes('rejected') || s.includes('declined')) return 'bg-red-100 text-red-700'; return 'bg-slate-100 text-slate-600'; };

    return (
        <div className="space-y-6">
            
            <ProcessingWidget activeTasks={activeTasks} onCancelTask={onCancelTask} />

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <div className="p-2 border-b border-slate-200 overflow-x-auto custom-scrollbar">
                    <div className="flex gap-2">
                        <button className={`px-3 py-1.5 text-sm font-semibold rounded-md whitespace-nowrap ${activeTab === 'All' ? 'bg-primary-light text-primary-dark' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => handleTabClick('All')}>All Candidates</button>
                        {pipeline_stages.map(stage => (
                            <button key={stage} className={`px-3 py-1.5 text-sm font-semibold rounded-md whitespace-nowrap flex items-center gap-2 ${activeTab === stage ? 'bg-primary-light text-primary-dark' : 'text-slate-600 hover:bg-slate-100'}`} onClick={() => handleTabClick(stage)}>
                                <span>{stage.replace(/ l\d/i, '').replace(' scheduled', '').replace(' Pending', '')}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === stage ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>{counts[stage] || 0}</span>
                            </button>
                        ))}
                    </div>
                </div>
                
                <Pagination currentPage={currentPage} totalItems={totalCandidates} itemsPerPage={ITEMS_PER_PAGE} onPageChange={(page) => setCurrentPage(page)} />
                
                {selectedIds.size > 0 && (
                    <div className="p-3 bg-primary-light flex justify-between items-center border-y border-slate-200">
                        <span className="font-semibold text-primary-dark text-sm">{selectedIds.size} selected</span>
                        <Button variant="danger" onClick={handleDeleteSelected}>Delete Selected</Button>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase"><tr className="border-b border-slate-200"><th className="px-4 py-3 w-12 text-center"><input type="checkbox" ref={selectAllCheckboxRef} onChange={handleSelectAll} className="rounded border-slate-300 text-primary focus:ring-primary-light" /></th><th className="px-4 py-3">Candidate</th><th className="px-4 py-3">Applied For</th><th className="px-4 py-3 text-center">ATS Score</th><th className="px-4 py-3">Mobile Number</th><th className="px-4 py-3 text-center">Status</th><th className="px-4 py-3 text-center">Actions</th></tr></thead>
                        <tbody>
                            {candidates.length > 0 ? candidates.map(c => {
                                const initials = ((c.first_name?.[0] || '') + (c.last_name?.[0] || '')).toUpperCase();
                                return (
                                <tr key={c.id} className={`border-b border-slate-200 ${selectedIds.has(c.id) ? 'bg-primary-light' : 'hover:bg-slate-50'}`}>
                                    <td className="px-4 py-2 text-center"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => handleSelect(c.id)} className="rounded border-slate-300 text-primary focus:ring-primary-light" /></td>
                                    <td className="px-4 py-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-primary-light text-primary-dark flex items-center justify-center font-bold text-xs shrink-0">{initials || '??'}</div>
                                            <div>
                                                <a href="#" className="font-semibold text-slate-800 hover:text-primary" onClick={(e) => { e.preventDefault(); setActivePage(`candidates/${c.id}`); }}>{`${c.first_name} ${c.last_name}`.trim()}</a>
                                                <div className="text-slate-500 truncate">{c.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2 font-semibold text-slate-700">{c.job_title}</td>
                                    <td className="px-4 py-2 text-center"><div className="flex items-center justify-center gap-2"><div className="w-16 h-1.5 bg-slate-200 rounded-full"><div className="h-1.5 bg-primary rounded-full" style={{width: `${c.ats_score || 0}%`}}></div></div><span className="font-semibold text-slate-600">{c.ats_score ? `${Math.round(c.ats_score)}%` : 'N/A'}</span></div></td>
                                    <td className="px-4 py-2 font-semibold text-slate-700">{c.phone_number?.replace('whatsapp:', '') || 'N/A'}</td>
                                    <td className="px-4 py-2 text-center"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-block ${getStatusPillClass(c.status)}`}>{c.status}</span></td>
                                    <td className="px-4 py-2 text-center"><button onClick={(e) => openActionMenu(e, c)} className="p-1.5 text-slate-500 hover:bg-slate-200 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg></button></td>
                                </tr>
                                );
                            }) : (<tr><td colSpan="7" className="text-center py-16 text-slate-500">No candidates found.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {actionMenu.visible && (<div className="absolute z-10 w-48 bg-white rounded-md shadow-lg border border-slate-200" style={{ top: actionMenu.y, left: actionMenu.x - 180 }}><ul className="p-1"><li><button onClick={() => handleActionClick('view-profile')} className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md">View Profile</button></li><li><button onClick={() => handleActionClick('update-status')} className="w-full text-left px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md">Update Status</button></li><li className="my-1 border-t border-slate-200"></li><li><button onClick={() => handleActionClick('delete')} className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-md">Delete Candidate</button></li></ul></div>)}
            
            <Modal isOpen={isUpdateModalOpen} onClose={() => setUpdateModalOpen(false)}>
                <div className="p-6"><div className="flex justify-between items-start"><h2 className="text-xl font-bold text-slate-800">Update Status</h2><button onClick={() => setUpdateModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button></div><form onSubmit={handleUpdateStatus} className="mt-6 space-y-4"><div><label className="text-sm font-medium text-slate-600 mb-1 block">New Status</label><select name="status" defaultValue={currentCandidate?.status} required className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"><option value="">Select a status</option>{all_status_options.map(o => <option key={o} value={o}>{o}</option>)}</select></div><div><label className="text-sm font-medium text-slate-600 mb-1 block">Comments (Optional)</label><textarea name="comments" rows="3" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"></textarea></div><div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-200"><Button type="button" variant="secondary" onClick={() => setUpdateModalOpen(false)}>Cancel</Button><Button type="submit">Update Status</Button></div></form></div>
            </Modal>
        </div>
    );
}