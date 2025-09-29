import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal } from '../components/Modal';

export function CandidatesPage({ apiFetch, showToast, STATUS_OPTIONS, PIPELINE_STAGES, globalSearchTerm, activePageProp, setActivePage }) {
    const [candidates, setCandidates] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [counts, setCounts] = useState({});
    const [filters, setFilters] = useState({ job_id: '', status: '' });
    const [activeTab, setActiveTab] = useState('ATS Shortlisted');
    const [selectedIds, setSelectedIds] = useState(new Set());
    
    // Modal states
    const [currentCandidate, setCurrentCandidate] = useState(null);
    const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
    const [isViewProfileModalOpen, setViewProfileModalOpen] = useState(false);
    const [isContactModalOpen, setContactModalOpen] = useState(false);
    const [actionMenu, setActionMenu] = useState({ visible: false, x: 0, y: 0, candidate: null });
    
    // Upload progress bar state
    const [isUploading, setIsUploading] = useState(false);

    const selectAllCheckboxRef = useRef();

    const fetchData = useCallback(async () => {
        const params = new URLSearchParams({ ...filters, search: globalSearchTerm });
        if (!filters.status) params.set('status', activeTab);
        
        try {
            // No changes here
            const [candidateData, countData, jobsData] = await Promise.all([
                apiFetch(`/api/candidates?${params.toString()}`),
                apiFetch('/api/candidates/counts'),
                apiFetch('/api/jobs')
            ]);
            setCandidates(candidateData);
            setCounts(countData);
            setJobs(jobsData);
        } catch (error) { console.error("Failed to fetch page data"); }
    }, [filters, activeTab, globalSearchTerm, apiFetch]);
    
    useEffect(() => {
        const [page, params] = activePageProp.split('?');
        const urlParams = new URLSearchParams(params);
        if (urlParams.get('uploading') === 'true') {
            setIsUploading(true);
            setActivePage('candidates'); 
            setTimeout(() => {
                setIsUploading(false);
                fetchData();
                showToast("Processing complete! Displaying new candidates.");
            }, 3000);
        }
    }, [activePageProp]);

    useEffect(() => { fetchData(); }, [fetchData]);

    useEffect(() => {
        if (selectAllCheckboxRef.current) {
            selectAllCheckboxRef.current.checked = candidates.length > 0 && selectedIds.size === candidates.length;
            selectAllCheckboxRef.current.indeterminate = selectedIds.size > 0 && selectedIds.size < candidates.length;
        }
    }, [selectedIds, candidates]);

    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (actionMenu.visible && !e.target.closest('.action-dropdown')) {
                setActionMenu({ visible: false });
            }
        };
        document.addEventListener('click', handleOutsideClick);
        return () => document.removeEventListener('click', handleOutsideClick);
    }, [actionMenu.visible]);

    const handleFilterChange = (e) => {
        setActiveTab('');
        setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleTabClick = (tabStatus) => {
        setFilters({ job_id: '', status: '' });
        setActiveTab(tabStatus);
    };
    
    const handleSelect = (candidateId) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(candidateId)) newSet.delete(candidateId);
            else newSet.add(candidateId);
            return newSet;
        });
    };
    
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(candidates.map(c => c.id)));
        } else {
            setSelectedIds(new Set());
        }
    };
    
    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} candidate(s)?`)) {
            try {
                await apiFetch('/api/candidates/bulk', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ candidate_ids: [...selectedIds] })
                });
                setSelectedIds(new Set());
                fetchData();
            } catch (error) {}
        }
    };
    
    const openActionMenu = (e, candidate) => {
        e.stopPropagation();
        const rect = e.target.getBoundingClientRect();
        setActionMenu({ visible: true, x: rect.right, y: rect.bottom + window.scrollY, candidate: candidate });
    };

    // =================================================================
    // === THIS IS THE CRITICAL FIX ====================================
    // =================================================================
    const handleActionClick = async (action) => {
        const { candidate } = actionMenu;
        setActionMenu({ visible: false }); // Close menu immediately

        if (action === 'view-profile') {
            try {
                // 1. Fetch the FULL candidate details, including ai_analysis
                const fullCandidateData = await apiFetch(`/api/candidates/${candidate.id}`);
                // 2. Set this full data as the current candidate
                setCurrentCandidate(fullCandidateData);
                // 3. THEN open the modal
                setViewProfileModalOpen(true);
            } catch (error) {
                showToast('Could not load candidate profile.', 'error');
            }
            return;
        }

        // For other actions, we don't need to fetch full data first
        setCurrentCandidate(candidate);
        if (action === 'update-status') setUpdateModalOpen(true);
        if (action === 'contact') setContactModalOpen(true);
        if (action === 'delete') {
            if (window.confirm('Are you sure you want to delete this candidate?')) {
                apiFetch('/api/candidates/bulk', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ candidate_ids: [candidate.id] })
                }).then(fetchData).catch(err => {});
            }
        }
    };
    
    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newStatus = formData.get('status');
        const comments = formData.get('comments');
        try {
            await apiFetch(`/api/candidates/${currentCandidate.id}/update_status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, comments })
            });
            setUpdateModalOpen(false);
            fetchData();
        } catch (error) {}
    };

    const getStatusPillClass = (status) => {
        const s = (status || '').toLowerCase();
        if (s.includes('shortlisted')) return 'shortlisted';
        if (s.includes('interview')) return 'interview';
        if (s.includes('offer')) return 'offer';
        if (s.includes('joined')) return 'joined';
        if (s.includes('rejected') || s.includes('declined')) return 'rejected';
        return 'default';
    };

    return (
        <div id="candidates-view">
            {isUploading && (
                <div className="progress-container">
                    <div className="progress-bar-header"><h3>Processing Resumes...</h3></div>
                    <div className="progress-bar"><div className="progress-bar-fill" style={{ width: '50%' }}></div></div>
                </div>
            )}
            <div className="filter-bar card">
                <div className="filter-group"><label>Filter by Job Posting</label><select name="job_id" value={filters.job_id} onChange={handleFilterChange}><option value="">All Jobs</option>{jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}</select></div>
                <div className="filter-group"><label>Filter by Status</label><select name="status" value={filters.status} onChange={handleFilterChange}><option value="">All Statuses</option>{STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
            </div>

            <div className="card candidate-pipeline">
                <div className="pipeline-tabs">
                    {PIPELINE_STAGES.map(stage => (
                        <button key={stage} className={`tab-btn ${activeTab === stage && !filters.status ? 'active' : ''}`} onClick={() => handleTabClick(stage)}>
                            {stage.replace(/ l\d/i, '').replace(' scheduled', '')}
                            <span className="count">{counts[stage] || 0}</span>
                        </button>
                    ))}
                </div>
                {selectedIds.size > 0 && (
                    <div className="bulk-actions-bar">
                        <span>{selectedIds.size} selected</span>
                        <button className="btn btn-danger" onClick={handleDeleteSelected}>Delete Selected</button>
                    </div>
                )}
                <div className="table-container">
                    <table>
                        <thead><tr>
                            <th className="text-center" style={{ width: "40px" }}><input type="checkbox" ref={selectAllCheckboxRef} onChange={handleSelectAll}/></th>
                            <th>CANDIDATE</th><th>APPLIED FOR</th><th className="text-center">ATS SCORE</th><th>MOBILE NUMBER</th><th className="text-center">STATUS</th><th className="text-center">ACTIONS</th>
                        </tr></thead>
                        <tbody>
                            {candidates.map(c => {
                                const initials = ((c.first_name?.[0] || '') + (c.last_name?.[0] || '')).toUpperCase();
                                return (
                                <tr key={c.id} className={selectedIds.has(c.id) ? 'selected' : ''}>
                                    <td className="text-center"><input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => handleSelect(c.id)}/></td>
                                    <td><div className="candidate-name-cell"><div className="candidate-avatar">{initials || '??'}</div><div className="candidate-info"><p className="name">{`${c.first_name} ${c.last_name}`.trim()}</p><span className="email">{c.email}</span></div></div></td>
                                    <td>{c.job_title}</td>
                                    <td className="text-center"><div className="ats-score-cell" style={{justifyContent: 'center'}}><div className="ats-progress"><div className="ats-progress-bar" style={{width: `${c.ats_score || 0}%`}}></div></div><span className="ats-score-value">{c.ats_score ? `${Math.round(c.ats_score)}%` : 'N/A'}</span></div></td>
                                    <td>{c.phone_number?.replace('whatsapp:', '') || 'N/A'}</td>
                                    <td className="text-center"><span className={`status-pill status-${getStatusPillClass(c.status)}`}>{c.status}</span></td>
                                    <td className="text-center"><button className="action-btn" onClick={(e) => openActionMenu(e, c)}>...</button></td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {actionMenu.visible && (
                <div className="action-dropdown" style={{ top: actionMenu.y, left: actionMenu.x - 180 }}>
                    <ul>
                        <li><button onClick={() => handleActionClick('view-profile')}>View Profile</button></li>
                        <li><button onClick={() => handleActionClick('update-status')}>Update Status</button></li>
                        <li><button onClick={() => handleActionClick('contact')}>Contact Candidate</button></li>
                        <li className="separator"></li>
                        <li><button className="delete-action" onClick={() => handleActionClick('delete')}>Delete Candidate</button></li>
                    </ul>
                </div>
            )}
            
            <Modal isOpen={isUpdateModalOpen} onClose={() => setUpdateModalOpen(false)}>
                <div className="modal-header"><h2>Manage Candidate</h2><button className="close-btn" onClick={() => setUpdateModalOpen(false)}>&times;</button></div>
                <form onSubmit={handleUpdateStatus}>
                    <div className="form-group"><label>New Status</label><select name="status" defaultValue={currentCandidate?.status} required><option value="">Select a status</option>{STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div className="form-group"><label>Comments (Optional)</label><textarea name="comments" rows="3"></textarea></div>
                    <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setUpdateModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary">Update Status</button></div>
                </form>
            </Modal>

            <Modal isOpen={isViewProfileModalOpen} onClose={() => setViewProfileModalOpen(false)} size="large">
                <div className="modal-header"><h2>{currentCandidate?.name || 'Candidate Profile'}</h2><button className="close-btn" onClick={() => setViewProfileModalOpen(false)}>&times;</button></div>
                {currentCandidate && <>
                    <div className="profile-grid">
                        <div className="profile-details">
                            <p><strong>Email:</strong> <span>{currentCandidate.email}</span></p>
                            <p><strong>Phone:</strong> <span>{currentCandidate.phone_number?.replace('whatsapp:', '') || 'N/A'}</span></p>
                            <p><strong>Education:</strong> <span>{currentCandidate.ai_analysis?.education_summary || 'N/A'}</span></p>
                            <p><strong>Experience:</strong> <span>{currentCandidate.ai_analysis?.years_of_experience || '0'} years</span></p>
                        </div>
                        <div className="profile-score">
                            <h4>ATS Score</h4>
                            <div className="score-circle">{Math.round(currentCandidate.ats_score || 0)}%</div>
                        </div>
                    </div>
                    <div className="profile-summary">
                        <h4>AI Shortlisting Summary</h4>
                        <p>{currentCandidate.ai_analysis?.summary_reason || 'No AI summary available.'}</p>
                    </div>
                    <div className="profile-skills">
                        <h4>Matched Skills</h4>
                        <div className="skills-container">
                            {currentCandidate.ai_analysis?.matched_skills?.length > 0
                                ? currentCandidate.ai_analysis.matched_skills.map(skill => <span key={skill} className="skill-pill">{skill}</span>)
                                : <p>No specific skills identified.</p>
                            }
                        </div>
                    </div>
                </>}
            </Modal>
            
            <Modal isOpen={isContactModalOpen} onClose={() => setContactModalOpen(false)}>
                <div className="modal-header"><h2>Contact Candidate</h2><button className="close-btn" onClick={() => setContactModalOpen(false)}>&times;</button></div>
                <form>
                    <p>Feature coming soon.</p>
                    <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setContactModalOpen(false)}>Close</button></div>
                </form>
            </Modal>
        </div>
    );
}