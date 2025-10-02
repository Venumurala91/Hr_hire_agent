import React from 'react';

// Define icons for different states
const CheckIcon = () => <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 16 16" fill="currentColor"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"></path></svg>;
const CrossIcon = () => <svg style={{ width: '12px', height: '12px' }} viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"></path></svg>;

// These constants define the hiring funnel logic
const STAGE_ORDER = ["SCREENING", "L1_INTERVIEW", "L2_INTERVIEW", "HR_ROUND", "DOCUMENT_VERIFICATION", "OFFER", "JOINED"];
const STAGE_NAMES = { SCREENING: "Screening", L1_INTERVIEW: "L1 Interview", L2_INTERVIEW: "L2 Interview", HR_ROUND: "HR Round", DOCUMENT_VERIFICATION: "Documents", OFFER: "Offer", JOINED: "Joined" };
const STAGE_GROUPS = {
  SCREENING: ["ATS Shortlisted", "Resume declined"],
  L1_INTERVIEW: ["L1 interview scheduled", "L1 Selected", "L1 Rejected"],
  L2_INTERVIEW: ["L2 interview scheduled", "L2 Selected", "L2 Rejected"],
  HR_ROUND: ["HR scheduled", "HR Round Selected", "HR Round Rejected"],
  DOCUMENT_VERIFICATION: ["Document Verification Pending", "Documents Cleared", "Documents Rejected"],
  OFFER: ["Offer Letter Issued", "Offer Accepted", "Offer Rejected", "Candidate Not Joined"],
  JOINED: ["Candidate Joined"],
};

// =================================================================
// === THIS IS THE CORRECTED LOGIC =================================
// =================================================================
function getStageState(evaluatingStageKey, currentStatus) {
  const isRejectedStatus = currentStatus.toLowerCase().includes('rejected') || currentStatus.toLowerCase().includes('declined');

  // Find which stage the currentStatus belongs to
  const currentStageKey = STAGE_ORDER.find(key => STAGE_GROUPS[key].includes(currentStatus));
  
  // If the status is unknown, default everything to pending
  if (!currentStageKey) return 'pending';

  const evaluatingStageIndex = STAGE_ORDER.indexOf(evaluatingStageKey);
  const currentStageIndex = STAGE_ORDER.indexOf(currentStageKey);

  // Case 1: The stage being evaluated is the current stage
  if (evaluatingStageIndex === currentStageIndex) {
    return isRejectedStatus ? 'rejected' : 'in-progress';
  }
  
  // Case 2: The stage being evaluated is in the past
  if (evaluatingStageIndex < currentStageIndex) {
    return 'completed';
  }
  
  // Case 3: The stage being evaluated is in the future
  if (evaluatingStageIndex > currentStageIndex) {
    // If the candidate was rejected, all future stages are skipped
    if (isRejectedStatus) {
      return 'skipped';
    }
    return 'pending';
  }

  // Default fallback
  return 'pending';
}

export function StageTracker({ currentStatus, statusHistory = [] }) {
  if (!currentStatus) return null; // Don't render if there's no status

  const stages = STAGE_ORDER.map(stageKey => ({
    key: stageKey,
    name: STAGE_NAMES[stageKey],
    state: getStageState(stageKey, currentStatus),
  }));

  const activeStage = stages.find(s => s.state === 'in-progress' || s.state === 'rejected');

  return (
    <div className="stage-tracker-container">
      <div className="stage-tracker">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.key}>
            <div className={`stage-node ${stage.state}`}>
              <div className="stage-icon">
                {stage.state === 'completed' && <CheckIcon />}
                {stage.state === 'rejected' && <CrossIcon />}
              </div>
              <div className="stage-name">{stage.name}</div>
            </div>
            {index < stages.length - 1 && 
             <div className={`stage-connector ${stages[index].state === 'completed' || stages[index].state === 'in-progress' ? 'active' : ''}`}></div>
            }
          </React.Fragment>
        ))}
      </div>
      {activeStage && (
        <div className="current-status-label">
          Current Status: <strong>{currentStatus}</strong>
        </div>
      )}
    </div>
  );
}