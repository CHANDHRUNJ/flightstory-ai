import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { SummaryData, IncidentCandidate, EventRecord } from '../services/apiService';
import { InvestigationBreadcrumbs } from '../components/InvestigationBreadcrumbs';
import { HowWeKnowInspector } from '../components/HowWeKnowInspector';
import { DashboardMetrics } from '../components/DashboardMetrics';
import { FmsVisualization } from '../components/FmsVisualization';
import {
  Plane, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Cpu, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Filter,
  FileSearch,
  Info,
  RotateCcw
} from 'lucide-react';

interface FMSEventItem extends EventRecord {
  why_it_matters?: string;
  category_label?: string;
}

interface NodeData {
  items: EventRecord[];
  total: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
}

export const FlightOverviewPage: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [keyIncidents, setKeyIncidents] = useState<IncidentCandidate[]>([]);
  
  const [nodesState, setNodesState] = useState<Record<string, NodeData>>({
    NODE_A: { items: [], total: 0, page: 1, hasMore: true, loading: false },
    NODE_B: { items: [], total: 0, page: 1, hasMore: true, loading: false },
    NODE_C: { items: [], total: 0, page: 1, hasMore: true, loading: false }
  });
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inspector Modal State (Level 4)
  const [inspectorEventId, setInspectorEventId] = useState<string | null>(null);
  const [selectedEventRecord, setSelectedEventRecord] = useState<EventRecord | null>(null);

  // FMS Card Expand/Collapse States
  const [expandedFMS, setExpandedFMS] = useState<Record<string, boolean>>({
    NODE_A: true,
    NODE_B: true,
    NODE_C: true
  });

  // Expanded Event Detail Rows (accordion within timeline)
  const [expandedEventRows, setExpandedEventRows] = useState<Record<string, boolean>>({});

  // Filter States inside Flight Overview
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlySignificant, setOnlySignificant] = useState<boolean>(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchNodeEvents = async (nodeId: string, page: number, append: boolean = false) => {
    setNodesState(prev => ({ ...prev, [nodeId]: { ...prev[nodeId], loading: true } }));
    try {
      const res = await apiService.getEvents({
        node_id: nodeId,
        page,
        page_size: 30,
        keyword: debouncedSearch.trim() || undefined,
        log_family: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        significant_only: onlySignificant ? true : undefined
      });
      
      setNodesState(prev => {
        const existing = prev[nodeId];
        const newItems = append ? [...existing.items, ...res.items] : res.items;
        return {
          ...prev,
          [nodeId]: {
            items: newItems,
            total: res.total,
            page: res.page,
            hasMore: res.page < res.total_pages,
            loading: false
          }
        };
      });
    } catch (err) {
      console.error(err);
      setNodesState(prev => ({ ...prev, [nodeId]: { ...prev[nodeId], loading: false } }));
    }
  };

  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, incRes] = await Promise.all([
        apiService.getSummary(),
        apiService.getIncidents({ page: 1, page_size: 6, confidence: 'HIGH' })
      ]);
      setSummary(sumRes);
      setKeyIncidents(incRes.items);
      // Fetch initial events
      await Promise.all([
        fetchNodeEvents('NODE_A', 1, false),
        fetchNodeEvents('NODE_B', 1, false),
        fetchNodeEvents('NODE_C', 1, false)
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load flight overview telemetry.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Effect to refetch when filters change
  useEffect(() => {
    if (summary) {
      fetchNodeEvents('NODE_A', 1, false);
      fetchNodeEvents('NODE_B', 1, false);
      fetchNodeEvents('NODE_C', 1, false);
    }
  }, [debouncedSearch, selectedCategory, onlySignificant]);

  const handleOpenInspector = async (eventId: string) => {
    setInspectorEventId(eventId);
    try {
      const full = await apiService.getEventById(eventId);
      setSelectedEventRecord(full);
    } catch {
      setSelectedEventRecord(null);
    }
  };

  const toggleFMS = (nodeId: string) => {
    setExpandedFMS(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const toggleEventRow = (rowId: string) => {
    setExpandedEventRows(prev => ({ ...prev, [rowId]: !prev[rowId] }));
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setOnlySignificant(false);
  };

  const isAnyFilterActive = searchQuery.trim() !== '' || selectedCategory !== 'ALL' || onlySignificant;

  // Humanize "Why it matters" and Category
  const enrichEvent = (ev: EventRecord): FMSEventItem => {
    let why = 'Normal telemetry update during flight operation.';
    let category = 'System Event';

    if (ev.log_family.includes('FAULT')) {
      category = 'Fault Record';
      why = 'System error condition detected; logged for maintenance and redundancy assessment.';
    } else if (ev.log_family.includes('MODE')) {
      category = 'Mode Transition';
      why = 'FMS redundancy role assignment (Master / Standby / Spare) changed between channels.';
    } else if (ev.log_family.includes('NAV')) {
      category = 'Nav Guidance';
      why = 'Lateral/vertical guidance state or altitude sensor reference updated.';
    } else if (ev.log_family.includes('DIAG')) {
      category = 'Diagnostic Snapshot';
      why = 'RTOS task execution telemetry and internal partition memory snapshot.';
    } else if (ev.event_message.toLowerCase().includes('database') || ev.event_message.toLowerCase().includes('refresh')) {
      category = 'Nav DB Sync';
      why = 'Navigation database integrity cycle validated across active flight computers.';
    }

    return {
      ...ev,
      why_it_matters: why,
      category_label: category
    };
  };

  // Group and format events by FMS Node
  const fmsData = useMemo(() => {
    const nodes: Record<string, { 
      name: string; 
      title: string; 
      role: string; 
      color: string; 
      bg: string; 
      border: string; 
      events: FMSEventItem[];
      totalMatching: number;
    }> = {
      NODE_A: {
        name: 'FMS A — NODE_A',
        title: 'Left FMS Channel (Captain Side)',
        role: 'Master (Active Guidance)',
        color: 'text-sky-700',
        bg: 'bg-sky-50',
        border: 'border-sky-300',
        events: [],
        totalMatching: nodesState['NODE_A'].total
      },
      NODE_B: {
        name: 'FMS B — NODE_B',
        title: 'Center FMS Channel (Backup / Standby)',
        role: 'Standby / Synchronized',
        color: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-300',
        events: [],
        totalMatching: nodesState['NODE_B'].total
      },
      NODE_C: {
        name: 'FMS C — NODE_C',
        title: 'Right FMS Channel (First Officer Side)',
        role: 'Secondary Standby / Spare',
        color: 'text-purple-700',
        bg: 'bg-purple-50',
        border: 'border-purple-300',
        events: [],
        totalMatching: nodesState['NODE_C'].total
      }
    };

    (['NODE_A', 'NODE_B', 'NODE_C'] as const).forEach(nodeId => {
      const rawEvents = nodesState[nodeId].items || [];
      // Note: Backend handles filtering now. We just enrich and display.
      nodes[nodeId].events = rawEvents.map(enrichEvent);
    });

    return nodes;
  }, [nodesState]);

  if (loading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center space-y-3 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-800">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-600" />
        <p className="text-sm font-semibold">Loading FMS A, B, and C Multi-Channel Timelines...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-sm">Failed to Load Flight Overview</h4>
          <p className="text-xs text-rose-600 mt-0.5">{error || 'Unknown error occurred.'}</p>
          <button
            onClick={loadInitialData}
            className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-mono"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Level Stepper Breadcrumb */}
      <InvestigationBreadcrumbs currentLevel={1} />

      {/* Flight Metadata & Operational Period Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-sans">
                  Level 1 — Flight Overview & Multi-FMS Timelines
                </h2>
                <p className="text-xs text-slate-500 font-mono">
                  Recorded Operational Window: 09:12:00 → 09:27:00 (15 Minutes) • 5,257 Verified Records
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/faults')}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-sans font-semibold flex items-center shadow-xs transition-colors"
            >
              <Search className="w-4 h-4 mr-1.5" />
              Investigate Faults & Events (Level 2)
            </button>
          </div>
        </div>

        {/* Operational Context Facts Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block flex items-center gap-1 font-semibold">
              <Clock className="w-3.5 h-3.5 text-sky-700" /> Operational Period
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              2026-09-28 09:12:00 → 09:27:00
            </span>
            <span className="text-[11px] text-sky-800 font-medium">15 Minutes Total Span</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block flex items-center gap-1 font-semibold">
              <Plane className="w-3.5 h-3.5 text-purple-700" /> City Pair / Routing
            </span>
            <span className="text-xs font-bold text-amber-800 block">
              Not available in supplied logs
            </span>
            <span className="text-[11px] text-slate-500">Engineering log extract</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" /> Flight Phase
            </span>
            <span className="text-xs font-bold text-amber-800 block">
              Not available in supplied logs
            </span>
            <span className="text-[11px] text-slate-500">No discrete phase word in raw logs</span>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block flex items-center gap-1 font-semibold">
              <Cpu className="w-3.5 h-3.5 text-sky-700" /> FMS Architecture
            </span>
            <span className="text-xs font-bold text-slate-900 block">
              Triple Modular Redundant (TMR)
            </span>
            <span className="text-[11px] text-slate-600 font-sans">3 Cooperating FMS Channels</span>
          </div>
        </div>
      </div>

      {/* Interactive FMS Filter Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword or fault code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs w-48 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs text-slate-700"
            >
              <option value="ALL">All Event Categories</option>
              <option value="FAULT">Fault Records Only</option>
              <option value="MODE">Mode Transitions Only</option>
              <option value="NAV">Nav Guidance Only</option>
              <option value="SYS">System Events Only</option>
              <option value="DIAG">Diagnostic Snapshots</option>
            </select>
          </div>

          <label className="flex items-center space-x-1.5 cursor-pointer bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700">
            <input
              type="checkbox"
              checked={onlySignificant}
              onChange={(e) => setOnlySignificant(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-0"
            />
            <span className="font-semibold text-xs">Significant Events Only</span>
          </label>
        </div>

        {isAnyFilterActive && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            Clear All Filters
          </button>
        )}
      </div>

      {/* Interactive Hero FMS Visualization Suite */}
      <FmsVisualization />

      {/* Legacy Metrics */}
      <DashboardMetrics
        searchQuery={debouncedSearch}
        selectedCategory={selectedCategory}
        onlySignificant={onlySignificant}
        nodesState={nodesState}
      />

      {/* THREE SEPARATE, EQUALLY STRUCTURED FMS TIMELINE SECTIONS */}
      <div className="space-y-6">
        {(['NODE_A', 'NODE_B', 'NODE_C'] as const).map((nodeId) => {
          const fms = fmsData[nodeId];
          const isExpanded = !!expandedFMS[nodeId];
          const totalRecordsInNode = summary.records_by_node[nodeId] || 0;
          const matchingCount = fms.totalMatching;
          const displayedCount = fms.events.length;

          return (
            <section
              key={nodeId}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm transition-all"
            >
              {/* FMS Section Header */}
              <div
                onClick={() => toggleFMS(nodeId)}
                className="p-5 bg-slate-50 border-b border-slate-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${fms.bg} border ${fms.border} ${fms.color}`}>
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-slate-900 font-sans">
                        {fms.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white text-slate-700 border border-slate-200">
                        {fms.role}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      {fms.title} • <strong>{totalRecordsInNode.toLocaleString()}</strong> total records in dataset
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-center font-mono text-xs">
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded bg-white text-sky-900 border border-slate-200 font-bold text-[11px] block">
                      {matchingCount} Matching ({displayedCount} Displayed)
                    </span>
                  </div>
                  <div className="text-slate-500">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* FMS Vertical Timeline Content */}
              {isExpanded && (
                <div className="p-6 space-y-4">
                  {matchingCount === 0 ? (
                    <div className="py-10 px-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-600 font-mono text-xs space-y-2">
                      <Info className="w-6 h-6 mx-auto text-slate-400" />
                      <p className="font-bold text-slate-800 text-sm font-sans">
                        No events match active filters on {fms.name}
                      </p>
                      <p className="text-xs text-slate-500 font-sans max-w-md mx-auto">
                        Active Filters: {selectedCategory !== 'ALL' ? `Category: ${selectedCategory}, ` : ''}{onlySignificant ? 'Significant events only, ' : ''}{searchQuery ? `Search: "${searchQuery}"` : ''}
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={clearAllFilters}
                          className="px-3.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-sans font-semibold hover:bg-slate-800 transition-colors"
                        >
                          Clear All Filters to View {totalRecordsInNode.toLocaleString()} Records
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Vertical Timeline Items */}
                      {fms.events.map((ev) => {
                        const isRowExp = !!expandedEventRows[ev.source_record_id];

                        let badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                        if (ev.log_family.includes('FAULT')) badgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
                        if (ev.log_family.includes('MODE')) badgeColor = 'bg-purple-50 text-purple-800 border-purple-200';
                        if (ev.log_family.includes('NAV')) badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                        if (ev.log_family.includes('SYS')) badgeColor = 'bg-sky-50 text-sky-800 border-sky-200';

                        return (
                          <div
                            key={ev.source_record_id}
                            className={`p-4 rounded-lg border transition-all ${
                              ev.is_correlated 
                                ? 'bg-sky-50/30 border-sky-200 hover:border-sky-300' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Left: Timestamp & What Happened */}
                              <div className="space-y-1 flex-1">
                                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                                  <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {ev.event_time.split('T')[1]}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                                    {ev.category_label}
                                  </span>
                                  {ev.is_correlated && (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-900 border border-sky-200">
                                      CORRELATED ANOMALY
                                    </span>
                                  )}
                                </div>

                                <p className="text-sm font-sans font-semibold text-slate-900 mt-1">
                                  {ev.event_message}
                                </p>

                                <p className="text-xs font-sans text-slate-600">
                                  <strong className="text-slate-700 font-medium">Why it matters:</strong> {ev.why_it_matters}
                                </p>
                              </div>

                              {/* Right: Actions */}
                              <div className="flex items-center space-x-2 self-end sm:self-center flex-shrink-0 font-mono text-xs">
                                {ev.incident_candidate_ids && ev.incident_candidate_ids.length > 0 && (
                                  <button
                                    onClick={() => navigate(`/faults?incident_id=${ev.incident_candidate_ids![0]}`)}
                                    className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <span>Incident {ev.incident_candidate_ids[0]}</span>
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}

                                <button
                                  onClick={() => toggleEventRow(ev.source_record_id)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition-colors"
                                >
                                  {isRowExp ? 'Less' : 'Details'}
                                </button>

                                <button
                                  onClick={() => handleOpenInspector(ev.source_record_id)}
                                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                                >
                                  <FileSearch className="w-3 h-3 text-sky-300" />
                                  <span>Evidence</span>
                                </button>
                              </div>
                            </div>

                            {/* Collapsible Details Section */}
                            {isRowExp && (
                              <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-mono space-y-2 bg-slate-50/60 p-3 rounded-lg animate-fadeIn">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600">
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Record ID:</span>
                                    <span className="font-bold text-slate-800">{ev.source_record_id}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Source File:</span>
                                    <span className="text-slate-800 truncate block">{ev.source_file}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block text-[10px]">Sequence Number:</span>
                                    <span className="text-slate-800">{ev.source_sequence !== null ? `#${ev.source_sequence}` : 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {nodesState[nodeId].hasMore && (
                        <div className="pt-3 text-center">
                          <button
                            onClick={() => fetchNodeEvents(nodeId, nodesState[nodeId].page + 1, true)}
                            disabled={nodesState[nodeId].loading}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-2 mx-auto transition-colors disabled:opacity-50"
                          >
                            {nodesState[nodeId].loading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                            Load More Records
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Key Correlated Incidents Ribbon */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-sky-700" />
            <h3 className="text-sm font-bold text-slate-900 font-sans">
              Key Candidate Incidents Detected Across Channels
            </h3>
          </div>
          <button
            onClick={() => navigate('/faults')}
            className="text-xs text-sky-700 hover:text-sky-900 font-semibold flex items-center gap-1 font-sans"
          >
            <span>View all {summary.total_incidents} incidents</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {keyIncidents.map(inc => (
            <div
              key={inc.incident_candidate_id}
              onClick={() => navigate(`/faults?incident_id=${inc.incident_candidate_id}`)}
              className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-sky-50/50 hover:border-sky-300 transition-all cursor-pointer space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-900">{inc.incident_candidate_id}</span>
                <span className="text-[10px] text-slate-500 font-semibold">{inc.start_time.split('T')[1]} ({inc.duration_seconds}s)</span>
              </div>
              <p className="text-[11px] font-sans text-slate-700 line-clamp-2 leading-tight">
                {inc.confidence_explanation}
              </p>
              <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                <span>{inc.participating_nodes.join(', ')}</span>
                <span className="text-sky-800 font-bold">{inc.event_count} events</span>
              </div>
            </div>
          ))}
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

export default FlightOverviewPage;
