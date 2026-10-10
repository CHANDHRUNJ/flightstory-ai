import React, { useEffect, useMemo, useState } from 'react';
import { apiService } from '../services/apiService';
import type { EventRecord, HistogramBucket, SummaryData, IngestSummary } from '../services/apiService';
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
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
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
  X,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { Link } from 'react-router-dom';

export type NodeId = 'NODE_A' | 'NODE_B' | 'NODE_C';

export interface FilterState {
  node: string;
  family: string;
  category: string;
  faultCode: string;
  query: string;
  startTime: string;
  endTime: string;
}

const NODES: NodeId[] = ['NODE_A', 'NODE_B', 'NODE_C'];

export const NODE_META: Record<NodeId, { name: string; label: string; color: string; bg: string; border: string; ring: string }> = {
  NODE_A: { name: 'FMS A (NODE_A)', label: 'Master Channel', color: '#06b6d4', bg: 'bg-cyan-50', border: 'border-cyan-300', ring: 'ring-cyan-400' },
  NODE_B: { name: 'FMS B (NODE_B)', label: 'Standby Channel', color: '#0d9488', bg: 'bg-teal-50', border: 'border-teal-300', ring: 'ring-teal-400' },
  NODE_C: { name: 'FMS C (NODE_C)', label: 'Spare / Monitor Channel', color: '#8b5cf6', bg: 'bg-purple-50', border: 'border-purple-300', ring: 'ring-purple-400' }
};

export const LOG_FAMILIES = [
  'Aircraft_State_Buffer',
  'FAULT_REPOSITORY',
  'FM_CI_BPQ',
  'FM_LBPQ',
  'State_Transition_Buffer'
];

export const categoryOf = (event: EventRecord): string => {
  const family = (event.log_family || '').toLowerCase();
  const msg = (event.event_message || '').toLowerCase();
  if (family.includes('fault') || /fault|error|fail|invalid|warn|bbit|ibit/.test(msg)) return 'Fault';
  if (/reset|reboot|restart|power cycle/.test(msg)) return 'Reset';
  if (family.includes('transition') || family.includes('mode') || /transition|switch|handover|sync/.test(msg)) return 'State Transition';
  if (/recover|restore|cleared|resumed/.test(msg)) return 'Recovery';
  return 'Operational';
};

export const formatTime = (ts: string) => {
  if (!ts) return 'N/A';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toISOString().substring(11, 19);
};

export const formatFullTime = (ts: string) => {
  if (!ts) return 'N/A';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
};

interface FmsVisualizationProps {
  isDedicatedPage?: boolean;
}

export const FmsVisualization: React.FC<FmsVisualizationProps> = ({ isDedicatedPage = false }) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [ingestSummary, setIngestSummary] = useState<IngestSummary | null>(null);
  const [histogram, setHistogram] = useState<HistogramBucket[]>([]);
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [allRecentEvents, setAllRecentEvents] = useState<EventRecord[]>([]);
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(50);
  const [loading, setLoading] = useState<boolean>(true);
  const [chartLoading, setChartLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    node: 'All',
    family: 'All',
    category: 'All',
    faultCode: '',
    query: '',
    startTime: '',
    endTime: ''
  });

  const [brushRange, setBrushRange] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null
  });

  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [rawRecordExpanded, setRawRecordExpanded] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);

  // Load baseline summary and ingest stats once
  useEffect(() => {
    let active = true;
    const fetchMetadata = async () => {
      try {
        const [sumRes, ingRes] = await Promise.allSettled([
          apiService.getSummary(),
          apiService.getIngestSummary()
        ]);
        if (!active) return;
        if (sumRes.status === 'fulfilled') setSummary(sumRes.value);
        if (ingRes.status === 'fulfilled') setIngestSummary(ingRes.value);
      } catch (err) {
        console.error('Failed to load telemetry metadata:', err);
      }
    };
    fetchMetadata();
    return () => { active = false; };
  }, []);

  // Fetch histogram based on filters and time range
  useEffect(() => {
    let active = true;
    const fetchHistogram = async () => {
      setChartLoading(true);
      try {
        const res = await apiService.getEventsHistogram({
          node_id: filters.node !== 'All' ? filters.node : undefined,
          log_family: filters.family !== 'All' ? filters.family : undefined,
          keyword: filters.query.trim() || undefined,
          start_time: filters.startTime || undefined,
          end_time: filters.endTime || undefined
        });
        if (!active) return;
        setHistogram(res.histogram || []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Histogram aggregation failed.');
      } finally {
        if (active) setChartLoading(false);
      }
    };
    fetchHistogram();
    return () => { active = false; };
  }, [filters.node, filters.family, filters.query, filters.startTime, filters.endTime]);

  // Fetch paginated events based on filters, pagination, and brush window
  useEffect(() => {
    let active = true;
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const effectiveStart = brushRange.left ? brushRange.left : (filters.startTime || undefined);
        const effectiveEnd = brushRange.right ? brushRange.right : (filters.endTime || undefined);

        const res = await apiService.getEvents({
          page,
          page_size: pageSize,
          node_id: filters.node !== 'All' ? filters.node : undefined,
          log_family: filters.family !== 'All' ? filters.family : undefined,
          start_time: effectiveStart,
          end_time: effectiveEnd,
          keyword: [filters.query, filters.faultCode].filter(Boolean).join(' ').trim() || undefined
        });

        if (!active) return;
        setEvents(res.items || []);
        setTotalEvents(res.total || 0);

        // Keep a pool of loaded events across nodes for cross-channel correlation
        if (page === 1) {
          setAllRecentEvents(res.items || []);
        } else {
          setAllRecentEvents(prev => {
            const map = new Map<string, EventRecord>();
            prev.forEach(e => map.set(e.source_record_id, e));
            (res.items || []).forEach(e => map.set(e.source_record_id, e));
            return Array.from(map.values());
          });
        }
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Failed to retrieve events.');
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchEvents();
    return () => { active = false; };
  }, [page, pageSize, filters, brushRange]);

  // Filter events by in-memory category & fault code if needed
  const displayedEvents = useMemo(() => {
    return events.filter(e => {
      if (filters.category !== 'All' && categoryOf(e) !== filters.category) return false;
      if (filters.faultCode.trim()) {
        const code = filters.faultCode.trim().toLowerCase();
        const msg = (e.event_message || '').toLowerCase();
        const raw = JSON.stringify(e.original_fields || {}).toLowerCase();
        if (!msg.includes(code) && !raw.includes(code)) return false;
      }
      return true;
    });
  }, [events, filters.category, filters.faultCode]);

  // Burst Detection (Explainable rule: bucket event count >= Mean + 1.5 * StdDev)
  const burstStats = useMemo(() => {
    if (!histogram.length) return { threshold: 0, count: 0, peakBucket: null as HistogramBucket | null, mean: 0 };
    const totals = histogram.map(h => h.total);
    const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
    const variance = totals.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / totals.length;
    const stdDev = Math.sqrt(variance);
    const threshold = Math.max(5, Math.round(mean + 1.5 * stdDev));
    const burstBuckets = histogram.filter(h => h.total >= threshold);
    let peakBucket: HistogramBucket | null = null;
    let maxVal = -1;
    histogram.forEach(h => {
      if (h.total > maxVal) {
        maxVal = h.total;
        peakBucket = h;
      }
    });

    return {
      threshold,
      count: burstBuckets.length,
      peakBucket,
      mean: Math.round(mean)
    };
  }, [histogram]);

  // Active histogram sliced to brushed range
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

  // Calculate timeline start and end millisecond boundaries
  const timelineBounds = useMemo(() => {
    if (brushRange.left && brushRange.right) {
      const l = Date.parse(brushRange.left);
      const r = Date.parse(brushRange.right);
      return { min: Math.min(l, r), max: Math.max(l, r) };
    }
    if (activeHistogram.length > 0) {
      const times = activeHistogram.map(h => Date.parse(h.time)).filter(t => !Number.isNaN(t));
      if (times.length > 0) {
        return { min: Math.min(...times), max: Math.max(...times) };
      }
    }
    const eventTimes = displayedEvents.map(e => Date.parse(e.event_time)).filter(t => !Number.isNaN(t));
    if (eventTimes.length > 0) {
      return { min: Math.min(...eventTimes), max: Math.max(...eventTimes) };
    }
    return { min: 0, max: 1 };
  }, [brushRange, activeHistogram, displayedEvents]);

  // Generate 5 synchronized time axis ticks
  const timelineTicks = useMemo(() => {
    const { min, max } = timelineBounds;
    if (max <= min) return [];
    const step = (max - min) / 4;
    return [0, 1, 2, 3, 4].map(i => {
      const timeMs = min + step * i;
      return {
        timeMs,
        pct: (i / 4) * 100,
        label: formatTime(new Date(timeMs).toISOString())
      };
    });
  }, [timelineBounds]);

  // Count unaligned or missing timestamps
  const timestampQuality = useMemo(() => {
    let invalid = 0;
    displayedEvents.forEach(e => {
      const t = Date.parse(e.event_time);
      if (Number.isNaN(t)) invalid++;
    });
    return { invalid, valid: displayedEvents.length - invalid };
  }, [displayedEvents]);

  // Zoom & Pan Handlers
  const handleZoom = (direction: 'in' | 'out') => {
    const { min, max } = timelineBounds;
    if (max <= min) return;
    const span = max - min;
    const center = min + span / 2;
    const factor = direction === 'in' ? 0.65 : 1.45;
    const newSpan = span * factor;
    const newMin = Math.max(Date.parse(histogram[0]?.time || '1970-01-01'), center - newSpan / 2);
    const newMax = Math.min(Date.parse(histogram[histogram.length - 1]?.time || '2099-01-01'), center + newSpan / 2);
    setBrushRange({
      left: new Date(newMin).toISOString(),
      right: new Date(newMax).toISOString()
    });
    setPage(1);
  };

  const handlePan = (direction: 'left' | 'right') => {
    const { min, max } = timelineBounds;
    if (max <= min) return;
    const span = max - min;
    const shift = (span * 0.25) * (direction === 'left' ? -1 : 1);
    const newMin = min + shift;
    const newMax = max + shift;
    setBrushRange({
      left: new Date(newMin).toISOString(),
      right: new Date(newMax).toISOString()
    });
    setPage(1);
  };

  const handleSelectPeakBurst = () => {
    if (!burstStats.peakBucket) return;
    const peakTime = Date.parse(burstStats.peakBucket.time);
    const windowStart = new Date(peakTime - 15 * 60 * 1000).toISOString();
    const windowEnd = new Date(peakTime + 15 * 60 * 1000).toISOString();
    setBrushRange({ left: windowStart, right: windowEnd });
    setPage(1);
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

  // Temporally correlated records around selected event
  const correlatedRecords = useMemo(() => {
    if (!selectedEvent) return { sameNode: [], otherNodes: [] };
    const selTime = Date.parse(selectedEvent.event_time);
    const candidates = allRecentEvents.filter(e => e.source_record_id !== selectedEvent.source_record_id);

    // Same node nearby records
    const sameNode = candidates
      .filter(e => e.node_id === selectedEvent.node_id)
      .map(e => ({
        event: e,
        deltaSec: Math.round((Date.parse(e.event_time) - selTime) / 1000)
      }))
      .filter(item => Math.abs(item.deltaSec) <= 600)
      .sort((a, b) => Math.abs(a.deltaSec) - Math.abs(b.deltaSec))
      .slice(0, 4);

    // Other nodes nearby records (cross-channel temporal correlation)
    const otherNodes = candidates
      .filter(e => e.node_id !== selectedEvent.node_id)
      .map(e => ({
        event: e,
        deltaSec: Math.round((Date.parse(e.event_time) - selTime) / 1000)
      }))
      .filter(item => Math.abs(item.deltaSec) <= 600)
      .sort((a, b) => Math.abs(a.deltaSec) - Math.abs(b.deltaSec))
      .slice(0, 4);

    return { sameNode, otherNodes };
  }, [selectedEvent, allRecentEvents]);

  // Extract fault code if present
  const extractedFaultCode = useMemo(() => {
    if (!selectedEvent) return null;
    const cols = selectedEvent.original_fields?.columns;
    if (cols?.fault_code) return cols.fault_code;
    if (cols?.code) return cols.code;
    const match = selectedEvent.event_message.match(/(?:FAULT|ERR|CODE|WAR)[_:\s]+([A-Z0-9_-]+)/i);
    return match ? match[1] : null;
  }, [selectedEvent]);

  return (
    <div className="space-y-6">
      {/* Visual Analytics Header & Quick Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="p-1.5 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-200">
                <Sliders className="w-4 h-4" />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 font-sans tracking-tight">
                  Interactive FMS Visualization & Log Telemetry
                </h2>
                <span className="text-[11px] font-mono text-slate-500">
                  Aerospace-grade multi-channel observability across TMR nodes (NODE_A, NODE_B, NODE_C)
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            {!isDedicatedPage && (
              <Link
                to="/visualization"
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                <span>Open Dedicated Cockpit</span>
              </Link>
            )}

            <span className="px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-slate-600">
              Active Telemetry: <strong className="text-slate-900">{totalEvents.toLocaleString()}</strong>
            </span>

            {burstStats.count > 0 && (
              <button
                onClick={handleSelectPeakBurst}
                className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 flex items-center gap-1 transition-colors"
                title="Focus zoom window on peak burst activity"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>Jump to Peak Burst</span>
              </button>
            )}

            {brushRange.left && (
              <button
                onClick={() => {
                  setBrushRange({ left: null, right: null });
                  setPage(1);
                }}
                className="px-2.5 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-700 hover:bg-cyan-100 flex items-center gap-1 transition-colors font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Zoom</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Multi-Parameter Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4 text-xs font-mono">
          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search keyword..."
              value={filters.query}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, query: e.target.value }));
                setPage(1);
              }}
              className="bg-transparent border-none focus:outline-none text-xs w-full text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <input
              type="text"
              placeholder="Fault Code (e.g. 0x4A)..."
              value={filters.faultCode}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, faultCode: e.target.value }));
                setPage(1);
              }}
              className="bg-transparent border-none focus:outline-none text-xs w-full text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Cpu className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
            <select
              value={filters.node}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, node: e.target.value }));
                setPage(1);
              }}
              className="bg-transparent border-none focus:outline-none text-xs text-slate-700 w-full"
            >
              <option value="All">All FMS Nodes</option>
              <option value="NODE_A">FMS A (NODE_A - Cyan)</option>
              <option value="NODE_B">FMS B (NODE_B - Teal)</option>
              <option value="NODE_C">FMS C (NODE_C - Violet)</option>
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={filters.family}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, family: e.target.value }));
                setPage(1);
              }}
              className="bg-transparent border-none focus:outline-none text-xs text-slate-700 w-full"
            >
              <option value="All">All 5 Log Families</option>
              {LOG_FAMILIES.map(fam => (
                <option key={fam} value={fam}>{fam}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-1.5 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
            <Sliders className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <select
              value={filters.category}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, category: e.target.value }));
                setPage(1);
              }}
              className="bg-transparent border-none focus:outline-none text-xs text-slate-700 w-full"
            >
              <option value="All">All Event Categories</option>
              <option value="Fault">Fault Records (Red)</option>
              <option value="Reset">Resets & Restarts (Orange)</option>
              <option value="State Transition">State Transitions (Indigo)</option>
              <option value="Recovery">Recovery Events (Green)</option>
              <option value="Operational">Operational Events</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 1: HERO VISUALIZATION - INTERACTIVE EVENT ACTIVITY CHART */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-sans flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-600 animate-pulse" />
              Event Activity Frequency Over Time
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Measures raw log event counts per time interval from backend telemetry. 
              <span className="text-slate-600 font-semibold ml-1">
                (Represents event volume; not aircraft altitude, speed, or sensor telemetry).
              </span>
            </p>
          </div>

          {/* Interactive Zoom & Pan Controls */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            {burstStats.count > 0 && (
              <span className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-800 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {burstStats.count} Burst Buckets (&ge;{burstStats.threshold} evt/interval)
              </span>
            )}

            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              <button
                onClick={() => handlePan('left')}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Pan Left across timeline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleZoom('in')}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Zoom In (narrow time span)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleZoom('out')}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Zoom Out (broaden time span)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handlePan('right')}
                className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors"
                title="Pan Right across timeline"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-mono">
            {error}
          </div>
        )}

        <div className="h-64 w-full">
          {chartLoading && histogram.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-400">
              Aggregating backend event telemetry from FastAPI...
            </div>
          ) : activeHistogram.length === 0 ? (
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
                onClick={(e) => {
                  if (e?.activeLabel) {
                    const selTime = String(e.activeLabel);
                    setFilters(prev => ({
                      ...prev,
                      startTime: selTime,
                      endTime: new Date(Date.parse(selTime) + 15 * 60 * 1000).toISOString()
                    }));
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
                  labelFormatter={(label) => `Time: ${formatFullTime(String(label))}`}
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
              Shared time axis across triple modular redundancy channels. Click any marker to open evidence investigation drawer.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            {timestampQuality.invalid > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">
                {timestampQuality.invalid} unaligned timestamps
              </span>
            )}
            <span className="text-slate-400">
              Page {page} of {Math.max(1, Math.ceil(totalEvents / pageSize))}
            </span>
          </div>
        </div>

        {/* Triple Node Lanes */}
        <div className="space-y-3 pt-1">
          {NODES.map((nodeId) => {
            const meta = NODE_META[nodeId];
            const nodeEvents = displayedEvents.filter(e => e.node_id === nodeId);
            const { min, max } = timelineBounds;

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
                    {nodeEvents.length} events in visible scope
                  </span>
                </div>

                {/* Event Marker Track */}
                <div className="relative h-11 bg-white border border-slate-200 rounded-md overflow-hidden shadow-2xs">
                  {nodeEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[11px] font-mono text-slate-400">
                      No matching records on this channel for current filters
                    </div>
                  ) : (
                    nodeEvents.map((ev) => {
                      const t = Date.parse(ev.event_time);
                      const isTimeValid = !Number.isNaN(t);
                      const pct = isTimeValid && max !== min
                        ? Math.max(2, Math.min(98, ((t - min) / (max - min)) * 100))
                        : 50;

                      const cat = categoryOf(ev);
                      const isFault = cat === 'Fault';
                      const isReset = cat === 'Reset';
                      const isTransition = cat === 'State Transition';
                      const isRecovery = cat === 'Recovery';

                      const markerColor = isFault 
                        ? '#ef4444' 
                        : isReset 
                        ? '#f97316' 
                        : isTransition 
                        ? '#6366f1' 
                        : isRecovery 
                        ? '#10b981' 
                        : meta.color;

                      return (
                        <button
                          key={ev.source_record_id}
                          title={`${formatTime(ev.event_time)} • [${cat}] ${ev.event_message}`}
                          onClick={() => openDrawer(ev)}
                          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-transform hover:scale-150 z-10 focus:outline-none cursor-pointer ${
                            isFault 
                              ? 'w-3.5 h-3.5 rotate-45 rounded-xs ring-2 ring-rose-400/80 shadow-xs' 
                              : isReset 
                              ? 'w-3 h-3 rounded-xs ring-1 ring-orange-400' 
                              : isTransition
                              ? 'w-2.5 h-2.5 rounded-full ring-1 ring-indigo-400'
                              : 'w-2.5 h-2.5 rounded-full'
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

        {/* Synchronized Shared Time Axis Grid */}
        {timelineTicks.length > 0 && (
          <div className="relative h-6 border-t border-slate-200 mt-2 font-mono text-[10px] text-slate-400">
            {timelineTicks.map((tick, idx) => (
              <div
                key={idx}
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${tick.pct}%` }}
              >
                <div className="w-px h-1.5 bg-slate-300" />
                <span className="mt-0.5">{tick.label}</span>
              </div>
            ))}
          </div>
        )}

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
            <span className="w-3 h-3 rotate-45 bg-rose-600 rounded-xs ring-1 ring-rose-300" />
            Recorded Fault (Red)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-orange-500 rounded-xs" />
            Reset / Restart (Orange)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
            State Transition (Indigo)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Recovery (Green)
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
              3 FMS nodes &times; 5 verified telemetry buffers.
              <span className="text-slate-600 font-semibold ml-1">
                Notice: Missing records reflect buffer capture rules or quiescent fault status, not confirmed hardware failure.
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {ingestSummary && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-50 text-cyan-800 border border-cyan-200">
                Ingest Audit: {ingestSummary.total_normalized_records.toLocaleString()} records ({ingestSummary.timestamp_parsing_errors} timestamp parse errors)
              </span>
            )}
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-600 border border-slate-200">
              TMR Log Architecture
            </span>
          </div>
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
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
                        <span>{nodeId}</span>
                      </div>
                    </td>
                    {LOG_FAMILIES.map(fam => {
                      const count = summary?.records_by_node_and_family?.[nodeId]?.[fam] ?? 0;
                      const hasData = count > 0;
                      const isFaultBuffer = fam === 'FAULT_REPOSITORY';

                      return (
                        <td key={fam} className="p-3">
                          <div className="space-y-1">
                            <span className="font-bold text-slate-800 block">
                              {count.toLocaleString()}
                            </span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-semibold border ${
                              hasData 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : isFaultBuffer
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {hasData ? 'Data Present' : isFaultBuffer ? 'Nominal (No Faults)' : 'No Records'}
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
              Clicking any row opens the full evidentiary audit panel with cross-channel correlation
            </p>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 flex items-center gap-1 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="px-2 text-slate-500">
              Page {page} / {Math.max(1, Math.ceil(totalEvents / pageSize))}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
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
          className="fixed inset-0 bg-slate-950/40 z-50 flex justify-end transition-opacity backdrop-blur-2xs"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-y-auto animate-slideInRight"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-900 text-cyan-200 border border-cyan-700">
                    {selectedEvent.node_id}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300">
                    {categoryOf(selectedEvent)}
                  </span>
                  {extractedFaultCode && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900 text-rose-200 border border-rose-700">
                      Fault Code: {extractedFaultCode}
                    </span>
                  )}
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
                    <span className="text-[10px] text-slate-400 block">Original Timestamp:</span>
                    <strong className="text-slate-800">{selectedEvent.event_time}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Normalized Time:</span>
                    <strong className="text-slate-800">{formatFullTime(selectedEvent.event_time)}</strong>
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
                  <div>
                    <span className="text-[10px] text-slate-400 block">Correlation Status:</span>
                    <span className="text-slate-700">{selectedEvent.is_correlated ? 'Correlated Incident' : 'Baseline Record'}</span>
                  </div>
                </div>
              </div>

              {/* Cross-Channel Correlation: Temporally Nearby Records */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase font-sans tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-600" />
                  Temporal Cross-Channel Correlation (&plusmn;10m)
                </h4>

                <div className="space-y-2">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Adjacent Records on {selectedEvent.node_id}:
                    </span>
                    {correlatedRecords.sameNode.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No adjacent events logged within window.</p>
                    ) : (
                      <div className="space-y-1">
                        {correlatedRecords.sameNode.map(({ event, deltaSec }) => (
                          <div
                            key={event.source_record_id}
                            onClick={() => openDrawer(event)}
                            className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200 hover:border-cyan-300 cursor-pointer text-[11px]"
                          >
                            <span className="text-slate-800 truncate max-w-xs">{event.event_message}</span>
                            <span className="text-slate-500 font-semibold">{deltaSec >= 0 ? `+${deltaSec}s` : `${deltaSec}s`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Concurrent Records on Peer Nodes (Cross-Channel):
                    </span>
                    {correlatedRecords.otherNodes.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic">No peer node events logged concurrently.</p>
                    ) : (
                      <div className="space-y-1">
                        {correlatedRecords.otherNodes.map(({ event, deltaSec }) => (
                          <div
                            key={event.source_record_id}
                            onClick={() => openDrawer(event)}
                            className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200 hover:border-cyan-300 cursor-pointer text-[11px]"
                          >
                            <div className="flex items-center space-x-1.5 truncate max-w-xs">
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold text-white bg-slate-700">
                                {event.node_id}
                              </span>
                              <span className="text-slate-800 truncate">{event.event_message}</span>
                            </div>
                            <span className="text-slate-500 font-semibold">{deltaSec >= 0 ? `+${deltaSec}s` : `${deltaSec}s`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Observed Facts vs Inferences vs Unresolved Questions */}
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
                      Record logged at timestamp <code>{selectedEvent.event_time}</code> by channel <code>{selectedEvent.node_id}</code> in buffer <code>{selectedEvent.log_family}</code> with payload: &ldquo;{selectedEvent.event_message}&rdquo;.
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-[11px] text-slate-700">
                      <Layers className="w-3.5 h-3.5 text-slate-500" /> Grounded Candidate Hypotheses
                    </span>
                    <p className="font-sans text-xs">
                      Timing alignment indicates potential bus transit queueing or state synchronization interval. Peer channels must be inspected for concurrent cross-talk or vote degradation.
                    </p>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                    <span className="font-bold flex items-center gap-1 text-[11px]">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Causality & Uncertainty Notice
                    </span>
                    <p className="font-sans text-xs">
                      Root cause cannot be established solely from timestamp proximity without hardware registers, ARINC-429 bus capture, or partition reset status.
                    </p>
                  </div>
                </div>
              </div>

              {/* Raw Record Dump */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase font-sans tracking-wider">
                    Raw Original Fields
                  </h4>
                  <button
                    onClick={() => setRawRecordExpanded(!rawRecordExpanded)}
                    className="text-cyan-700 hover:text-cyan-800 text-[11px] font-semibold"
                  >
                    {rawRecordExpanded ? 'Collapse' : 'Expand All'}
                  </button>
                </div>
                <pre className={`p-3 bg-slate-900 text-slate-200 rounded-lg text-[10px] overflow-auto whitespace-pre-wrap transition-all ${
                  rawRecordExpanded ? 'max-h-96' : 'max-h-40'
                }`}>
                  {JSON.stringify(selectedEvent.original_fields || selectedEvent, null, 2)}
                </pre>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono">
                Source: {selectedEvent.source_file}
              </span>
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
