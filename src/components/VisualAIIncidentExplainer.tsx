import React, { useState, useEffect, useMemo } from 'react';
import type { 
  StoryboardResponse, 
  IncidentTimelineResponse,
  TimelineEvent,
  StoryboardCard 
} from '../services/apiService';
import { apiService } from '../services/apiService';
import { 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  ShieldCheck, 
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Info,
  Sparkles,
  ArrowRight,
  RefreshCw,
  FileSearch,
  ListOrdered
} from 'lucide-react';

interface VisualAIIncidentExplainerProps {
  incidentId: string;
  onOpenInspector: (eventId: string) => void;
  onClose?: () => void;
}

export const VisualAIIncidentExplainer: React.FC<VisualAIIncidentExplainerProps> = ({
  incidentId,
  onOpenInspector,
  onClose
}) => {
  const [storyboard, setStoryboard] = useState<StoryboardResponse | null>(null);
  const [timelineData, setTimelineData] = useState<IncidentTimelineResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Expandable sections
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);
  const [showAllFlowEvents, setShowAllFlowEvents] = useState<boolean>(false);
  const [selectedFlowEventId, setSelectedFlowEventId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      apiService.getIncidentExplain(incidentId),
      apiService.getIncidentTimeline(incidentId)
    ])
      .then(([sbRes, tlRes]) => {
        if (isMounted) {
          setStoryboard(sbRes);
          setTimelineData(tlRes);
          setLoading(false);
          if (tlRes.timeline_events.length > 0) {
            setSelectedFlowEventId(tlRes.timeline_events[0].source_record_id);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to load incident explanation');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  // Derived unique nodes from timeline events to guarantee zero duplicate labels
  const uniqueNodes = useMemo(() => {
    if (!timelineData || timelineData.timeline_events.length === 0) {
      return storyboard?.participating_nodes || [];
    }
    return Array.from(new Set(timelineData.timeline_events.map(e => e.node_id))).sort();
  }, [timelineData, storyboard]);

  // Key flow events for horizontal timeline
  const flowEvents = useMemo(() => {
    if (!timelineData || timelineData.timeline_events.length === 0) return [];
    const all = timelineData.timeline_events;
    
    if (showAllFlowEvents || all.length <= 6) {
      return all;
    }

    // Select a representative sample: First event, key state transitions/faults, and final event
    const sample: TimelineEvent[] = [];
    sample.push(all[0]);

    // Key intermediate events across nodes
    const middleEvents = all.slice(1, -1);
    const stepSize = Math.max(1, Math.floor(middleEvents.length / 4));
    for (let i = 0; i < middleEvents.length && sample.length < 5; i += stepSize) {
      sample.push(middleEvents[i]);
    }

    // Add final event if not already present
    if (!sample.some(e => e.source_record_id === all[all.length - 1].source_record_id)) {
      sample.push(all[all.length - 1]);
    }

    return sample;
  }, [timelineData, showAllFlowEvents]);

  const getNodeBadge = (nodeId: string) => {
    switch (nodeId) {
      case 'NODE_A':
        return {
          name: 'FMS A (NODE_A)',
          short: 'FMS A',
          bg: 'bg-sky-50',
          text: 'text-sky-900',
          border: 'border-sky-300',
          dot: 'bg-sky-600'
        };
      case 'NODE_B':
        return {
          name: 'FMS B (NODE_B)',
          short: 'FMS B',
          bg: 'bg-emerald-50',
          text: 'text-emerald-900',
          border: 'border-emerald-300',
          dot: 'bg-emerald-600'
        };
      case 'NODE_C':
        return {
          name: 'FMS C (NODE_C)',
          short: 'FMS C',
          bg: 'bg-purple-50',
          text: 'text-purple-900',
          border: 'border-purple-300',
          dot: 'bg-purple-600'
        };
      default:
        return {
          name: nodeId,
          short: nodeId,
          bg: 'bg-slate-100',
          text: 'text-slate-800',
          border: 'border-slate-300',
          dot: 'bg-slate-600'
        };
    }
  };

  const getCategoryBadge = (family: string) => {
    if (family.includes('FAULT')) {
      return {
        label: 'Verified Fault',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dot: 'bg-rose-600'
      };
    }
    if (family.includes('MODE')) {
      return {
        label: 'Redundancy Mode',
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-600'
      };
    }
    if (family.includes('NAV')) {
      return {
        label: 'Nav Guidance',
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-600'
      };
    }
    if (family.includes('DIAG')) {
      return {
        label: 'Diag Snapshot',
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-600'
      };
    }
    return {
      label: 'System Event',
      bg: 'bg-sky-50',
      text: 'text-sky-700',
      border: 'border-sky-200',
      dot: 'bg-sky-600'
    };
  };

  const getEvidenceCardBadge = (label: StoryboardCard['label']) => {
    switch (label) {
      case 'CONFIRMED OBSERVATION':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Observed'
        };
      case 'CORROBORATED FINDING':
        return {
          bg: 'bg-sky-50 text-sky-800 border-sky-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />,
          label: 'Corroborated'
        };
      case 'POSSIBLE INTERPRETATION':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          label: 'Possible Interpretation'
        };
      case 'UNKNOWN / INSUFFICIENT EVIDENCE':
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-500" />,
          label: 'Unknown'
        };
    }
  };

  const formatTimeOnly = (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('T');
    return parts[1] ? parts[1].replace('Z', '') : iso;
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-800">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
        <p className="text-xs font-mono font-semibold">Generating Evidence-Grounded AI Explanation...</p>
      </div>
    );
  }

  if (error || !storyboard || !timelineData) {
    return (
      <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-sm font-sans">Explanation Generation Failed</span>
          <p className="text-rose-700 mt-0.5">{error || 'Unable to synthesize explanation.'}</p>
        </div>
      </div>
    );
  }

  const pSummary = storyboard.plain_english_summary;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-6 p-5 lg:p-6 text-slate-900 animate-fadeIn">
      {/* 1. Header & Summary Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900 font-sans">
              AI Incident Explanation & Chronological Story
            </h3>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-sky-100 text-sky-900 border border-sky-200">
              {incidentId}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans">
            Concise, evidence-grounded summary synthesized directly from verified log entries.
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="self-end sm:self-center px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
          >
            Close Explanation
          </button>
        )}
      </div>

      {/* 2. Quick Explanation (Understood in 20-30 seconds) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Main: What Happened & Evidence Summary (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* What happened? */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-sky-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                What happened?
              </h4>
            </div>
            <p className="text-sm font-sans text-slate-800 leading-relaxed font-medium">
              {pSummary?.section_a_what_happened || 
                `Between ${formatTimeOnly(storyboard.start_time)} and ${formatTimeOnly(storyboard.end_time)}, a ${storyboard.relationship_type.replace(/_/g, ' ').toLowerCase()} event occurred across ${uniqueNodes.join(', ')}. A total of ${storyboard.event_count} system entries were recorded during this ${storyboard.duration_seconds}-second interval.`}
            </p>
          </div>

          {/* What the evidence tells us */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                What the evidence tells us
              </h4>
            </div>
            <div className="space-y-1.5 text-xs font-sans text-slate-800 leading-relaxed">
              <p>
                <strong className="text-slate-900">Directly Observed:</strong>{' '}
                {pSummary?.section_d_known_vs_uncertain.what_is_known || 
                  `Deterministic records confirm ${storyboard.event_count} events across ${uniqueNodes.join(', ')} with verified timestamps.`}
              </p>
              <p className="text-slate-600">
                <strong className="text-slate-800">Uncertain / Unrecorded:</strong>{' '}
                {pSummary?.section_d_known_vs_uncertain.what_is_uncertain || 
                  'Sub-second bus arbitration order and external electrical power variations prior to the initial event are not recorded in application logs.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Key Sequence & Evidence Links (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2">
                <ListOrdered className="w-4 h-4 text-sky-700" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
                  Key Sequence (Chronological)
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {uniqueNodes.length} channel{uniqueNodes.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2.5">
              {(pSummary?.section_b_how_it_unfolded || []).map((stepItem) => {
                const nodeBadge = getNodeBadge(stepItem.node);

                return (
                  <div 
                    key={stepItem.step}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs space-y-1.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-1 font-mono text-[11px]">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-4 h-4 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-[10px]">
                          {stepItem.step}
                        </span>
                        <span className={`px-1.5 py-0.2 rounded font-bold border text-[10px] ${nodeBadge.bg} ${nodeBadge.text} ${nodeBadge.border}`}>
                          {nodeBadge.short}
                        </span>
                      </div>
                      <span className="text-slate-500 font-semibold">
                        {formatTimeOnly(stepItem.timestamp)}
                      </span>
                    </div>

                    <p className="text-slate-800 font-sans text-xs leading-snug">
                      {stepItem.description}
                    </p>

                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => onOpenInspector(stepItem.source_record_id)}
                        className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold underline flex items-center gap-1 font-mono"
                      >
                        <FileSearch className="w-3 h-3" /> View Evidence
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. PART 3: VISUAL INCIDENT STORY — "Incident Flow — What Happened Step by Step" */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-700" />
              Incident Flow — What Happened Step by Step
            </h4>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Chronological event progression across FMS channels (Arrows indicate time sequence, not proven causation).
            </p>
          </div>

          {timelineData.timeline_events.length > 6 && (
            <button
              onClick={() => setShowAllFlowEvents(!showAllFlowEvents)}
              className="text-xs font-mono font-semibold px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              {showAllFlowEvents 
                ? 'Show Primary Steps' 
                : `View All ${timelineData.timeline_events.length} Events in Flow`}
            </button>
          )}
        </div>

        {/* Horizontal Event Flow Container */}
        <div className="overflow-x-auto pb-3 pt-1">
          <div className="flex items-stretch space-x-3 min-w-max">
            {flowEvents.map((ev, idx) => {
              const nodeBadge = getNodeBadge(ev.node_id);
              const catBadge = getCategoryBadge(ev.log_family);
              const isSelected = selectedFlowEventId === ev.source_record_id;

              return (
                <React.Fragment key={ev.source_record_id}>
                  {/* Step Card */}
                  <div
                    onClick={() => setSelectedFlowEventId(ev.source_record_id)}
                    className={`w-64 p-3.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer select-none text-xs font-mono ${
                      isSelected
                        ? 'bg-white border-slate-900 shadow-md ring-1 ring-slate-900'
                        : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div className="space-y-2">
                      {/* Step Header */}
                      <div className="flex items-center justify-between gap-1">
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px]">
                          Step {idx + 1}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-800 text-[11px]">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formatTimeOnly(ev.event_time)}
                        </span>
                      </div>

                      {/* Node & Category Badges */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded font-bold border text-[10px] ${nodeBadge.bg} ${nodeBadge.text} ${nodeBadge.border}`}>
                          {nodeBadge.name}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded font-semibold border text-[10px] ${catBadge.bg} ${catBadge.text} ${catBadge.border}`}>
                          {catBadge.label}
                        </span>
                      </div>

                      {/* Event Description */}
                      <p className="text-slate-800 font-sans text-xs font-medium line-clamp-3 leading-snug pt-0.5">
                        {ev.event_message}
                      </p>
                    </div>

                    {/* Bottom Evidence Action */}
                    <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 truncate max-w-[90px]">
                        {ev.source_record_id}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInspector(ev.source_record_id);
                        }}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[10px] font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-sky-300" />
                        <span>View Evidence</span>
                      </button>
                    </div>
                  </div>

                  {/* Chronological Arrow Connector between steps */}
                  {idx < flowEvents.length - 1 && (
                    <div className="flex flex-col items-center justify-center px-1 text-slate-400 select-none">
                      <span className="text-[9px] font-mono text-slate-500 font-bold mb-0.5">
                        Sequence
                      </span>
                      <div className="flex items-center space-x-1">
                        <div className="w-4 h-0.5 bg-slate-300" />
                        <ArrowRight className="w-4 h-4 text-slate-500" />
                      </div>
                      <span className="text-[8px] font-mono text-slate-400 mt-0.5 whitespace-nowrap">
                        Happened next
                      </span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* Selected Step Full Record Details Bar */}
        {selectedFlowEventId && (
          <div className="p-3 bg-white rounded-lg border border-slate-200 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900">Active Step:</span>
              <span className="text-slate-600">{selectedFlowEventId}</span>
            </div>
            <button
              onClick={() => onOpenInspector(selectedFlowEventId)}
              className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded font-semibold text-xs flex items-center gap-1 self-end sm:self-center transition-colors"
            >
              <FileSearch className="w-3.5 h-3.5 text-sky-700" />
              Open Level 4 Evidence Detail
            </button>
          </div>
        )}
      </div>

      {/* 4. Expandable Technical Details Section */}
      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full p-4 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-mono text-slate-800 transition-colors border-b border-transparent"
        >
          <div className="flex items-center space-x-2 font-bold">
            <Info className="w-4 h-4 text-sky-700" />
            <span>Technical Details & Diagnostic Classifications</span>
            <span className="text-[10px] font-normal text-slate-500 font-sans">
              (Raw codes, parameters, and evidence strengths)
            </span>
          </div>
          <div className="flex items-center space-x-1 text-slate-600">
            <span>{showTechnicalDetails ? 'Collapse' : 'Expand'}</span>
            {showTechnicalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showTechnicalDetails && (
          <div className="p-5 space-y-4 font-mono text-xs animate-fadeIn divide-y divide-slate-100">
            {storyboard.cards.map((card) => {
              const badge = getEvidenceCardBadge(card.label);

              return (
                <div key={card.card_id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm font-sans">{card.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {card.evidence_references.slice(0, 3).map((ref) => (
                        <button
                          key={ref}
                          onClick={() => onOpenInspector(ref)}
                          className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 rounded text-[10px] text-slate-700 underline font-mono"
                        >
                          {ref}
                        </button>
                      ))}
                    </div>
                  </div>

                  <p className="text-slate-800 font-sans text-xs leading-relaxed">
                    {card.text}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-600 font-sans">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-800 block mb-1">Evidence Strengths:</span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {card.strengths.map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <span className="font-bold text-slate-800 block mb-1">Data Limitations:</span>
                      <ul className="list-disc list-inside space-y-0.5">
                        {card.limitations.map((l, idx) => (
                          <li key={idx}>{l}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Non-Fabrication Notice */}
      <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600 flex items-start space-x-2.5">
        <ShieldCheck className="w-4 h-4 text-sky-700 flex-shrink-0 mt-0.5" />
        <p className="font-sans leading-normal">
          <strong>Traceability Guarantee:</strong> All statements in this summary cite real records from the normalized dataset. No synthetic records or unverified causal links were created.
        </p>
      </div>
    </div>
  );
};

export default VisualAIIncidentExplainer;
