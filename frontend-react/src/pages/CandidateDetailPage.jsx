import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../components/Modal';
import { StageTracker } from '../components/StageTracker';
import { ActivityTimeline } from '../components/ActivityTimeline';
import { InterviewLog } from '../components/InterviewLog';

// New component for the animated score circle
const ScoreCircle = ({ score }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const [offset, setOffset] = useState(circumference);

    useEffect(() => {
        // Trigger the animation after the component mounts
        const animationTimeout = setTimeout(() => {
            setOffset(circumference - (score / 100) * circumference);
        }, 100);
        return () => clearTimeout(animationTimeout);
    }, [score, circumference]);

    return (
        <svg className="score-svg" width="120" height="120" viewBox="0 0 120 120">
            <circle className="score-circle-bg" cx="60" cy="60" r={radius} />
            <circle
                className="score-circle-progress"
                cx="60"
                cy="60"
                r={radius}
                strokeDasharray={circumference}
                style={{ strokeDashoffset: offset }}
            />
            <text x="50%" y="50%" className="score-text">{score}%</text>
        </svg>
    );
};


export function CandidateDetailPage({ candidateId, setActivePage, apiFetch, showToast, STATUS_OPTIONS }) {
    const [candidate, setCandidate] = useState(null);
    const [interviews, setInterviews] = useState([]);
    const [notes, setNotes] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [isUpdateModalOpen, setUpdateModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [candidateData, interviewData] = await Promise.all([
                apiFetch(`/api/candidates/${candidateId}`),
                apiFetch(`/api/candidates/${candidateId}/interviews`)
            ]);
            setCandidate(candidateData);
            setInterviews(interviewData);
        } catch (error) {
            console.error("Failed to load candidate details", error);
            showToast("Could not load candidate details.", "error");
        } finally {
            setLoading(false);
        }
    }, [candidateId, apiFetch, showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const newStatus = formData.get('status');
        const comments = formData.get('comments');
        try {
            await apiFetch(`/api/candidates/${candidate.id}/update_status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus, comments })
            });
            setUpdateModalOpen(false);
            fetchData();
        } catch (error) {}
    };

    if (loading) {
        return <div className="placeholder-row">Loading candidate details...</div>;
    }

    if (!candidate) {
        return <div className="placeholder-row">Candidate not found. <a href="#" onClick={(e) => {e.preventDefault(); setActivePage('candidates');}}>Go back to list.</a></div>;
    }

    const renderTabContent = () => {
        switch (activeTab) {
            case 'timeline':
                return <ActivityTimeline history={candidate.status_history || []} />;
            case 'interviews':
                return <InterviewLog interviews={interviews} candidateId={candidateId} apiFetch={apiFetch} showToast={showToast} onInterviewAdded={fetchData} />;
            case 'notes':
                return (
                    <div className="tab-content">
                        <h4>Internal Notes</h4>
                        <textarea 
                            className="notes-textarea" 
                            rows="10" 
                            placeholder="Add notes about the candidate here. This is a UI demo and is not saved to the database."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        ></textarea>
                    </div>
                );
            case 'profile':
            default:
                return (
                    <div className="tab-content">
                        <div className="profile-grid">
                            <div className="profile-details">
                                <p><strong>Email:</strong> <span>{candidate.email}</span></p>
                                <p><strong>Phone:</strong> <span>{candidate.phone_number?.replace('whatsapp:', '') || 'N/A'}</span></p>
                                <p><strong>Education:</strong> <span>{candidate.ai_analysis?.education_summary || 'N/A'}</span></p>
                                <p><strong>Experience:</strong> <span>{candidate.ai_analysis?.years_of_experience || '0'} years</span></p>
                            </div>
                            <div className="profile-score">
                                <h4>ATS Score</h4>
                                <ScoreCircle score={Math.round(candidate.ats_score || 0)} />
                            </div>
                        </div>
                        <div className="profile-summary">
                            <h4>AI Shortlisting Summary</h4>
                            <p>{candidate.ai_analysis?.summary_reason || 'No AI summary available.'}</p>
                        </div>
                        <div className="profile-skills">
                            <h4>Matched Skills</h4>
                            <div className="skills-container">
                                {candidate.ai_analysis?.matched_skills?.length > 0
                                    ? candidate.ai_analysis.matched_skills.map(skill => <span key={skill} className="skill-pill">{skill}</span>)
                                    : <p>No specific skills identified.</p>
                                }
                            </div>
                        </div>
                    </div>
                );
        }
    };
    
    return (
        <>
            <div className="candidate-detail-page">
                <div className="detail-page-header">
                    <div>
                        <a href="#" className="back-link" onClick={(e) => {e.preventDefault(); setActivePage('candidates')}}>
                             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>
                            Back to Candidates
                        </a>
                        <h1>{candidate.name.toUpperCase()}</h1>
                    </div>
                    <div className="header-actions">
                         {candidate.resume_path && (
                            <a href={`/${candidate.resume_path}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                                View Resume
                            </a>
                        )}
                        <button className="btn btn-primary" onClick={() => setUpdateModalOpen(true)}>Update Status</button>
                    </div>
                </div>
                
                <div className="card">
                    <StageTracker currentStatus={candidate.status} statusHistory={candidate.status_history || []} />
                    
                    <div className="tabs-and-status-header">
                        <div className="detail-page-tabs">
                            <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Profile & AI Analysis</button>
                            <button className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>Activity Timeline</button>
                            <button className={`tab-btn ${activeTab === 'interviews' ? 'active' : ''}`} onClick={() => setActiveTab('interviews')}>Interviews & Feedback</button>
                            <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>Notes</button>
                        </div>
                         <div className="current-status-label">
                            Current Status: <strong>{candidate.status}</strong>
                        </div>
                    </div>
                    {renderTabContent()}
                </div>
            </div>

            <Modal isOpen={isUpdateModalOpen} onClose={() => setUpdateModalOpen(false)}>
                <div className="modal-header"><h2>Update Candidate Status</h2><button className="close-btn" onClick={() => setUpdateModalOpen(false)}>&times;</button></div>
                <form onSubmit={handleUpdateStatus}>
                    <div className="form-group"><label>New Status</label><select name="status" defaultValue={candidate.status} required><option value="">Select a status</option>{STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}</select></div>
                    <div className="form-group"><label>Comments (Optional)</label><textarea name="comments" rows="3"></textarea></div>
                    <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setUpdateModalOpen(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save Status</button></div>
                </form>
            </Modal>
        </>
    );
}