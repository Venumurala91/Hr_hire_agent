import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/Modal';
import { StageTracker } from '../components/StageTracker';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { InterviewLog } from '../components/InterviewLog';

// Reusable Button Component
const Button = ({ variant = 'primary', children, ...props }) => {
    const baseClasses = "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary";
    const variants = {
        primary: "bg-primary text-white hover:bg-primary-dark",
        secondary: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
    };
    return <button className={`${baseClasses} ${variants[variant]}`} {...props}>{children}</button>;
};

const ScoreCircle = ({ score }) => {
    const radius = 45; const circumference = 2 * Math.PI * radius;
    const [offset, setOffset] = useState(circumference);
    useEffect(() => { const t = setTimeout(() => setOffset(circumference - (score / 100) * circumference), 100); return () => clearTimeout(t); }, [score, circumference]);
    return (<svg className="w-28 h-28" viewBox="0 0 120 120"><circle className="text-slate-200" strokeWidth="10" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" /><circle className="text-primary transition-all duration-1000 ease-out" strokeWidth="10" strokeDasharray={circumference} style={{ strokeDashoffset: offset }} strokeLinecap="round" stroke="currentColor" fill="transparent" r={radius} cx="60" cy="60" transform="rotate(-90 60 60)" /><text x="50%" y="50%" className="text-3xl font-bold fill-primary-dark text-center" dominantBaseline="middle" textAnchor="middle">{score}%</text></svg>);
};

export function CandidateDetailPage({ candidateId, setActivePage, apiFetch, showToast, statusConfig }) {
    const [candidate, setCandidate] = useState(null);
    const [interviews, setInterviews] = useState([]);
    const [notes, setNotes] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);
    
    const { all_status_options = [], reschedulable_statuses = [], detail_page_config = {} } = statusConfig || {};
    const canReschedule = candidate && reschedulable_statuses.includes(candidate.status);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [candidateData, interviewData] = await Promise.all([ apiFetch(`/api/candidates/${candidateId}`), apiFetch(`/api/candidates/${candidateId}/interviews`) ]);
            setCandidate(candidateData); setInterviews(interviewData);
        } catch (error) { showToast("Could not load candidate details.", "error"); } 
        finally { setLoading(false); }
    }, [candidateId, apiFetch, showToast]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
    const handleUpdateStatus = async (e) => { e.preventDefault(); const formData = new FormData(e.target); const newStatus = formData.get('status'); const comments = formData.get('comments'); try { await apiFetch(`/api/candidates/${candidate.id}/update_status`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus, comments }) }); setUpdateModalOpen(false); fetchData(); } catch (error) {} };
    const handleReschedule = async (e) => { e.preventDefault(); const form = e.target.closest('form'); const formData = new FormData(form); const comments = formData.get('comments'); if (!comments) { showToast('Please provide a reason for rescheduling in the comments.', 'error'); return; } try { await apiFetch(`/api/candidates/${candidate.id}/reschedule`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ comments }) }); setUpdateModalOpen(false); fetchData(); } catch (error) {} };

    if (loading) { return <div className="p-8 text-center text-slate-500">Loading candidate details...</div>; }
    if (!candidate) { return <div className="p-8 text-center text-slate-500">Candidate not found. <a href="#" onClick={(e) => {e.preventDefault(); setActivePage('candidates');}} className="text-primary hover:underline">Go back to list.</a></div>; }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'timeline': return <ActivityTimeline history={candidate.status_history || []} />;
            case 'interviews': return <InterviewLog interviews={interviews} candidateId={candidateId} apiFetch={apiFetch} onInterviewAdded={fetchData} />;
            case 'notes': return (<div><h4 className="text-lg font-bold text-slate-800">Internal Notes</h4><textarea className="mt-4 w-full h-48 p-3 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none" placeholder="Add notes..." value={notes} onChange={(e) => setNotes(e.target.value)} ></textarea></div>);
            case 'profile': default: return (<div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-2 text-sm">
                        <p className="flex gap-2 items-center text-slate-600"><strong>Email:</strong> <span>{candidate.email}</span></p>
                        <p className="flex gap-2 items-center text-slate-600"><strong>Phone:</strong> <span>{candidate.phone_number?.replace('whatsapp:', '') || 'N/A'}</span></p>
                        <p className="flex gap-2 items-center text-slate-600"><strong>Education:</strong> <span>{candidate.ai_analysis?.education_summary || 'N/A'}</span></p>
                        <p className="flex gap-2 items-center text-slate-600"><strong>Experience:</strong> <span>{candidate.ai_analysis?.years_of_experience || '0'} years</span></p>
                    </div>
                    <div className="flex flex-col items-center justify-center"><h4 className="text-sm font-semibold text-slate-500 mb-2">ATS Score</h4><ScoreCircle score={Math.round(candidate.ats_score || 0)} /></div>
                </div>
                <div><h4 className="text-base font-bold text-slate-800 mb-2">AI Shortlisting Summary</h4><p className="text-sm text-slate-600 leading-relaxed">{candidate.ai_analysis?.summary_reason || 'No AI summary available.'}</p></div>
                <div>
                    <h4 className="text-base font-bold text-slate-800 mb-3">Matched Skills</h4>
                    <div className="flex flex-wrap gap-2">
                        {candidate.ai_analysis?.matched_skills?.length > 0 ? 
                            candidate.ai_analysis.matched_skills.map(skill => <span key={skill} className="px-3 py-1 bg-primary-light text-primary-dark text-xs font-semibold rounded-full">{skill}</span>) : 
                            <p className="text-sm text-slate-500">No specific skills identified.</p>
                        }
                    </div>
                </div>

                {/* ✅ THIS IS THE NEW CERTIFICATIONS SECTION */}
                <div>
                    <h4 className="text-base font-bold text-slate-800 mb-3">Certifications</h4>
                    <div className="flex flex-wrap gap-2">
                        {candidate.ai_analysis?.certifications?.length > 0 ? 
                            candidate.ai_analysis.certifications.map(cert => (
                                <span key={cert} className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                                    {cert}
                                </span>
                            )) : 
                            <p className="text-sm text-slate-500">No certifications found.</p>
                        }
                    </div>
                </div>

            </div>);
        }
    };
    
    return (
        <div className="space-y-6">
            <div>
                <a 
                    href="#" 
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 px-3 py-1.5 rounded-md transition-colors mb-2" 
                    onClick={(e) => {e.preventDefault(); setActivePage('candidates')}}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                    Back to Candidates
                </a>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight uppercase">{candidate.name}</h1>
                    <div className="flex items-center gap-3">
                        {candidate.resume_path && ( <a href={`/${candidate.resume_path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors bg-white text-slate-800 border border-slate-300 hover:bg-slate-50">View Resume</a> )}
                        <Button onClick={() => setUpdateModalOpen(true)}>Update Status</Button>
                    </div>
                </div>
            </div>
            
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
                <StageTracker currentStatus={candidate.status} stageOrder={detail_page_config.stage_order} stageNames={detail_page_config.stage_names} stageGroups={detail_page_config.stage_groups} />
                <div className="flex flex-col md:flex-row justify-between md:items-center px-6 py-3 border-b border-slate-200 gap-4">
                    <div className="flex items-center gap-6 overflow-x-auto custom-scrollbar -mb-px"><button className={`py-2 text-sm font-semibold border-b-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`} onClick={() => setActiveTab('profile')}>Profile & AI Analysis</button><button className={`py-2 text-sm font-semibold border-b-2 whitespace-nowrap ${activeTab === 'timeline' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`} onClick={() => setActiveTab('timeline')}>Activity Timeline</button><button className={`py-2 text-sm font-semibold border-b-2 whitespace-nowrap ${activeTab === 'interviews' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`} onClick={() => setActiveTab('interviews')}>Interviews & Feedback</button><button className={`py-2 text-sm font-semibold border-b-2 whitespace-nowrap ${activeTab === 'notes' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-800'}`} onClick={() => setActiveTab('notes')}>Notes</button></div>
                    <div className="text-sm text-slate-500 shrink-0">Current Status: <strong className="text-primary-dark">{candidate.status}</strong></div>
                </div>
                <div className="p-6">{renderTabContent()}</div>
            </div>

            <Modal isOpen={isUpdateModalOpen} onClose={() => setUpdateModalOpen(false)}>
                <div className="p-6"><div className="flex justify-between items-start"><h2 className="text-xl font-bold text-slate-800">Update Candidate Status</h2><button onClick={() => setUpdateModalOpen(false)} className="text-slate-500 hover:text-slate-800 text-2xl leading-none">&times;</button></div><form onSubmit={handleUpdateStatus} className="mt-6 space-y-4">
                    <div><label className="text-sm font-medium text-slate-600 mb-1 block">New Status</label><select name="status" defaultValue={candidate.status} required className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"><option value="">Select a status</option>{all_status_options.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div><label className="text-sm font-medium text-slate-600 mb-1 block">Comments / Reason</label><textarea name="comments" rows="3" placeholder={canReschedule ? "Provide a reason for rescheduling..." : "Add optional comments"} className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-light focus:border-primary outline-none"></textarea></div>
                    <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-slate-200">
                        <Button type="button" variant="secondary" onClick={() => setUpdateModalOpen(false)}>Cancel</Button>
                        {canReschedule && (<button type="button" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm transition-colors text-amber-700 bg-white border border-amber-300 hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500" onClick={handleReschedule}>Re-schedule</button>)}
                        <Button type="submit">Save Status</Button>
                    </div></form></div>
            </Modal>
        </div>
    );
}