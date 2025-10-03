import React from 'react';

const CheckIcon = () => <svg style={{ width: '16px', height: '16px' }} viewBox="0 0 16 16" fill="currentColor"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"></path></svg>;
const CrossIcon = () => <svg style={{ width: '12px', height: '12px' }} viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"></path></svg>;

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

function getStageState(evaluatingStageKey, currentStatus) {
  const isRejectedStatus = currentStatus.toLowerCase().includes('rejected') || currentStatus.toLowerCase().includes('declined');
  const currentStageKey = STAGE_ORDER.find(key => STAGE_GROUPS[key].includes(currentStatus));
  if (!currentStageKey) return 'pending';
  const evaluatingStageIndex = STAGE_ORDER.indexOf(evaluatingStageKey);
  const currentStageIndex = STAGE_ORDER.indexOf(currentStageKey);

  if (evaluatingStageIndex === currentStageIndex) {
    return isRejectedStatus ? 'rejected' : 'in-progress';
  }
  if (evaluatingStageIndex < currentStageIndex) {
    return 'completed';
  }
  if (evaluatingStageIndex > currentStageIndex) {
    return isRejectedStatus ? 'skipped' : 'pending';
  }
  return 'pending';
}

export function StageTracker({ currentStatus, statusHistory = [] }) {
  if (!currentStatus) return null;

  const stages = STAGE_ORDER.map(stageKey => ({
    key: stageKey,
    name: STAGE_NAMES[stageKey],
    state: getStageState(stageKey, currentStatus),
  }));

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
    </div>
  );
}