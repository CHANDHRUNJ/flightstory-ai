import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { IncidentCandidate, EventRecord } from '../services/apiService';
import { InvestigationBreadcrumbs } from '../components/InvestigationBreadcrumbs';
import { FmsEventExplorer } from '../components/FmsEventExplorer';
import { HowWeKnowInspector } from '../components/HowWeKnowInspector';
import { 
  Network, 
  RefreshCw, 
  AlertTriangle,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

export const OperationContextPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const incidentId = id || 'INC_0014';

  const [incident, setIncident] = useState<IncidentCandidate | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector Modal State (Level 4)
  const [inspectorEventId, setInspectorEventId] = useState<string | null>(null);
  const [selectedEventRecord, setSelectedEventRecord] = useState<EventRecord | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService.getIncidentById(incidentId)
      .then((inc) => {
        if (isMounted) {
          setIncident(inc);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || `Failed to load incident context for '${incidentId}'`);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  const handleOpenInspector = async (eventId: string) => {
    setInspectorEventId(eventId);
    try {
      const full = await apiService.getEventById(eventId);
      setSelectedEventRecord(full);
    } catch {
      setSelectedEventRecord(null);
    }
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-800">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
        <p className="text-sm font-semibold">Aligning Level 3 Operation Context Across Selected Channels...</p>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Failed to Load Operation Context</h4>
          <p className="text-xs text-rose-600 mt-0.5">{error || 'Unknown error occurred.'}</p>
          <button
            onClick={() => navigate('/faults')}
            className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-mono"
          >
            Return to Faults & Events
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Level Stepper Breadcrumbs */}
      <InvestigationBreadcrumbs
        currentLevel={3}
        selectedIncidentId={incident.incident_candidate_id}
        onOpenEvidenceModal={() => incident.ordered_event_references[0] && handleOpenInspector(incident.ordered_event_references[0])}
      />

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 font-mono text-xs">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-sans">
                Level 3 — Operation Context & Channel Synchronization
              </h2>
              <span className="text-slate-500 text-[11px]">
                Deterministic Multi-FMS Log Alignment • {incident.incident_candidate_id}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/faults?incident_id=${incident.incident_candidate_id}`)}
              className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              View AI Explanation (Level 2)
            </button>
            <button
              onClick={() => navigate('/overview')}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
              Flight Overview
            </button>
          </div>
        </div>
      </div>

      {/* Level 3 FMS Event Explorer */}
      <FmsEventExplorer
        incidentId={incident.incident_candidate_id}
        onOpenInspector={(evId) => handleOpenInspector(evId)}
      />

      {/* Level 4 Lossless Evidence Inspector Modal */}
      {inspectorEventId && (
        <HowWeKnowInspector
          sourceRecordId={inspectorEventId}
          eventRecord={selectedEventRecord}
          onClose={() => { setInspectorEventId(null); setSelectedEventRecord(null); }}
          onSelectEvent={(evId) => handleOpenInspector(evId)}
        />
      )}
    </div>
  );
};

export default OperationContextPage;
