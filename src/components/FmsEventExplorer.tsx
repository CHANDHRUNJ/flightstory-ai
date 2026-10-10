import React, { useState, useEffect, useMemo } from 'react';
import type { GalaxyResponse, GalaxyContextEvent } from '../services/apiService';
import { apiService } from '../services/apiService';
import { 
  AlertTriangle,
  Clock, 
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  Layers,
  Info,
  Calendar,
  CheckCircle2
} from 'lucide-react';

export type SelectionMode = 'A' | 'B' | 'C' | 'A_B' | 'A_C' | 'B_C' | 'A_B_C';

interface FmsEventExplorerProps {
  incidentId: string;
  onOpenInspector: (eventId: string) => void;
}

interface NodeLaneConfig {
  id: string;
  name: string;
  role: string;
  badgeBg: string;
  textColor: string;
  borderColor: string;
  trackColor: string;
}

const ALL_NODES: Record<string, NodeLaneConfig> = {
  NODE_A: {
    id: 'NODE_A',
    name: 'FMS A (NODE_A)',
    role: 'Left Channel (Master)',
    badgeBg: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    trackColor: '#64748b'
  },
  NODE_B: {
    id: 'NODE_B',
    name: 'FMS B (NODE_B)',
    role: 'Center Channel (Standby)',
    badgeBg: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    trackColor: '#64748b'
  },
  NODE_C: {
    id: 'NODE_C',
    name: 'FMS C (NODE_C)',
    role: 'Right Channel (Spare)',
    badgeBg: 'bg-slate-100',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300',
    trackColor: '#64748b'
  }
};

const MODE_TO_NODES: Record<SelectionMode, string[]> = {
  A: ['NODE_A'],
  B: ['NODE_B'],
  C: ['NODE_C'],
  A_B: ['NODE_A', 'NODE_B'],
  A_C: ['NODE_A', 'NODE_C'],
  B_C: ['NODE_B', 'NODE_C'],
  A_B_C: ['NODE_A', 'NODE_B', 'NODE_C']
};

export const FmsEventExplorer: React.FC<FmsEventExplorerProps> = ({
  incidentId,
  onOpenInspector
}) => {
  const [data, setData] = useState<GalaxyResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // View Controls
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('A_B_C');
  const [incidentOnly, setIncidentOnly] = useState<boolean>(false);
  const [contextSpan, setContextSpan] = useState<number>(30); // +/- 30s
  const [comparisonWindowSeconds, setComparisonWindowSeconds] = useState<number>(0); // 0 = exact, 2 = +/-2s

  // Selection & Navigation
  const [selectedTimestamp, setSelectedTimestamp] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  // Filter toggle
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    apiService.getIncidentGalaxy(incidentId, contextSpan)
      .then((res) => {
        if (isMounted) {
          setData(res);
          setLoading(false);
          // Auto select first incident event or earliest event
          if (res.context_events.length > 0) {
            const firstIncidentEv = res.context_events.find(e => e.is_in_selected_incident) || res.context_events[0];
            setSelectedTimestamp(firstIncidentEv.event_time);
            setSelectedEventId(firstIncidentEv.source_record_id);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch FMS timeline data');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [incidentId, contextSpan]);

  const activeNodeIds = useMemo(() => MODE_TO_NODES[selectionMode], [selectionMode]);

  // Filtered events
  const filteredEvents = useMemo(() => {
    if (!data) return [];
    return data.context_events.filter(ev => {
      if (!activeNodeIds.includes(ev.node_id)) return false;
      if (incidentOnly && !ev.is_in_selected_incident) return false;
      if (selectedCategory !== 'ALL' && !ev.log_family.includes(selectedCategory)) return false;
      return true;
    });
  }, [data, activeNodeIds, incidentOnly, selectedCategory]);

  // Chronological list of events for previous/next stepping
  const sortedActiveEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => 
      new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
    );
  }, [filteredEvents]);

  // Active event index
  const currentEventIndex = useMemo(() => {
    if (!selectedEventId) return 0;
    const idx = sortedActiveEvents.findIndex(e => e.source_record_id === selectedEventId);
    return idx >= 0 ? idx : 0;
  }, [sortedActiveEvents, selectedEventId]);

  // Calculate timeline time bounds
  const { minEpoch, totalDuration } = useMemo(() => {
    if (!data || filteredEvents.length === 0) {
      return { minEpoch: 0, totalDuration: 1 };
    }

    if (incidentOnly) {
      const start = new Date(data.timeline_span.incident_start).getTime() / 1000;
      const end = new Date(data.timeline_span.incident_end).getTime() / 1000;
      const duration = Math.max(1, end - start);
      return { minEpoch: start, totalDuration: duration };
    } else {
      const start = new Date(data.timeline_span.window_start).getTime() / 1000;
      const end = new Date(data.timeline_span.window_end).getTime() / 1000;
      const duration = Math.max(1, end - start);
      return { minEpoch: start, totalDuration: duration };
    }
  }, [data, filteredEvents, incidentOnly]);

  const getPercentFromTime = (isoTime: string) => {
    if (totalDuration <= 0) return 0;
    const epoch = new Date(isoTime).getTime() / 1000;
    const pct = ((epoch - minEpoch) / totalDuration) * 100;
    return Math.max(0, Math.min(100, pct));
  };

  // Group events by timestamp for the comparison table
  const comparisonRows = useMemo(() => {
    if (!data) return [];
    
    // Extract unique timestamps within the view
    const timeMap = new Map<string, Record<string, GalaxyContextEvent[]>>();
    
    filteredEvents.forEach(ev => {
      const timeKey = ev.event_time;
      if (!timeMap.has(timeKey)) {
        timeMap.set(timeKey, { NODE_A: [], NODE_B: [], NODE_C: [] });
      }
      const nodeObj = timeMap.get(timeKey)!;
      if (nodeObj[ev.node_id]) {
        nodeObj[ev.node_id].push(ev);
      }
    });

    const sortedTimes = Array.from(timeMap.keys()).sort((a, b) => 
      new Date(a).getTime() - new Date(b).getTime()
    );

    return sortedTimes.map(time => ({
      time,
      nodes: timeMap.get(time)!
    }));
  }, [filteredEvents, data]);

  // Events at selected timestamp (with optional +/- comparison window)
  const eventsAtSelectedTime = useMemo(() => {
    if (!selectedTimestamp || !data) return [];
    const targetEpoch = new Date(selectedTimestamp).getTime() / 1000;
    
    return filteredEvents.filter(ev => {
      const evEpoch = new Date(ev.event_time).getTime() / 1000;
      const diff = Math.abs(evEpoch - targetEpoch);
      return diff <= comparisonWindowSeconds;
    }).sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime());
  }, [filteredEvents, selectedTimestamp, comparisonWindowSeconds, data]);

  // Stepper handlers
  const handleStepPrevious = () => {
    if (sortedActiveEvents.length === 0) return;
    const prevIdx = Math.max(0, currentEventIndex - 1);
    const target = sortedActiveEvents[prevIdx];
    if (target) {
      setSelectedEventId(target.source_record_id);
      setSelectedTimestamp(target.event_time);
    }
  };

  const handleStepNext = () => {
    if (sortedActiveEvents.length === 0) return;
    const nextIdx = Math.min(sortedActiveEvents.length - 1, currentEventIndex + 1);
    const target = sortedActiveEvents[nextIdx];
    if (target) {
      setSelectedEventId(target.source_record_id);
      setSelectedTimestamp(target.event_time);
    }
  };

  const getFamilyColor = (family: string) => {
    if (family.includes('FAULT')) return { bg: 'bg-rose-600', text: 'text-rose-700', lightBg: 'bg-rose-50 border-rose-200' };
    if (family.includes('NAV')) return { bg: 'bg-amber-500', text: 'text-amber-700', lightBg: 'bg-amber-50 border-amber-200' };
    if (family.includes('MODE')) return { bg: 'bg-slate-500', text: 'text-slate-700', lightBg: 'bg-slate-50 border-slate-200' };
    if (family.includes('DIAG')) return { bg: 'bg-slate-400', text: 'text-slate-700', lightBg: 'bg-slate-50 border-slate-200' };
    return { bg: 'bg-sky-600', text: 'text-sky-700', lightBg: 'bg-sky-50 border-sky-200' };
  };

  const formatTimeOnly = (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('T');
    return parts[1] ? parts[1].replace('Z', '') : iso;
  };

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-800">
        <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold">Synchronizing FMS Event Explorer Across Channels...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Failed to Load FMS Event Explorer</h4>
          <p className="text-xs text-rose-600 mt-0.5">{error || 'Unknown error occurred.'}</p>
        </div>
      </div>
    );
  }

  const incidentStartPct = getPercentFromTime(data.timeline_span.incident_start);
  const incidentEndPct = getPercentFromTime(data.timeline_span.incident_end);
  const incidentWidthPct = Math.max(1.5, incidentEndPct - incidentStartPct);

  const selectedTimePct = selectedTimestamp ? getPercentFromTime(selectedTimestamp) : null;

  return (
    <div className="space-y-6">
      {/* 1. SELECTION BAR: [ A ] [ B ] [ C ] [ A + B ] [ A + C ] [ B + C ] [ A + B + C ] */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-sky-700" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono">
              FMS Channel Selection Bar
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-sans">
            Select single or combined FMS channels to inspect synchronized behavior
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {[
            { mode: 'A' as SelectionMode, label: 'A', desc: 'FMS A Only (NODE_A)' },
            { mode: 'B' as SelectionMode, label: 'B', desc: 'FMS B Only (NODE_B)' },
            { mode: 'C' as SelectionMode, label: 'C', desc: 'FMS C Only (NODE_C)' },
            { mode: 'A_B' as SelectionMode, label: 'A + B', desc: 'FMS A & FMS B' },
            { mode: 'A_C' as SelectionMode, label: 'A + C', desc: 'FMS A & FMS C' },
            { mode: 'B_C' as SelectionMode, label: 'B + C', desc: 'FMS B & FMS C' },
            { mode: 'A_B_C' as SelectionMode, label: 'A + B + C', desc: 'All 3 Channels' },
          ].map(item => {
            const isActive = selectionMode === item.mode;
            return (
              <button
                key={item.mode}
                onClick={() => setSelectionMode(item.mode)}
                title={item.desc}
                className={`px-4 py-2 rounded-lg font-bold transition-all border shadow-xs ${
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 ring-2 ring-sky-500/50 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                [ {item.label} ]
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. INCIDENT HIGHLIGHT RIBBON & VIEW FILTERS */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
        {/* Incident Summary Pill */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-2 bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg">
            <span className="font-bold text-sky-900">{data.incident.incident_candidate_id}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-700 font-sans font-medium">{data.incident.confidence_explanation}</span>
          </div>

          <div className="flex items-center space-x-2 text-slate-600 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {formatTimeOnly(data.timeline_span.incident_start)} → {formatTimeOnly(data.timeline_span.incident_end)}
            </span>
            <span className="font-bold text-slate-800">({data.incident.duration_seconds}s span)</span>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px]">
            <span className="text-slate-500">Participating:</span>
            {data.incident.participating_nodes.map(n => (
              <span key={n} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                {n}
              </span>
            ))}
          </div>
        </div>

        {/* Filters & Toggles */}
        <div className="flex flex-col items-end gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              showFilters || incidentOnly || selectedCategory !== 'ALL' || contextSpan !== 30
                ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters {showFilters ? '▴' : '▾'}
          </button>

          {showFilters && (
            <div className="flex flex-wrap items-center gap-2.5 justify-end mt-1 animate-in fade-in slide-in-from-top-1">
              {/* Incident Only Toggle */}
              <button
                onClick={() => setIncidentOnly(!incidentOnly)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  incidentOnly
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                {incidentOnly ? 'Incident Events Only (Active)' : 'Incident Events Only'}
              </button>

              {/* Span Selector (when not incident only) */}
              {!incidentOnly && (
                <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-1 rounded-lg">
                  <span className="text-slate-500 px-1 text-[10px]">Context:</span>
                  {[15, 30, 60].map(s => (
                    <button
                      key={s}
                      onClick={() => setContextSpan(s)}
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        contextSpan === s
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      ±{s}s
                    </button>
                  ))}
                </div>
              )}

              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
              >
                <option value="ALL">All Categories</option>
                <option value="FAULT">Faults Only</option>
                <option value="MODE">Mode Transitions</option>
                <option value="NAV">Nav Updates</option>
                <option value="SYS">System Events</option>
                <option value="DIAG">Diagnostic Snapshots</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 3. SYNCHRONIZED MULTI-LANE TIMELINE */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
        {/* Timeline Header & Event Stepper */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
              <span>Synchronized Channel Timeline</span>
              <span className="text-xs font-normal text-slate-500 font-mono">
                ({filteredEvents.length} events displayed across {activeNodeIds.length} channel{activeNodeIds.length > 1 ? 's' : ''})
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Click any event marker or timestamp to inspect all channel activity at that exact second.
            </p>
          </div>

          {/* Previous / Next Stepper */}
          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={handleStepPrevious}
              disabled={currentEventIndex <= 0}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 flex items-center gap-1 font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous Event</span>
            </button>
            <span className="text-slate-600 text-[11px] px-1 font-bold">
              {sortedActiveEvents.length > 0 ? `${currentEventIndex + 1} / ${sortedActiveEvents.length}` : '0 / 0'}
            </span>
            <button
              onClick={handleStepNext}
              disabled={currentEventIndex >= sortedActiveEvents.length - 1}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 flex items-center gap-1 font-semibold transition-colors"
            >
              <span>Next Event</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Multi-Lane SVG & Visual Tracks */}
        <div className="relative border border-slate-200 rounded-xl bg-slate-50 overflow-hidden select-none">
          {/* Timeline Lanes Container */}
          <div className="relative py-4 px-4 sm:px-6 space-y-6">
            {/* Shaded Incident Band across all lanes (when not incident only mode) */}
            {!incidentOnly && (
              <div
                className="absolute top-0 bottom-0 bg-sky-500/10 border-l border-r border-sky-400 pointer-events-none z-0"
                style={{
                  left: `${incidentStartPct}%`,
                  width: `${incidentWidthPct}%`
                }}
              >
                <div className="absolute top-1 left-1.5 px-1.5 py-0.5 rounded bg-sky-700 text-white font-mono text-[9px] font-bold shadow-xs">
                  Incident Span ({data.incident.duration_seconds}s)
                </div>
              </div>
            )}

            {/* Selected Timestamp Playhead Line */}
            {selectedTimePct !== null && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none flex flex-col items-center"
                style={{ left: `${selectedTimePct}%` }}
              >
                <div className="w-0.5 h-full bg-slate-900 shadow-sm" />
                <div className="absolute -top-1 px-1.5 py-0.5 bg-slate-900 text-white font-mono text-[9px] font-bold rounded shadow-md whitespace-nowrap">
                  {formatTimeOnly(selectedTimestamp || '')}
                </div>
              </div>
            )}

            {/* Render Each Active Lane */}
            {activeNodeIds.map((nodeId) => {
              const nodeConfig = ALL_NODES[nodeId];
              const nodeEvents = filteredEvents.filter(e => e.node_id === nodeId);

              return (
                <div key={nodeId} className="relative z-10 space-y-1.5">
                  {/* Lane Label */}
                  <div className="flex items-center justify-between font-mono text-xs">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded font-bold border ${nodeConfig.badgeBg} ${nodeConfig.textColor} ${nodeConfig.borderColor}`}>
                        {nodeConfig.name}
                      </span>
                      <span className="text-[11px] text-slate-500 font-sans">
                        {nodeConfig.role}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-sans">
                      {nodeEvents.length} event{nodeEvents.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Lane Horizontal Track Line */}
                  <div className="relative h-10 bg-white border border-slate-200 rounded-lg flex items-center px-2 shadow-xs">
                    {/* Background Track Line */}
                    <div 
                      className="absolute left-2 right-2 h-0.5 rounded"
                      style={{ backgroundColor: nodeConfig.trackColor, opacity: 0.25 }}
                    />

                    {/* Event Markers plotted along track */}
                    {nodeEvents.map((ev) => {
                      const xPct = getPercentFromTime(ev.event_time);
                      const isSelected = selectedEventId === ev.source_record_id;
                      const isTimeMatch = selectedTimestamp === ev.event_time;
                      const colors = getFamilyColor(ev.log_family);

                      return (
                        <button
                          key={ev.source_record_id}
                          onClick={() => {
                            setSelectedTimestamp(ev.event_time);
                            setSelectedEventId(ev.source_record_id);
                          }}
                          title={`${ev.source_record_id} | ${formatTimeOnly(ev.event_time)}: ${ev.event_message}`}
                          className={`absolute -translate-x-1/2 cursor-pointer transition-all ${
                            isSelected
                              ? 'scale-150 z-30 ring-2 ring-slate-900 shadow-md'
                              : isTimeMatch
                              ? 'scale-125 z-25 ring-1 ring-sky-500'
                              : 'hover:scale-125 z-10 opacity-90'
                          }`}
                          style={{ left: `${xPct}%` }}
                        >
                          <span 
                            className={`block w-3.5 h-3.5 rounded-full ${colors.bg} border-2 border-white shadow-xs`} 
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time Axis at Bottom */}
          <div className="border-t border-slate-200 bg-white px-4 py-2 flex items-center justify-between text-[11px] font-mono text-slate-600">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {formatTimeOnly(incidentOnly ? data.timeline_span.incident_start : data.timeline_span.window_start)}
            </span>
            <span className="text-sky-800 font-bold flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-600" />
              Incident: {formatTimeOnly(data.timeline_span.incident_start)} → {formatTimeOnly(data.timeline_span.incident_end)}
            </span>
            <span>
              {formatTimeOnly(incidentOnly ? data.timeline_span.incident_end : data.timeline_span.window_end)}
            </span>
          </div>
        </div>

        {/* Visual Category Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 font-mono text-xs text-slate-600">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-slate-400 uppercase text-[10px] font-bold">Categories:</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Fault Records
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500" /> Mode Transitions
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Nav Updates
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" /> System Events
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Diag Snapshots
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-sans">
            Clicking any marker opens full record details below.
          </div>
        </div>
      </div>

      {/* 4. "EVENTS AT THIS TIME" PANEL & 5. "COMPARE SELECTED NODES" TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Top: "Events at this time" Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 font-mono text-xs">
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-sky-600" />
                <span className="font-bold text-slate-900 text-sm">
                  Events at this time
                </span>
              </div>
              
              {/* Window toggle: Exact vs +/-2s */}
              <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-0.5 rounded-lg text-[10px]">
                <button
                  onClick={() => setComparisonWindowSeconds(0)}
                  className={`px-2 py-0.5 rounded ${
                    comparisonWindowSeconds === 0 ? 'bg-sky-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Exact Second
                </button>
                <button
                  onClick={() => setComparisonWindowSeconds(2)}
                  className={`px-2 py-0.5 rounded ${
                    comparisonWindowSeconds === 2 ? 'bg-sky-600 text-white font-bold' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ±2s Window
                </button>
              </div>
            </div>

            {/* Selected Timestamp Display */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 font-mono text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase font-semibold">Active Timestamp</span>
                <span className="font-bold text-slate-900 text-sm">
                  {selectedTimestamp ? formatTimeOnly(selectedTimestamp) : 'None Selected'}
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  {selectedTimestamp || 'Click an event above to inspect'}
                </span>
              </div>
              <span className="px-2 py-1 bg-sky-100 text-sky-900 border border-sky-200 rounded font-bold text-xs">
                {eventsAtSelectedTime.length} Event{eventsAtSelectedTime.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* List of events at this time */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {eventsAtSelectedTime.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-500 text-xs">
                  No recorded events on the selected channel(s) at this exact second.
                </div>
              ) : (
                eventsAtSelectedTime.map((ev) => {
                  const nodeConfig = ALL_NODES[ev.node_id] || ALL_NODES['NODE_A'];
                  const colors = getFamilyColor(ev.log_family);
                  const isRecordSelected = selectedEventId === ev.source_record_id;

                  return (
                    <div
                      key={ev.source_record_id}
                      onClick={() => setSelectedEventId(ev.source_record_id)}
                      className={`p-3.5 rounded-xl border transition-all text-xs font-mono space-y-2 cursor-pointer ${
                        isRecordSelected
                          ? 'bg-sky-50/70 border-sky-400 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5">
                          <span className={`px-1.5 py-0.5 rounded font-bold border text-[10px] ${nodeConfig.badgeBg} ${nodeConfig.textColor} ${nodeConfig.borderColor}`}>
                            {nodeConfig.name.split(' ')[0]} {nodeConfig.name.split(' ')[1]}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${colors.lightBg} ${colors.text}`}>
                            {ev.log_family}
                          </span>
                        </div>
                        <span className="text-slate-500 text-[11px]">
                          {formatTimeOnly(ev.event_time)}
                        </span>
                      </div>

                      {/* Message / Description */}
                      <div className="space-y-1.5">
                        <p className="text-slate-800 font-sans text-xs font-medium leading-relaxed">
                          {ev.event_message}
                        </p>
                        {ev.original_fields?.raw_message_text && ev.original_fields.raw_message_text !== ev.event_message && (
                          <p className="text-slate-600 font-mono text-[10px] leading-relaxed border-l-2 border-slate-200 pl-2">
                            <span className="font-bold">Original: </span>{ev.original_fields.raw_message_text}
                          </p>
                        )}
                        {ev.is_in_selected_incident && (
                          <div className="inline-block mt-1 px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold border border-sky-200">
                            Linked to Incident
                          </div>
                        )}
                      </div>

                      {/* Technical Parameter info if present */}
                      {ev.original_fields?.message_parameters && Object.keys(ev.original_fields.message_parameters).length > 0 && (
                        <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[10px] space-y-0.5 text-slate-600">
                          {Object.entries(ev.original_fields.message_parameters).slice(0, 3).map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="font-semibold text-slate-700">{k}:</span>
                              <span className="font-mono">{v}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Inspect Action */}
                      <div className="pt-1 flex items-center justify-between border-t border-slate-100">
                        <span className="text-[10px] text-slate-400">
                          ID: {ev.source_record_id}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenInspector(ev.source_record_id);
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-sky-400" />
                          <span>View Evidence (Level 4)</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right / Bottom: "Compare selected nodes" Side-by-Side Table (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
                  <span>Compare Selected Nodes</span>
                  <span className="text-xs font-mono font-normal text-slate-500">
                    (Side-by-Side Multi-Channel Alignment)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Synchronous time slice comparison across active channels.
                </p>
              </div>

              <div className="flex items-center space-x-1.5 text-slate-500 text-[11px] font-mono">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Deterministic Log Alignment</span>
              </div>
            </div>

            {/* Side-by-Side Comparison Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-700">
                    <tr>
                      <th className="py-2.5 px-3 font-bold w-24 text-[11px]">Time</th>
                      {activeNodeIds.map(nodeId => {
                        const cfg = ALL_NODES[nodeId];
                        return (
                          <th key={nodeId} className="py-2.5 px-3 font-bold border-l border-slate-200 text-[11px]">
                            <span className={`px-1.5 py-0.5 rounded border ${cfg.badgeBg} ${cfg.textColor} ${cfg.borderColor}`}>
                              {cfg.name}
                            </span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {comparisonRows.length === 0 ? (
                      <tr>
                        <td colSpan={1 + activeNodeIds.length} className="p-8 text-center text-slate-500 font-sans">
                          No events found in active selection.
                        </td>
                      </tr>
                    ) : (
                      comparisonRows.map((row) => {
                        const isSelectedRow = selectedTimestamp === row.time;

                        return (
                          <tr
                            key={row.time}
                            onClick={() => {
                              setSelectedTimestamp(row.time);
                              // Pick first event in row if available
                              for (const n of activeNodeIds) {
                                if (row.nodes[n] && row.nodes[n].length > 0) {
                                  setSelectedEventId(row.nodes[n][0].source_record_id);
                                  break;
                                }
                              }
                            }}
                            className={`cursor-pointer transition-colors ${
                              isSelectedRow
                                ? 'bg-sky-50/80 font-medium'
                                : 'hover:bg-slate-50/60'
                            }`}
                          >
                            {/* Time Column */}
                            <td className="py-2.5 px-3 font-bold text-slate-800 text-[11px] whitespace-nowrap align-top">
                              {formatTimeOnly(row.time)}
                            </td>

                            {/* Node Columns */}
                            {activeNodeIds.map(nodeId => {
                              const evs = row.nodes[nodeId] || [];

                              return (
                                <td key={nodeId} className="py-2.5 px-3 border-l border-slate-200 align-top">
                                  {evs.length === 0 ? (
                                    <div className="text-[11px] text-slate-400 italic py-1 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                      <span>No matching record</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {evs.map(ev => {
                                        const colors = getFamilyColor(ev.log_family);
                                        return (
                                          <div
                                            key={ev.source_record_id}
                                            className="p-1.5 rounded bg-white border border-slate-200 shadow-2xs hover:border-sky-300 transition-colors"
                                          >
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                              <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${colors.lightBg} ${colors.text}`}>
                                                {ev.log_family.replace('_', ' ')}
                                              </span>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onOpenInspector(ev.source_record_id);
                                                }}
                                                className="text-[10px] text-sky-700 hover:text-sky-900 font-semibold underline"
                                              >
                                                Inspect
                                              </button>
                                            </div>
                                            <p className="text-[11px] font-sans text-slate-800 line-clamp-2 leading-tight">
                                              {ev.event_message}
                                            </p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Non-Technical Clarification Banner */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-sm flex items-start space-x-3 text-slate-800">
        <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs font-sans space-y-1">
          <span className="font-bold text-slate-900">Traceability & Engineering Rigor:</span>
          <p className="text-slate-600 leading-normal">
            “Synchronized alignment is derived directly from deterministic ISO 8601 timestamps recorded in each log file. The indication of ‘No matching record’ signifies that the channel logged no entry at that exact second under the current filters.”
          </p>
        </div>
      </div>
    </div>
  );
};

export default FmsEventExplorer;
