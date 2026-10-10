import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Plane, AlertTriangle, Network, FileSearch } from 'lucide-react';

interface InvestigationBreadcrumbsProps {
  currentLevel: 1 | 2 | 3 | 4;
  selectedIncidentId?: string | null;
  selectedEventId?: string | null;
  onOpenEvidenceModal?: () => void;
}

export const InvestigationBreadcrumbs: React.FC<InvestigationBreadcrumbsProps> = ({
  currentLevel,
  selectedIncidentId,
  selectedEventId,
  onOpenEvidenceModal
}) => {
  const navigate = useNavigate();

  const steps = [
    {
      level: 1,
      title: 'Level 1: Flight Overview',
      subtitle: 'Multi-System Summary',
      icon: Plane,
      path: '/overview'
    },
    {
      level: 2,
      title: 'Level 2: Faults & Events',
      subtitle: selectedIncidentId ? selectedIncidentId : 'Select Candidate Incident',
      icon: AlertTriangle,
      path: selectedIncidentId ? `/faults?incident_id=${selectedIncidentId}` : '/faults'
    },
    {
      level: 3,
      title: 'Level 3: Operation Context',
      subtitle: 'Synchronized Channel Explorer',
      icon: Network,
      path: selectedIncidentId ? `/context/${selectedIncidentId}` : '/context/INC_0014'
    },
    {
      level: 4,
      title: 'Level 4: Evidence Detail',
      subtitle: selectedEventId ? `${selectedEventId.slice(0, 16)}...` : 'Immutable Source Records',
      icon: FileSearch,
      action: onOpenEvidenceModal
    }
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Step Items */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentLevel === step.level;
            const isPast = currentLevel > step.level;

            return (
              <React.Fragment key={step.level}>
                <button
                  onClick={() => {
                    if (step.action) {
                      step.action();
                    } else if (step.path) {
                      navigate(step.path);
                    }
                  }}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all text-left border ${
                    isActive
                      ? 'bg-sky-50 text-sky-900 border-sky-300 font-bold shadow-xs'
                      : isPast
                      ? 'bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                      : 'bg-white text-slate-400 hover:text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-700' : isPast ? 'text-slate-700' : 'text-slate-400'}`} />
                  <div>
                    <span className="block text-[11px] font-semibold leading-tight">{step.title}</span>
                    <span className={`block text-[10px] ${isActive ? 'text-sky-800' : 'text-slate-500'} font-sans font-normal truncate max-w-[130px]`}>
                      {step.subtitle}
                    </span>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-0.5 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Active Incident Identifier Bar */}
        {selectedIncidentId && (
          <div className="self-end md:self-center px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-600" />
            <span>Active Incident: <strong className="text-slate-900">{selectedIncidentId}</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestigationBreadcrumbs;
