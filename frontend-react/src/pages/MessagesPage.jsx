import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/Modal';

export function MessagesPage({ apiFetch, showToast, MESSAGE_TEMPLATES }) {
    const [allCandidates, setAllCandidates] = useState([]);
    const [groupedByStatus, setGroupedByStatus] = useState({});
    const [activeStatus, setActiveStatus] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [activeChannel, setActiveChannel] = useState('email');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);

    const fetchData = useCallback(() => {
        apiFetch('/api/candidates/active').then(data => {
            setAllCandidates(data);
            const groups = data.reduce((acc, c) => {
                const status = c.status;
                if (!acc[status]) acc[status] = [];
                acc[status].push(c);
                return acc;
            }, {});
            setGroupedByStatus(groups);
        });
    }, [apiFetch]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleGroupClick = (status) => {
        setActiveStatus(status);
        setSelectedIds(new Set());
        const templateKey = Object.keys(MESSAGE_TEMPLATES).find(k => k === status) || '';
        setSelectedTemplate(templateKey);
        const template = MESSAGE_TEMPLATES[templateKey] || { subject: '', body: '' };
        setSubject(template.subject);
        setMessage(template.body);
    };
    
    const handleTemplateChange = (e) => {
        const key = e.target.value;
        setSelectedTemplate(key);
        const template = MESSAGE_TEMPLATES[key] || { subject: '', body: '' };
        setSubject(template.subject);
        setMessage(template.body);
    };

    const handleSelectAll = (e) => {
        const candidatesInGroup = groupedByStatus[activeStatus] || [];
        if (e.target.checked) setSelectedIds(new Set(candidatesInGroup.map(c => c.id)));
        else setSelectedIds(new Set());
    };

    const handleSelectCandidate = (id) => {
        const newSelection = new Set(selectedIds);
        if (newSelection.has(id)) newSelection.delete(id);
        else newSelection.add(id);
        setSelectedIds(newSelection);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedIds.size === 0) return showToast('Please select at least one candidate.', 'error');
        try {
            await apiFetch('/api/messages/bulk_send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ candidate_ids: [...selectedIds], channel: activeChannel, subject, message })
            });
            setSelectedIds(new Set());
        } catch (error) {}
    };

    const candidatesInGroup = groupedByStatus[activeStatus] || [];
    
    const sampleCandidate = allCandidates.find(c => selectedIds.has(c.id)) || candidatesInGroup[0] || { name: 'John Doe', job_title: 'Sample Role' };
    const personalizedSubject = subject.replace(/{candidate_name}/g, sampleCandidate.name).replace(/{job_title}/g, sampleCandidate.job_title);
    const personalizedBody = message.replace(/{candidate_name}/g, sampleCandidate.name).replace(/{job_title}/g, sampleCandidate.job_title);


    return (
        <>
        <div id="messages-view" className="messages-container-grid">
            <div className="status-groups-sidebar">
                <div className="sidebar-header"><h3>Recipients by Status</h3></div>
                <div className="status-groups-nav">
                    {Object.keys(groupedByStatus).sort().map(status => (
                        <div key={status} className={`status-group-item ${status === activeStatus ? 'active' : ''}`} onClick={() => handleGroupClick(status)}>
                            <span className="group-title">{status}</span>
                            <span className="group-count">{groupedByStatus[status].length}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="candidate-list-pane">
                {!activeStatus ? ( <div className="workspace-placeholder"><p>Select a group to see candidates</p></div> ) : (
                    <div id="candidate-list-content">
                        <div className="candidate-list-header">
                            <h2>{activeStatus}</h2>
                            <label><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size === candidatesInGroup.length && candidatesInGroup.length > 0} /> Select All</label>
                        </div>
                        <div className="candidate-list-body">
                            {candidatesInGroup.map(c => {
                                const initials = ((c.name.split(' ')[0]?.[0] || '') + (c.name.split(' ')[1]?.[0] || '')).toUpperCase();
                                // === THIS IS THE UPDATED JSX STRUCTURE ===
                                return (
                                <div key={c.id} className={`candidate-item ${selectedIds.has(c.id) ? 'selected' : ''}`} onClick={() => handleSelectCandidate(c.id)}>
                                    <input type="checkbox" checked={selectedIds.has(c.id)} readOnly/>
                                    <div className="candidate-avatar">{initials}</div>
                                    <div className="info">
                                        <p className="name">{c.name}</p>
                                        <span className="job">{c.job_title}</span>
                                        <div className="contact-details">
                                            {c.email && (
                                                <span className="contact-item">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                                    {c.email}
                                                </span>
                                            )}
                                            {c.phone_number && (
                                                <span className="contact-item">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                                    {c.phone_number.replace('whatsapp:', '')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </div>
                )}
            </div>
            <div className="message-composer-pane">
                <div className="composer-header"><h3>Compose Message</h3><button className="btn btn-secondary" onClick={() => setPreviewModalOpen(true)}>Preview</button></div>
                <form className="composer-form" onSubmit={handleSubmit}>
                    <div className="composer-form-content">
                        <div className="channel-toggle">
                            <button type="button" className={`toggle-btn ${activeChannel === 'email' ? 'active' : ''}`} onClick={() => setActiveChannel('email')}>Email</button>
                            <button type="button" className={`toggle-btn ${activeChannel === 'whatsapp' ? 'active' : ''}`} onClick={() => setActiveChannel('whatsapp')}>WhatsApp</button>
                        </div>
                        <div className="form-group">
                            <label>Use a Template</label>
                            <select value={selectedTemplate} onChange={handleTemplateChange}>
                                <option value="">-- No Template --</option>
                                {Object.keys(MESSAGE_TEMPLATES).map(key => <option key={key} value={key}>{key}</option>)}
                            </select>
                        </div>
                        {activeChannel === 'email' && <div className="form-group"><label>Subject</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} /></div>}
                        <div className="form-group">
                            <label>Message</label>
                            <textarea value={message} onChange={e => setMessage(e.target.value)} rows="8"></textarea>
                            <p className="form-hint">Placeholders: {`{candidate_name}`}, {`{job_title}`}</p>
                        </div>
                    </div>
                    <div className="composer-footer">
                        <span>{selectedIds.size} candidate(s) selected</span>
                        <button type="submit" className="btn btn-primary">Send Message</button>
                    </div>
                </form>
            </div>
        </div>
        <Modal isOpen={isPreviewModalOpen} onClose={() => setPreviewModalOpen(false)}>
             <div className="modal-header"><h2>Preview</h2><button className="close-btn" onClick={() => setPreviewModalOpen(false)}>&times;</button></div>
             {activeChannel === 'email' && <div className="preview-subject"><strong>Subject:</strong> {personalizedSubject}</div>}
             <div className="preview-body" dangerouslySetInnerHTML={{ __html: personalizedBody.replace(/\n/g, '<br />') }}></div>
        </Modal>
        </>
    );
}