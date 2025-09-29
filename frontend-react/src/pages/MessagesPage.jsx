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
        // Auto-select the template matching the status group
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
    
    // For Preview: Find a sample candidate from the selected ones, or the first in the list
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
                                return (
                                <div key={c.id} className={`candidate-item ${selectedIds.has(c.id) ? 'selected' : ''}`} onClick={() => handleSelectCandidate(c.id)}>
                                    <input type="checkbox" checked={selectedIds.has(c.id)} readOnly/>
                                    <div className="candidate-avatar">{initials}</div>
                                    <div className="info"><p className="name">{c.name}</p><span className="job">{c.job_title}</span></div>
                                </div>
                            )})}
                        </div>
                    </div>
                )}
            </div>
            <div className="message-composer-pane">
                <div className="composer-header"><h3>Compose Message</h3><button className="btn btn-secondary" onClick={() => setPreviewModalOpen(true)}>Preview</button></div>
                <form className="composer-form" onSubmit={handleSubmit}>
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
                    <div className="form-group"><label>Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows="8"></textarea><p className="form-hint">Placeholders: {`{candidate_name}`}, {`{job_title}`}</p></div>
                    <div className="composer-footer"><span>{selectedIds.size} candidate(s) selected</span><button type="submit" className="btn btn-primary">Send Message</button></div>
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