import { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/apiService';
import type { EventRecord, HistogramBucket, SummaryData } from '../services/apiService';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  Cpu,
  Database,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  RotateCcw,
  Search,
  ShieldAlert,
  Sliders,
  X
} from 'lucide-react';

type NodeId = 'NODE_A' | 'NODE_B' | 'NODE_C';

interface FilterState {
  node: string;
  family: string;
  category: string;
  query: string;
}

const NODES: NodeId[] = ['NODE_A', 'NODE_B', 'NODE_C'];

const NODE_META: Record<NodeId, { name: string; label: string; color: string; bg: string; border: string }> = {
  NODE_A: { name: 'FMS A (NODE_A)', label: 'Master / Left Channel', color: '#06b6d4', bg: 'bg-cyan-50', border: 'border-cyan-300' },
  NODE_B: { name: 'FMS B (NODE_B)', label: 'Standby / Center Channel', color: '#0d9488', bg: 'bg-teal-50', border: 'border-teal-300' },
  NODE_C: { name: 'FMS C (NODE_C)', label: 'Spare / Right Channel', color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-300' }
};

const LOG_FAMILIES = [
  'Aircraft_State_Buffer',
  'FAULT_REPOSITORY',
  'FM_CI_BPQ',
  'FM_LBPQ',
  'State_Transition_Buffer'
];

const categoryOf = (event: EventRecord): string => {
  const family = (event.log_family || '').toLowerCase();
  const msg = (event.event_message || '').toLowerCase();
  if (family.includes('fault') || /fault|error|fail|invalid|warn/.test(msg)) return 'Fault';
  if (/reset|reboot|restart/.test(msg)) return 'Reset';
  if (family.includes('transition') || family.includes('mode') || /transition|switch|handover/.test(msg)) return 'State Transition';
  if (/recover|restore|cleared/.test(msg)) return 'Recovery';
  return 'Operational';
};

const formatTime = (ts: string) => {
  if (!ts) return 'N/A';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toISOString().substring(11, 19);
};

export const FmsVisualization = () => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [histogram, setHistogram] = useState<HistogramBucket[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    node: 'All',
    family: 'All',
    category: 'All',
    query: ''
  });

  // Time Window Selection on Chart
  const [brushRange, setBrushRange] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null
  });

  // Selected Event for Right-side Investigation Drawer
  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Load summary and initial telemetry
  useEffect(() => {
    let active = true;
    apiService.getSummary()
      .then(res => { if (active) setSummary(res); })
      .catch(() => { /* handled gracefully */ });
    return () => { active = false; };
  }, []);

  // Fetch histogram and events whenever filters change
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    Promise.all([
      apiService.getEventsHistogram({
        node_id: filters.node !== 'All' ? filters.node : undefined,
        log_family: filters.family !== 'All' ? filters.family : undefined,
        keyword: filters.query.trim() || undefined
      }),
      apiService.getEvents({
        page: 1,
        page_size: pageSize,
        node_id: filters.node !== 'All' ? filters.node : undefined,
        log_family: filters.family !== 'All' ? filters.family : undefined,
        keyword: filters.query.trim() || undefined
      })
    ]).then(([histRes, eventsRes]) => {
      if (!active) return;
      setHistogram(histRes.histogram || []);
      setEvents(eventsRes.items || []);
      setTotalEvents(eventsRes.total || 0);
      setPage(1);
    }).catch((err: unknown) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : 'Telemetry synchronization failed.');
    }).finally(() => {
      if (active) setLoading(false);
    });

    return () => { active = false; };
  }, [filters.node, filters.family, filters.query, pageSize]);

  // Client-side filter for event category if selected
  const displayedEvents = useMemo(() => {
    if (filters.category === 'All') return events;
    return events.filter(e => categoryOf(e) === filters.category);
  }, [events, filters.category]);

  // Burst Detection (Explainable rule: bucket event count > Mean + 1.5 * StdDev)
  const burstStats = useMemo(() => {
    if (!histogram.length) return { threshold: 0, count: 0 };
    const totals = histogram.map(h => h.total);
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    const variance = totals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / totals.length;
    const stdDev = Math.sqrt(variance);
    const threshold = Math.round(mean + 1.5 * stdDev);
    const bursts = histogram.filter(h => h.total >= threshold && h.total > 5).length;
    return { threshold, count: bursts, mean: Math.round(mean) };
  }, [histogram]);

  // Filtered histogram based on brushed time window
  const activeHistogram = useMemo(() => {
    if (!brushRange.left || !brushRange.right) return histogram;
    const leftTime = Date.parse(brushRange.left);
    const rightTime = Date.parse(brushRange.right);
    const min = Math.min(leftTime, rightTime);
    const max = Math.max(leftTime, rightTime);
    return histogram.filter(b => {
      const t = Date.parse(b.time);
      return t >= min && t <= max;
    });
  }, [histogram, brushRange]);

  const handlePageChange = async (nextPage: number) => {
    setLoading(true);
    try {
      const res = await apiService.getEvents({
        page: nextPage,
        page_size: pageSize,
        node_id: filters.node !== 'All' ? filters.node : undefined,
        log_family: filters.family !== 'All' ? filters.family : undefined,
        keyword: filters.query.trim() || undefined
      });
      setEvents(res.items || []);
      setPage(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pagination failed.');
    } finally {
      setLoading(false);
    }
  };

  const openDrawer = async (ev: EventRecord) => {
    try {
      const full = await apiService.getEventById(ev.source_record_id);
      setSelectedEvent(full);
    } catch {
      setSelectedEvent(ev);
    }
  };

  const navigateEvent = (direction: -1 | 1) => {
    if (!selectedEvent) return;
    const idx = displayedEvents.findIndex(e => e.source_record_id === selectedEvent.source_record_id);
    if (idx !== -1 && displayedEvents[idx + direction]) {
      openDrawer(displayedEvents[idx + direction]);
    }
  };

  const copyEvidence = () => {
    if (!selectedEvent) return;
    const jsonStr = JSON.stringify(selectedEvent, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Visual Analytics Header & Quick Stats */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Sliders className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 font-sans">
                Interactive FMS Visualization & Log Telemetry
              </h2>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Deterministic cross-channel event distribution across triple modular redundancy channels (NODE_A, NODE_B, NODE_C)
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-slate-600">
              Active Records: <strong className="text-slate-900">{totalEvents.toLocaleString()}</strong>
            </span>
            {brushRange.left && (
              <button
                onClick={() => setBrushRange({ left: null, right: null })}
                className="px-2.5 py-1 rounded bg-cyan-50 border border-cyan-200 text-cyan-700 hover:bg-cyan-100 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Zoom Window
              </button>
            )}
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search keyword / fault code..."
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
              className="bg-transparent border-none focus:outline-none text-xs w-full text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Cpu className="w-3.5 h-3.5 text-cyan-600" />
            <select
              value={filters.node}
              onChange={(e) => setFilters(prev => ({ ...prev, node: e.target.value }))}
              className="bg-transparent border-none focus:outline-none text-xs text-slate-700 w-full"
            >
              <option value="All">All FMS Nodes</option>
              <option value="NODE_A">FMS A (NODE_A - Cyan)</option>
              <option value="NODE_B">FMS B (NODE_B - Teal)</option>
              <option value="NODE_C">FMS C (NODE_C - Violet)</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filters.family}
              onChange={(e) => setFilters(prev => ({ ...prev, family: e.target.value }))}
              className="bg-transparent border-none focus:outline-none text-xs text-slate-700 w-full"
            >
              <option value="All">All Log Families</option>
              {LOG_FAMILIES.map(fam => (
                <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="bg-transparent border-none focus:outline-none text-xs text-slate-700 w-full"
            >
              <option value="All">All Event Categories</option>
              <option value="Fault">Fault Records (Red)</option>
              <option value="Reset">Resets & Restarts (Orange)</option>
              <option value="State Transition">State Transitions</option>
              <option value="Recovery">Recovery Events</option>
              <option value="Operational">Operational Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: HERO VISUALIZATION - INTERACTIVE EVENT ACTIVITY CHART */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-pulse" />
              Event Activity Frequency Over Time
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Measures raw log event counts per time bucket. Not aircraft altitude, velocity, or sensor telemetry.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            {burstStats.count > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                {burstStats.count} Burst Buckets (&gt;{burstStats.threshold} evt/bucket)
              </span>
            )}
            <span className="text-slate-400">Drag to brush window</span>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {error}
          </div>
        )}

        <div className="h-64 w-full">
          {loading && histogram.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
              Aggregating timestamped backend event telemetry...
            </div>
          ) : histogram.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
              No telemetry events returned for the selected filters.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={activeHistogram}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onMouseDown={(e) => {
                  if (e?.activeLabel) setBrushRange({ left: String(e.activeLabel), right: null });
                }}
                onMouseMove={(e) => {
                  if (brushRange.left && !brushRange.right && e?.activeLabel) {
                    setBrushRange(prev => ({ ...prev, right: String(e.activeLabel) }));
                  }
                }}
              >
                <defs>
                  <linearGradient id="eventActivityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0891b2" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="faultGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="time"
                  tickFormatter={(val: string) => formatTime(val)}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  minTickGap={28}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <Tooltip
                  labelFormatter={(label) => `Time: ${formatTime(String(label))}`}
                  formatter={(val, name) => [
                    `${val} records`,
                    name === 'total' ? 'Total Logged Events' : name === 'critical' ? 'Fault Events' : String(name)
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    fontSize: '11px',
                    borderRadius: '8px'
                  }}
                />
                <Legend
                  verticalAlign="top"
                  height={28}
                  formatter={(value) => (
                    <span className="text-xs font-mono text-slate-600">
                      {value === 'total' ? 'Total Logged Events' : value === 'critical' ? 'Fault Records' : value}
                    </span>
                  )}
                />
                {brushRange.left && brushRange.right && (
                  <ReferenceArea
                    x1={brushRange.left}
                    x2={brushRange.right}
                    strokeOpacity={0.3}
                    fill="#0891b2"
                    fillOpacity={0.15}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#0891b2"
                  strokeWidth={2}
                  fill="url(#eventActivityGrad)"
                  name="total"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="critical"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  fill="url(#faultGrad)"
                  name="critical"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SECTION 2: SYNCHRONIZED TIMELINE FOR ALL THREE FMS NODES */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-600" />
              Synchronized Multi-Node FMS Event Lanes
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Shared time axis across FMS channels. Click any marker to open evidence investigation drawer.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span>Showing Page {page} of {Math.max(1, Math.ceil(totalEvents / pageSize))}</span>
          </div>
        </div>

        <div className="space-y-4 pt-1">
          {NODES.map((nodeId) => {
            const meta = NODE_META[nodeId];
            const nodeEvents = displayedEvents.filter(e => e.node_id === nodeId);
            const validTimes = nodeEvents
              .map(e => Date.parse(e.event_time))
              .filter(t => !Number.isNaN(t));
            const minTime = validTimes.length ? Math.min(...validTimes) : 0;
            const maxTime = validTimes.length ? Math.max(...validTimes) : 1;

            return (
              <div key={nodeId} className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center space-x-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: meta.color }}
                    />
                    <strong className="text-slate-800 font-sans">{meta.name}</strong>
                    <span className="text-[10px] text-slate-500">({meta.label})</span>
                  </div>
                  <span className="text-slate-500 text-[11px]">
                    {nodeEvents.length} events on current page
                  </span>
                </div>

                {/* Event Marker Track */}
                <div className="relative h-10 bg-white border border-slate-200 rounded-md overflow-hidden">
                  {nodeEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[11px] font-mono text-slate-400">
                      No matching records on this channel for current filters
                    </div>
                  ) : (
                    nodeEvents.map((ev) => {
                      const t = Date.parse(ev.event_time);
                      const isTimeValid = !Number.isNaN(t);
                      const pct = isTimeValid && maxTime !== minTime
                        ? Math.max(2, Math.min(98, ((t - minTime) / (maxTime - minTime)) * 100))
                        : 50;

                      const cat = categoryOf(ev);
                      const isFault = cat === 'Fault';
                      const isReset = cat === 'Reset';
                      const markerColor = isFault ? '#ef4444' : isReset ? '#f97316' : meta.color;

                      return (
                        <button
                          key={ev.source_record_id}
                          title={`${formatTime(ev.event_time)} • [${cat}] ${ev.event_message}`}
                          onClick={() => openDrawer(ev)}
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-transform hover:scale-150 z-10 focus:outline-none ${
                            isFault ? 'w-3.5 h-3.5 rotate-45 rounded-xs ring-2 ring-rose-300' : 'w-2.5 h-2.5 rounded-full'
                          }`}
                          style={{
                            left: `${pct}%`,
                            backgroundColor: markerColor
                          }}
                        />
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-600 border-t border-slate-100 pt-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_META.NODE_A.color }} />
            NODE_A (Cyan)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_META.NODE_B.color }} />
            NODE_B (Teal)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_META.NODE_C.color }} />
            NODE_C (Violet)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rotate-45 bg-rose-600 rounded-xs" />
            Recorded Fault (Red)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            Reset / Anomaly (Orange)
          </span>
        </div>
      </div>

      {/* SECTION 3: LOG COVERAGE & DATA QUALITY MATRIX */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
              <Database className="w-4 h-4 text-cyan-700" />
              Log Family Coverage & Ingestion Completeness Matrix
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              3 FMS nodes × 5 verified telemetry buffers. Missing records indicate buffer filter rules, not confirmed hardware failure.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
            TMR Log Architecture
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] text-slate-600">
                <th className="p-3 font-semibold">FMS Node</th>
                {LOG_FAMILIES.map(fam => (
                  <th key={fam} className="p-3 font-semibold truncate">{fam}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {NODES.map(nodeId => {
                const meta = NODE_META[nodeId];
                return (
                  <tr key={nodeId} className="hover:bg-slate-50/50">
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span>{nodeId}</span>
                      </div>
                    </td>
                    {LOG_FAMILIES.map(fam => {
                      const count = summary?.records_by_node_and_family?.[nodeId]?.[fam] ?? 0;
                      const hasData = count > 0;

                      return (
                        <td key={fam} className="p-3">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 block">
                              {count.toLocaleString()}
                            </span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                              hasData 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {hasData ? 'Data Present' : 'No Records'}
                            </span>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: FILTERED EVENT EXPLORER TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans">
              Searchable Event Telemetry Explorer
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Clicking any row opens the full evidentiary audit panel
            </p>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="px-2 text-slate-500">
              Page {page} / {Math.max(1, Math.ceil(totalEvents / pageSize))}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= Math.ceil(totalEvents / pageSize) || loading}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center gap-1 transition-colors"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Node</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Log Family</th>
                <th className="py-3 px-4">Message / Event Telemetry</th>
                <th className="py-3 px-4">Record Identifier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No events match the active search criteria.
                  </td>
                </tr>
              ) : (
                displayedEvents.map((ev) => {
                  const cat = categoryOf(ev);
                  const isFault = cat === 'Fault';
                  const meta = NODE_META[ev.node_id as NodeId] || { color: '#64748b' };

                  return (
                    <tr
                      key={ev.source_record_id}
                      onClick={() => openDrawer(ev)}
                      className="hover:bg-cyan-50/30 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {formatTime(ev.event_time)}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold text-white"
                          style={{ backgroundColor: meta.color }}
                        >
                          {ev.node_id}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isFault 
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {cat}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 truncate max-w-[150px]">
                        {ev.log_family}
                      </td>
                      <td className="py-2.5 px-4 text-slate-900 font-sans font-medium truncate max-w-xs sm:max-w-md">
                        {ev.event_message}
                      </td>
                      <td className="py-2.5 px-4 text-slate-400 font-mono text-[11px] truncate max-w-[120px]">
                        {ev.source_record_id}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5: RIGHT-SIDE FAULT INVESTIGATION DRAWER */}
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-slate-950/40 z-50 flex justify-end transition-opacity"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-slideInRight"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-900 text-cyan-200 border border-cyan-700">
                    {selectedEvent.node_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                    {categoryOf(selectedEvent)}
                  </span>
                </div>
                <h3 className="text-base font-bold font-sans text-white mt-1">
                  {selectedEvent.event_message}
                </h3>
                <p className="text-xs font-mono text-slate-400">
                  Record ID: {selectedEvent.source_record_id}
                </p>
              </div>

              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-6 flex-1 text-xs font-mono">
              {/* Evidence Copy & Navigation Actions */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => navigateEvent(-1)}
                    className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Previous Record
                  </button>
                  <button
                    onClick={() => navigateEvent(1)}
                    className="px-2.5 py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
                  >
                    Next Record <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={copyEvidence}
                  className="px-3 py-1.5 rounded bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{copyFeedback ? 'Copied Evidence!' : 'Copy Evidence JSON'}</span>
                </button>
              </div>

              {/* Provenance & Source Metadata */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase font-sans tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-cyan-600" />
                  Source Record Provenance
                </h4>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Timestamp:</span>
                    <strong className="text-slate-800">{selectedEvent.event_time}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Log Family:</span>
                    <strong className="text-slate-800">{selectedEvent.log_family}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Source File:</span>
                    <span className="text-slate-700 truncate block">{selectedEvent.source_file}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Sequence Number:</span>
                    <span className="text-slate-700">#{selectedEvent.source_sequence ?? 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Observed Facts vs Inferences */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase font-sans tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Investigative Findings Breakdown
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Observed Fact
                    </span>
                    <p className="font-sans text-xs">
                      Record logged at timestamp <code>{selectedEvent.event_time}</code> by <code>{selectedEvent.node_id}</code> with event payload: &ldquo;{selectedEvent.event_message}&rdquo;.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-[11px]">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Causality & Uncertainty Notice
                    </span>
                    <p className="font-sans text-xs">
                      Root cause cannot be established solely from timestamp proximity. Additional bus telemetry, partition reset registers, or ARINC-429 message traces are required to confirm physical fault origin.
                    </p>
                  </div>
                </div>
              </div>

              {/* Raw Record Dump */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase font-sans tracking-wider">
                  Raw Original Fields
                </h4>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[10px] overflow-auto max-h-48 whitespace-pre-wrap">
                  {JSON.stringify(selectedEvent.original_fields || selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-sans font-semibold hover:bg-slate-800 transition-colors"
              >
                Close Investigation Panel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FmsVisualization;
