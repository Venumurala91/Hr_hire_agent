import React from 'react';

const CheckIcon = () => <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"></path></svg>;
const CrossIcon = () => <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"></path></svg>;

export function StageTracker({ currentStatus, stageOrder, stageNames, stageGroups }) {
  if (!currentStatus || !stageOrder || !stageNames || !stageGroups) return null;

  function getStageState(evaluatingStageKey, currentStatus) {
    const lowerCaseStatus = currentStatus.toLowerCase();
    
    // === THIS IS THE FIX: Changed 'lowerCase-status' to 'lowerCaseStatus' ===
    const isRejectedStatus = lowerCaseStatus.includes('rejected') || lowerCaseStatus.includes('declined');
    const isCompletedStatus = lowerCaseStatus.includes('selected') || lowerCaseStatus.includes('cleared') || lowerCaseStatus.includes('joined');
    
    const currentStageKey = stageOrder.find(key => stageGroups[key].includes(currentStatus));
    if (!currentStageKey) return 'pending';
    
    const evaluatingStageIndex = stageOrder.indexOf(evaluatingStageKey);
    const currentStageIndex = stageOrder.indexOf(currentStageKey);
    
    if (evaluatingStageIndex < currentStageIndex) { return 'completed'; }
    
    if (evaluatingStageIndex === currentStageIndex) { 
        if (isRejectedStatus) { return 'rejected'; } 
        if (isCompletedStatus) { return 'completed'; } 
        return 'in-progress'; 
    }
    
    if (evaluatingStageIndex > currentStageIndex) { return isRejectedStatus ? 'skipped' : 'pending'; }
    
    return 'pending';
  }

  const stages = stageOrder.map(stageKey => ({ key: stageKey, name: stageNames[stageKey], state: getStageState(stageKey, currentStatus) }));
  
  const stateClasses = {
    completed: { node: 'bg-green-500 border-green-500 text-white', name: 'text-slate-800 font-semibold' },
    rejected: { node: 'bg-red-500 border-red-500 text-white', name: 'text-red-600 font-semibold' },
    'in-progress': { node: 'bg-primary-light border-primary animate-pulse', name: 'text-primary-dark font-semibold' },
    skipped: { node: 'bg-slate-100 border-slate-300', name: 'text-slate-400 line-through' },
    pending: { node: 'bg-white border-slate-300', name: 'text-slate-400' }
  };

  return (
    <div className="px-6 py-4">
      <div className="flex items-center">
        {stages.map((stage, index) => (
          <React.Fragment key={stage.key}>
            <div className="flex flex-col items-center text-center">
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${stateClasses[stage.state].node}`}>
                {stage.state === 'completed' && <CheckIcon />}
                {stage.state === 'rejected' && <CrossIcon />}
              </div>
              <div className={`mt-2 text-xs font-medium transition-all duration-300 ${stateClasses[stage.state].name}`}>{stage.name}</div>
            </div>
            {index < stages.length - 1 && <div className={`flex-grow h-0.5 mx-2 transition-colors duration-300 ${stages[index].state === 'completed' || stages[index].state === 'in-progress' ? 'bg-primary' : 'bg-slate-200'}`}></div>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}