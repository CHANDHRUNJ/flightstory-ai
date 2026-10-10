import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { 
  IncidentCandidate, 
  IncidentTimelineResponse, 
  EventRecord 
} from '../services/apiService';
import { InvestigationBreadcrumbs } from '../components/InvestigationBreadcrumbs';
import { PersistentFilterBar, type FilterState } from '../components/PersistentFilterBar';
import { VisualAIIncidentExplainer } from '../components/VisualAIIncidentExplainer';
import { HowWeKnowInspector } from '../components/HowWeKnowInspector';
import { 
  AlertTriangle, 
  Clock, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  RefreshCw,
  Eye,
  Network,
  ShieldCheck,
  FileSearch,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export const FaultsAndEventsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const activeIncidentIdFromUrl = searchParams.get('incident_id') || 'INC_0014';

  const [incidents, setIncidents] = useState<IncidentCandidate[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentCandidate | null>(null);
  const [timelineData, setTimelineData] = useState<IncidentTimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Step / Event Index
  const [selectedEventIndex, setSelectedEventIndex] = useState<number>(0);

  // Inspector Modal State (Level 4)
  const [inspectorEventId, setInspectorEventId] = useState<string | null>(null);
  const [selectedEventRecord, setSelectedEventRecord] = useState<EventRecord | null>(null);

  // Visual AI Explanation toggle
  const [showExplanation, setShowExplanation] = useState<boolean>(false);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    node: 'ALL',
    family: 'ALL',
    category: 'ALL',
    keyword: '',
    startTime: '',
    endTime: ''
  });

  // Load Incidents
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService.getIncidents({ page: 1, page_size: 50 })
      .then((res) => {
        if (isMounted) {
          setIncidents(res.items);
          const found = res.items.find(i => i.incident_candidate_id === activeIncidentIdFromUrl) || res.items[0];
          setSelectedIncident(found);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load incident candidates.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeIncidentIdFromUrl]);

  // Load Timeline when selected incident changes
  useEffect(() => {
    if (!selectedIncident) return;
    let isMounted = true;

    apiService.getIncidentTimeline(selectedIncident.incident_candidate_id)
      .then((tl) => {
        if (isMounted) {
          setTimelineData(tl);
          setSelectedEventIndex(0);
        }
      })
      .catch(() => {
        // Fallback handled gracefully
      });

    return () => {
      isMounted = false;
    };
  }, [selectedIncident]);

  const handleSelectIncident = (inc: IncidentCandidate) => {
    setSelectedIncident(inc);
    setSearchParams({ incident_id: inc.incident_candidate_id });
  };

  const handleOpenInspector = async (eventId: string) => {
    setInspectorEventId(eventId);
    try {
      const full = await apiService.getEventById(eventId);
      setSelectedEventRecord(full);
    } catch {
      setSelectedEventRecord(null);
    }
  };

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter(inc => {
      if (filters.node !== 'ALL' && !inc.participating_nodes.includes(filters.node)) return false;
      if (filters.category !== 'ALL' && inc.relationship_type !== filters.category) return false;
      if (filters.keyword.trim() !== '') {
        const kw = filters.keyword.toLowerCase();
        const matchId = inc.incident_candidate_id.toLowerCase().includes(kw);
        const matchExpl = inc.confidence_explanation.toLowerCase().includes(kw);
        const matchRel = inc.relationship_type.toLowerCase().includes(kw);
        if (!matchId && !matchExpl && !matchRel) return false;
      }
      return true;
    });
  }, [incidents, filters]);

  // Derived unique nodes from timeline events to guarantee zero duplicate labels
  const participatingNodes = useMemo(() => {
    if (!timelineData || timelineData.timeline_events.length === 0) {
      return selectedIncident?.participating_nodes || [];
    }
    return Array.from(new Set(timelineData.timeline_events.map(e => e.node_id))).sort();
  }, [timelineData, selectedIncident]);

  // Current active event for stepper
  const currentEvent = useMemo(() => {
    if (!timelineData || timelineData.timeline_events.length === 0) return null;
    return timelineData.timeline_events[selectedEventIndex] || timelineData.timeline_events[0];
  }, [timelineData, selectedEventIndex]);

  const getNodeBadge = (nodeId: string) => {
    switch (nodeId) {
      case 'NODE_A':
        return { name: 'FMS A (NODE_A)', bg: 'bg-sky-50 text-sky-900 border-sky-300' };
      case 'NODE_B':
        return { name: 'FMS B (NODE_B)', bg: 'bg-emerald-50 text-emerald-900 border-emerald-300' };
      case 'NODE_C':
        return { name: 'FMS C (NODE_C)', bg: 'bg-purple-50 text-purple-900 border-purple-300' };
      default:
        return { name: nodeId, bg: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  const getCategoryBadge = (family: string) => {
    if (family.includes('FAULT')) return { label: 'Fault Record', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
    if (family.includes('MODE')) return { label: 'Mode State', bg: 'bg-purple-50 text-purple-700 border-purple-200' };
    if (family.includes('NAV')) return { label: 'Nav Guidance', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    if (family.includes('DIAG')) return { label: 'Diag Snapshot', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    return { label: 'System Event', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
  };

  const formatTimeOnly = (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('T');
    return parts[1] ? parts[1].replace('Z', '') : iso;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation Stepper */}
      <InvestigationBreadcrumbs
        currentLevel={2}
        selectedIncidentId={selectedIncident?.incident_candidate_id}
        selectedEventId={currentEvent?.source_record_id}
        onOpenEvidenceModal={() => currentEvent && handleOpenInspector(currentEvent.source_record_id)}
      />

      {/* Persistent Filter Bar */}
      <PersistentFilterBar
        filters={filters}
        onFilterChange={setFilters}
        onReset={() => setFilters({ node: 'ALL', family: 'ALL', category: 'ALL', keyword: '', startTime: '', endTime: '' })}
        totalFilteredCount={filteredIncidents.length}
      />

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main 2-Column Split: Incidents List (Left) + Selected Incident Details & Timeline (Right) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Candidate Incidents List */}
        <div className="col-span-12 lg:col-span-4 space-y-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-sky-700" /> Candidate Incidents ({filteredIncidents.length})
              </span>
              <span className="text-[11px] font-sans text-slate-400">Select to investigate</span>
            </div>

            <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
              {filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.incident_candidate_id === inc.incident_candidate_id;
                return (
                  <div
                    key={inc.incident_candidate_id}
                    onClick={() => handleSelectIncident(inc)}
                    className={`p-3.5 rounded-lg border transition-all cursor-pointer font-mono text-xs ${
                      isSelected
                        ? 'bg-sky-50/80 border-sky-400 shadow-sm ring-1 ring-sky-300'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${isSelected ? 'text-sky-900' : 'text-slate-900'}`}>
                        {inc.incident_candidate_id}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatTimeOnly(inc.start_time)} ({inc.duration_seconds}s)
                      </span>
                    </div>
                    <p className="text-[11px] font-sans text-slate-700 line-clamp-2 leading-snug">
                      {inc.confidence_explanation}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100 text-[10px] text-slate-500">
                      <span className="font-semibold text-slate-600">{inc.participating_nodes.join(', ')}</span>
                      <span className="text-sky-800 font-semibold">{inc.event_count} events</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Incident Header, AI Explanation, and Chronological Timeline */}
        <div className="col-span-12 lg:col-span-8 space-y-5">
          {loading || !selectedIncident ? (
            <div className="p-16 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
              <RefreshCw className="w-8 h-8 animate-spin text-sky-600 mx-auto mb-2" />
              <p className="text-xs font-mono text-slate-500">Loading incident data...</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Incident Header Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                      <span className="px-2.5 py-0.5 rounded font-bold bg-sky-100 text-sky-900 border border-sky-200">
                        {selectedIncident.incident_candidate_id}
                      </span>
                      <span className="px-2.5 py-0.5 rounded font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px]">
                        {selectedIncident.confidence_label} CONFIDENCE
                      </span>
                      <span className="text-purple-800 font-semibold text-xs">
                        {selectedIncident.relationship_type.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 font-sans leading-snug">
                      {selectedIncident.confidence_explanation}
                    </h3>

                    {/* Compact Metadata Row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="flex items-center gap-1 font-semibold text-slate-800">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatTimeOnly(selectedIncident.start_time)} → {formatTimeOnly(selectedIncident.end_time)} ({selectedIncident.duration_seconds}s)
                      </span>
                      <span>•</span>
                      <span>Channels: <strong className="text-slate-900">{participatingNodes.join(', ')}</strong></span>
                      <span>•</span>
                      <span>Records: <strong className="text-sky-800">{selectedIncident.event_count}</strong></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <button
                      onClick={() => setShowExplanation(!showExplanation)}
                      className={`px-4 py-2 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                        showExplanation
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'bg-sky-700 hover:bg-sky-800 text-white'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-sky-200" />
                      {showExplanation ? 'Hide Explanation' : 'Explain this incident'}
                    </button>

                    <button
                      onClick={() => navigate(`/context/${selectedIncident.incident_candidate_id}`)}
                      className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Network className="w-4 h-4 text-sky-700" />
                      Operation Context (Level 3)
                    </button>
                  </div>
                </div>

                {/* Non-Causation Callout Banner */}
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-sky-700 flex-shrink-0 mt-0.5" />
                  <p className="font-sans leading-normal">
                    <strong>Investigation Standard:</strong> Chronological sequence represents observed timeline associations across logs. Connectors and timestamps denote chronological order, not unverified root causation.
                  </p>
                </div>
              </div>

              {/* Dedicated Visual AI Explanation & Step-by-Step Flow Panel */}
              {showExplanation && (
                <VisualAIIncidentExplainer
                  incidentId={selectedIncident.incident_candidate_id}
                  onOpenInspector={(evId) => handleOpenInspector(evId)}
                  onClose={() => setShowExplanation(false)}
                />
              )}

              {/* Chronological Timeline Sequence */}
              {timelineData && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
                        <Clock className="w-4 h-4 text-sky-700" />
                        Chronological Event Progression ({timelineData.timeline_events.length} Events)
                      </h4>
                      <p className="text-xs text-slate-500 font-sans mt-0.5">
                        Complete ordered sequence of records logged across participating channels.
                      </p>
                    </div>

                    <div className="flex items-center space-x-1.5 text-[11px] font-mono text-slate-500">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Deterministic Time Order</span>
                    </div>
                  </div>

                  {/* Vertical Timeline List */}
                  <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                    {timelineData.timeline_events.map((ev, idx) => {
                      const nodeBadge = getNodeBadge(ev.node_id);
                      const catBadge = getCategoryBadge(ev.log_family);
                      const isSelected = selectedEventIndex === idx;

                      return (
                        <div
                          key={ev.source_record_id}
                          onClick={() => setSelectedEventIndex(idx)}
                          className={`p-3.5 rounded-lg border transition-all cursor-pointer font-mono text-xs space-y-2 ${
                            isSelected
                              ? 'bg-sky-50/70 border-sky-400 shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <div className="flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                                {idx + 1}
                              </span>
                              <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${nodeBadge.bg}`}>
                                {nodeBadge.name}
                              </span>
                              <span className={`px-2 py-0.5 rounded font-semibold border text-[10px] ${catBadge.bg}`}>
                                {catBadge.label}
                              </span>
                            </div>

                            <span className="text-slate-500 font-semibold text-[11px] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {formatTimeOnly(ev.event_time)}
                            </span>
                          </div>

                          <p className="text-slate-800 font-sans text-xs font-medium leading-relaxed">
                            {ev.event_message}
                          </p>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                            <span>ID: {ev.source_record_id}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenInspector(ev.source_record_id);
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 rounded font-semibold flex items-center gap-1 transition-colors"
                            >
                              <FileSearch className="w-3 h-3 text-sky-700" /> View Original Evidence
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Complete Chronological Stepper */}
              {timelineData && currentEvent && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 font-mono text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-500 uppercase text-[11px]">Event Stepper:</span>
                      <span className="font-bold text-slate-900">
                        Event {selectedEventIndex + 1} of {timelineData.timeline_events.length}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        disabled={selectedEventIndex <= 0}
                        onClick={() => setSelectedEventIndex(prev => Math.max(0, prev - 1))}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded disabled:opacity-40 flex items-center gap-1 text-xs font-semibold"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" /> Previous Event
                      </button>
                      <button
                        disabled={selectedEventIndex >= timelineData.timeline_events.length - 1}
                        onClick={() => setSelectedEventIndex(prev => Math.min(timelineData.timeline_events.length - 1, prev + 1))}
                        className="px-2.5 py-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded disabled:opacity-40 flex items-center gap-1 text-xs font-semibold"
                      >
                        Next Event <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center text-slate-600 text-xs">
                      <span>Record: <strong className="text-slate-900">{currentEvent.source_record_id}</strong></span>
                      <span>Channel: <strong className="text-sky-900">{currentEvent.node_id}</strong> • Family: <strong className="text-purple-800">{currentEvent.log_family}</strong></span>
                    </div>
                    <p className="text-xs font-sans font-semibold text-slate-900">
                      {currentEvent.event_message}
                    </p>
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => handleOpenInspector(currentEvent.source_record_id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold flex items-center gap-1.5 text-xs shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-sky-300" /> Open Level 4 Evidence Detail
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Level 4 Lossless Evidence Modal */}
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

export default FaultsAndEventsPage;
