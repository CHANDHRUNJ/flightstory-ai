import React from 'react';
import { Filter, RotateCcw, Search, Calendar, Cpu, Layers } from 'lucide-react';

export interface FilterState {
  node: string;
  family: string;
  category: string;
  keyword: string;
  startTime: string;
  endTime: string;
}

interface PersistentFilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  totalFilteredCount?: number;
}

export const PersistentFilterBar: React.FC<PersistentFilterBarProps> = ({
  filters,
  onFilterChange,
  onReset,
  totalFilteredCount
}) => {
  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value
    });
  };

  const isFiltered = 
    filters.node !== 'ALL' || 
    filters.family !== 'ALL' || 
    filters.category !== 'ALL' || 
    filters.keyword.trim() !== '' || 
    filters.startTime !== '' || 
    filters.endTime !== '';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3 font-mono text-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-700">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="text-slate-900 font-bold text-xs uppercase tracking-wider font-mono">
              Investigation Filters
            </span>
            <span className="text-slate-500 text-[11px] block font-sans">
              Filter by FMS Channel, Log Family, Anomaly Category, and Timestamps
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {totalFilteredCount !== undefined && (
            <span className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold">
              {totalFilteredCount.toLocaleString()} Matching
            </span>
          )}
          {isFiltered && (
            <button
              onClick={onReset}
              className="px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 transition-colors font-semibold"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" /> Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Node Filter */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 font-semibold">
            <Cpu className="w-3 h-3 text-sky-700" /> FMS Channel
          </label>
          <select
            value={filters.node}
            onChange={(e) => handleChange('node', e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:border-sky-500 focus:bg-white focus:outline-none text-xs"
          >
            <option value="ALL">All Channels (A, B, C)</option>
            <option value="NODE_A">NODE_A (Left Channel)</option>
            <option value="NODE_B">NODE_B (Center Channel)</option>
            <option value="NODE_C">NODE_C (Right Channel)</option>
          </select>
        </div>

        {/* Log Family Filter */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 font-semibold">
            <Layers className="w-3 h-3 text-purple-700" /> Log Family
          </label>
          <select
            value={filters.family}
            onChange={(e) => handleChange('family', e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:border-sky-500 focus:bg-white focus:outline-none text-xs"
          >
            <option value="ALL">All 5 Log Families</option>
            <option value="FMS_FAULT_REPO">FMS Fault Repo (Faults)</option>
            <option value="FMS_SYS_EVENT">FMS System Events (CDU/Sys)</option>
            <option value="FMS_MODE_STATE">FMS Mode Transitions (Redundancy)</option>
            <option value="FMS_NAV_GUIDANCE">FMS Nav Guidance (Guidance/Pos)</option>
            <option value="FMS_DIAG_SNAPSHOT">System Diag Snapshots</option>
          </select>
        </div>

        {/* Event / Fault Category Filter */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 font-semibold">
            <Layers className="w-3 h-3 text-amber-700" /> Anomaly Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:border-sky-500 focus:bg-white focus:outline-none text-xs"
          >
            <option value="ALL">All Anomaly Categories</option>
            <option value="REDUNDANCY_FAILOVER_COORDINATION">Redundancy Failover Coordination</option>
            <option value="CROSS_NODE_FAULT_RESONANCE">Cross-Node Fault Resonance</option>
            <option value="SENSOR_ALTITUDE_FREEZE_ANOMALY">Sensor Altitude Freeze Anomaly</option>
            <option value="NAVIGATION_DATABASE_CYCLE_SYNC">Nav Database Cycle Sync</option>
            <option value="RTOS_CONTEXT_SHUTDOWN_CASCADE">RTOS Context Shutdown Cascade</option>
          </select>
        </div>

        {/* Keyword Search */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 font-semibold">
            <Search className="w-3 h-3 text-sky-700" /> Search Keyword / Code
          </label>
          <input
            type="text"
            placeholder="Fault code, message..."
            value={filters.keyword}
            onChange={(e) => handleChange('keyword', e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2.5 py-1.5 focus:border-sky-500 focus:bg-white focus:outline-none text-xs placeholder:text-slate-400"
          />
        </div>

        {/* Time Span */}
        <div className="flex flex-col space-y-1">
          <label className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1 font-semibold">
            <Calendar className="w-3 h-3 text-slate-600" /> Time Window
          </label>
          <div className="flex items-center space-x-1">
            <input
              type="text"
              placeholder="09:12:00"
              value={filters.startTime}
              onChange={(e) => handleChange('startTime', e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-1.5 focus:border-sky-500 focus:bg-white focus:outline-none text-xs w-1/2 placeholder:text-slate-400"
            />
            <span className="text-slate-400">→</span>
            <input
              type="text"
              placeholder="09:27:00"
              value={filters.endTime}
              onChange={(e) => handleChange('endTime', e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-2 py-1.5 focus:border-sky-500 focus:bg-white focus:outline-none text-xs w-1/2 placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersistentFilterBar;
