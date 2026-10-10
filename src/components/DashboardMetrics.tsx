import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import type { HistogramBucket } from '../services/apiService';
import { BarChart2, Server } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface NodeData {
  items: any[];
  total: number;
  page: number;
  hasMore: boolean;
  loading: boolean;
}

interface DashboardMetricsProps {
  searchQuery?: string;
  selectedCategory?: string;
  onlySignificant?: boolean;
  nodesState: Record<string, NodeData>;
}

export const DashboardMetrics: React.FC<DashboardMetricsProps> = ({
  searchQuery,
  selectedCategory,
  onlySignificant,
  nodesState
}) => {
  const [histogram, setHistogram] = useState<HistogramBucket[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchHistogram = async () => {
      setLoading(true);
      try {
        const res = await apiService.getEventsHistogram({
          keyword: searchQuery?.trim() || undefined,
          log_family: selectedCategory !== 'ALL' ? selectedCategory : undefined,
          significant_only: onlySignificant ? true : undefined
        });
        if (active) {
          setHistogram(res.histogram);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchHistogram();
    return () => { active = false; };
  }, [searchQuery, selectedCategory, onlySignificant]);

  const totalFiltered = nodesState['NODE_A'].total + nodesState['NODE_B'].total + nodesState['NODE_C'].total;

  const renderTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const timeStr = label.split('T')[1].substring(0, 5);
      return (
        <div className="bg-white p-3 border border-slate-200 rounded shadow-md text-xs font-mono">
          <p className="font-bold text-slate-800 mb-2">{timeStr} interval</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
          <p className="mt-1 pt-1 border-t border-slate-100 text-slate-500 font-bold">
            Total: {payload.reduce((sum: number, entry: any) => sum + entry.value, 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 mb-6">
      {/* Left: Compact Activity Timeline */}
      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-sky-700" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 font-sans">Compact Activity Timeline</h2>
              <p className="text-xs text-slate-500 font-sans">10-minute intervals across recorded window</p>
            </div>
          </div>
        </div>
        <div className="p-4 flex-1 min-h-[250px] relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <span className="text-xs font-mono text-slate-500 font-bold">Loading aggregation...</span>
            </div>
          ) : null}
          {histogram.length === 0 && !loading ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
              No matching records for timeline.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={histogram} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInfo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWarn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCrit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  tickFormatter={(val) => val.split('T')[1].substring(0, 5)} 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false} 
                  minTickGap={30}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false}
                />
                <Tooltip content={renderTooltip} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, fontFamily: 'monospace' }} />
                <Area type="monotone" dataKey="info" name="Info" stroke="#0ea5e9" fillOpacity={1} fill="url(#colorInfo)" stackId="1" />
                <Area type="monotone" dataKey="warning" name="Warning" stroke="#f59e0b" fillOpacity={1} fill="url(#colorWarn)" stackId="1" />
                <Area type="monotone" dataKey="critical" name="Critical" stroke="#ef4444" fillOpacity={1} fill="url(#colorCrit)" stackId="1" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Right: Node Distribution Panel */}
      <div className="w-full lg:w-80 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-sky-700" />
            <h2 className="text-sm font-bold text-slate-900 font-sans">Node Distribution</h2>
          </div>
        </div>
        <div className="p-4 space-y-4 flex-1">
          <p className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider mb-2">
            {totalFiltered.toLocaleString()} Records Matching Filters
          </p>

          {(['NODE_A', 'NODE_B', 'NODE_C'] as const).map(nodeId => {
            const count = nodesState[nodeId]?.total || 0;
            const pct = totalFiltered > 0 ? Math.round((count / totalFiltered) * 100) : 0;
            const role = nodeId === 'NODE_A' ? 'Master' : nodeId === 'NODE_B' ? 'Standby' : 'Spare';
            const colorClass = nodeId === 'NODE_A' ? 'bg-sky-500' : nodeId === 'NODE_B' ? 'bg-emerald-500' : 'bg-purple-500';

            return (
              <div key={nodeId} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs font-mono">
                  <div>
                    <span className="font-bold text-slate-800">{nodeId}</span>
                    <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] bg-slate-100 text-slate-600 border border-slate-200">
                      {role}
                    </span>
                  </div>
                  <div className="text-slate-600">
                    <span className="font-bold">{count.toLocaleString()}</span>
                    <span className="ml-1 text-slate-400">({pct}%)</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${colorClass} transition-all duration-500`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
