import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/Modal';

// Reusable Button Component
const Button = ({ variant = 'primary', children, ...props }) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary";
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-dark",
        secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
    };
    return <button className={`${baseClasses} ${variants[variant]}`} {...props}>{children}</button>;
};

// ✅ CHANGE #1: ADD A HELPER FUNCTION TO CONVERT HTML TO PLAIN TEXT
const htmlToPlainText = (htmlString) => {
    if (!htmlString) return '';
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    return tempDiv.textContent || tempDiv.innerText || '';
};

export function MessagesPage({ apiFetch, showToast, messageTemplates, statusConfig }) {
    const [allCandidates, setAllCandidates] = useState([]);
    const [groupedByStatus, setGroupedByStatus] = useState({});
    const [activeStatus, setActiveStatus] = useState(null);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [activeChannel, setActiveChannel] = useState('email');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);

    const { all_status_options = [] } = statusConfig || {};

    const fetchData = useCallback(() => {
        apiFetch('/api/candidates/active').then(data => {
            setAllCandidates(data);
            const groups = data.reduce((acc, c) => { const status = c.status; if (!acc[status]) acc[status] = []; acc[status].push(c); return acc; }, {});
            setGroupedByStatus(groups);
        });
    }, [apiFetch]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleGroupClick = (status) => {
        setActiveStatus(status); setSelectedIds(new Set());
        const templateKey = Object.keys(messageTemplates).find(k => k === status) || '';
        setSelectedTemplate(templateKey);
        const template = messageTemplates[templateKey] || { subject: '', body: '' };
        
        // ✅ CHANGE #2: USE THE HELPER FUNCTION HERE
        setSubject(template.subject || '');
        setMessage(htmlToPlainText(template.body || ''));
    };
    
    const handleTemplateChange = (e) => {
        const key = e.target.value; 
        setSelectedTemplate(key);
        const template = messageTemplates[key] || { subject: '', body: '' };
        
        // ✅ CHANGE #3: USE THE HELPER FUNCTION HERE AS WELL
        setSubject(template.subject || '');
        setMessage(htmlToPlainText(template.body || ''));
    };

    const handleSelectAll = (e) => {
        const candidatesInGroup = groupedByStatus[activeStatus] || [];
        if (e.target.checked) setSelectedIds(new Set(candidatesInGroup.map(c => c.id)));
        else setSelectedIds(new Set());
    };

    const handleSelectCandidate = (id, isChecked) => {
        const newSelection = new Set(selectedIds);
        if (isChecked) { newSelection.add(id); } else { newSelection.delete(id); }
        setSelectedIds(newSelection);
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); if (selectedIds.size === 0) return showToast('Please select at least one candidate.', 'error');
        try {
            await apiFetch('/api/messages/bulk_send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidate_ids: [...selectedIds], channel: activeChannel, subject, message }) });
            setSelectedIds(new Set());
        } catch (error) {}
    };

    const candidatesInGroup = groupedByStatus[activeStatus] || [];
    const sampleCandidate = allCandidates.find(c => selectedIds.has(c.id)) || candidatesInGroup[0] || { name: 'John Doe', job_title: 'Sample Role' };
    const personalizedSubject = (subject || '').replace(/{candidate_name}/g, sampleCandidate.name).replace(/{job_title}/g, sampleCandidate.job_title);
    const personalizedBody = (message || '').replace(/{candidate_name}/g, sampleCandidate.name).replace(/{job_title}/g, sampleCandidate.job_title);


    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 bg-white rounded-lg border border-slate-200 shadow-sm h-[calc(100vh-150px)]">
            <div className="md:col-span-3 border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200"><h3 className="font-semibold text-slate-800">Recipients by Status</h3></div>
                <div className="overflow-y-auto custom-scrollbar">
                    {all_status_options.filter(status => groupedByStatus[status]).map(status => (
                        <div key={status} className={`flex justify-between items-center px-4 py-3 cursor-pointer border-l-4 ${status === activeStatus ? 'border-primary bg-primary-light' : 'border-transparent hover:bg-slate-50'}`} onClick={() => handleGroupClick(status)}>
                            <span className={`font-semibold text-sm ${status === activeStatus ? 'text-primary-dark' : 'text-slate-700'}`}>{status}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${status === activeStatus ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'}`}>{groupedByStatus[status].length}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="md:col-span-4 border-r border-slate-200 flex flex-col">
                {!activeStatus ? ( <div className="flex-1 flex items-center justify-center text-slate-500"><p>Select a group to see candidates</p></div> ) : (
                    <>
                        <div className="p-4 border-b border-slate-200 flex justify-between items-center"><h2 className="font-bold text-lg text-slate-800">{activeStatus}</h2><label className="flex items-center gap-2 text-sm font-medium text-slate-600"><input type="checkbox" onChange={handleSelectAll} checked={selectedIds.size === candidatesInGroup.length && candidatesInGroup.length > 0} className="rounded border-slate-300 text-primary focus:ring-primary-light" /> Select All</label></div>
                        <div className="overflow-y-auto custom-scrollbar flex-1">
                            {candidatesInGroup.map(c => {
                                const initials = ((c.name.split(' ')[0]?.[0] || '') + (c.name.split(' ')[1]?.[0] || '')).toUpperCase();
                                return (
                                <div key={c.id} className={`flex items-start gap-3 p-4 border-b border-slate-200 ${selectedIds.has(c.id) ? 'bg-primary-light' : ''}`}>
                                    <input type="checkbox" checked={selectedIds.has(c.id)} onChange={(e) => handleSelectCandidate(c.id, e.target.checked)} className="mt-1 rounded border-slate-300 text-primary focus:ring-primary-light" />
                                    <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">{initials}</div>
                                    <div className="flex-1"><p className="font-semibold text-slate-800">{c.name}</p><p className="text-xs text-slate-500">{c.job_title}</p>
                                        <div className="text-xs text-slate-500 mt-2 space-y-1">
                                            {c.email && (<div className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg><span>{c.email}</span></div>)}
                                            {c.phone_number && (<div className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg><span>{c.phone_number.replace('whatsapp:', '')}</span></div>)}
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </>
                )}
            </div>
            <div className="md:col-span-5 flex flex-col bg-slate-50 rounded-r-lg">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center"><h3 className="font-semibold text-slate-800">Compose Message</h3><Button variant="secondary" onClick={() => setPreviewModalOpen(true)}>Preview</Button></div>
                <form className="flex-1 flex flex-col" onSubmit={handleSubmit}>
                    <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                        <div className="p-1 bg-slate-200 rounded-lg flex"><button type="button" className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${activeChannel === 'email' ? 'bg-white shadow-sm' : ''}`} onClick={() => setActiveChannel('email')}>Email</button><button type="button" className={`flex-1 py-1.5 text-sm font-semibold rounded-md transition-all ${activeChannel === 'whatsapp' ? 'bg-white shadow-sm' : ''}`} onClick={() => setActiveChannel('whatsapp')}>WhatsApp</button></div>
                        <div>
                            <label className="text-sm font-medium text-slate-600 mb-1 block">Use a Template</label>
                            <select value={selectedTemplate} onChange={handleTemplateChange} className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-primary-light focus:border-primary outline-none">
                                <option value="">-- No Template --</option>
                                {Object.keys(messageTemplates).map(key => <option key={key} value={key}>{key}</option>)}
                            </select>
                        </div>
                        {activeChannel === 'email' && <div><label className="text-sm font-medium text-slate-600 mb-1 block">Subject</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" /></div>}
                        <div><label className="text-sm font-medium text-slate-600 mb-1 block">Message</label><textarea value={message} onChange={e => setMessage(e.target.value)} rows="8" className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"></textarea><p className="text-xs text-slate-500 mt-1">Placeholders: {`{candidate_name}`}, {`{job_title}`}</p></div>
                    </div>
                    <div className="p-4 border-t border-slate-200 flex justify-between items-center"><span className="text-sm font-medium text-slate-500">{selectedIds.size} candidate(s) selected</span><Button type="submit">Send Message</Button></div>
                </form>
            </div>
            <Modal isOpen={isPreviewModalOpen} onClose={() => setPreviewModalOpen(false)}>
                <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-bold text-slate-800">Preview</h2>
                        <button onClick={() => setPreviewModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button>
                    </div>
                    {activeChannel === 'email' && <div className="pb-4 mb-4 border-b border-slate-200"><strong>Subject:</strong> {personalizedSubject}</div>}
                    <div className="text-slate-600" dangerouslySetInnerHTML={{ __html: personalizedBody.replace(/\n/g, '<br />') }}></div>
                </div> {/* <-- THIS IS THE MISSING CLOSING TAG */}
            </Modal>
        </div>
    );
}