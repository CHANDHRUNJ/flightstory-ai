import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FmsVisualization } from '../components/FmsVisualization';
import { apiService } from '../services/apiService';
import type { HealthData, SummaryData } from '../services/apiService';
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Info,
  Plane,
  RefreshCw
} from 'lucide-react';

export const VisualizationPage: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const [h, s] = await Promise.allSettled([
          apiService.getHealth(),
          apiService.getSummary()
        ]);
        if (!active) return;
        if (h.status === 'fulfilled') setHealth(h.value);
        if (s.status === 'fulfilled') setSummary(s.value);
      } catch (err) {
        console.error('Error fetching visualization status:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchStatus();
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      {/* Top Aerospace Cockpit Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            {/* Breadcrumb Hierarchy */}
            <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
              <Link to="/overview" className="hover:text-cyan-400 flex items-center gap-1 transition-colors">
                <Plane className="w-3.5 h-3.5" />
                <span>FlightStory AI</span>
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <Link to="/overview" className="hover:text-cyan-400 transition-colors">
                Level 1: Overview
              </Link>
              <ChevronRight className="w-3 h-3 text-slate-600" />
              <span className="text-cyan-400 font-bold">FMS Telemetry Visualization</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-cyan-700/80 border border-cyan-500 text-cyan-200">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold font-sans tracking-tight text-white flex items-center gap-2">
                  Dedicated FMS Visual Telemetry Cockpit
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-700">
                    Aerospace Observability
                  </span>
                </h1>
                <p className="text-xs font-mono text-slate-400 mt-0.5">
                  Full-screen deterministic cross-channel investigation across triple redundant FMS nodes
                </p>
              </div>
            </div>
          </div>

          {/* Channel Topology & Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {/* TMR Channel Pills */}
            <div className="flex items-center space-x-1.5 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
              <span className="text-slate-400 text-[10px] mr-1">TMR Status:</span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                NODE_A
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                NODE_B
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                NODE_C
              </span>
            </div>

            <button
              onClick={() => setRefreshKey(k => k + 1)}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 text-xs font-mono transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Telemetry</span>
            </button>

            <Link
              to="/overview"
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white flex items-center gap-1.5 text-xs font-sans font-semibold transition-colors"
            >
              <span>Back to Overview</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Cockpit Status Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs font-mono">
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Ingested Records</span>
            <strong className="text-cyan-400 text-sm">
              {health?.loaded_events_count ? health.loaded_events_count.toLocaleString() : summary?.total_events ? summary.total_events.toLocaleString() : 'Loading...'}
            </strong>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Correlated Incidents</span>
            <strong className="text-amber-400 text-sm">
              {health?.loaded_incidents_count ?? summary?.total_incidents ?? '0'}
            </strong>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Monitored Buffers</span>
            <strong className="text-slate-200 text-sm">5 Telemetry Channels</strong>
          </div>
          <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase block">Redundancy Arch</span>
            <strong className="text-emerald-400 text-sm">Triple Modular (2oo3)</strong>
          </div>
        </div>
      </div>

      {/* Main Interactive Visualization Suite */}
      <FmsVisualization isDedicatedPage={true} />

      {/* Aerospace Engineering Methodology & Traceability Note */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs text-xs font-mono space-y-3">
        <div className="flex items-center space-x-2 text-slate-900 font-bold font-sans">
          <Info className="w-4 h-4 text-cyan-700" />
          <span>FMS Observability Principles & Evidence Traceability Guide</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-600 font-sans leading-relaxed">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <strong className="text-slate-900 font-semibold block text-xs">Deterministic Cross-Node Voting</strong>
            <p className="text-[11px] text-slate-600">
              In Triple Modular Redundancy (TMR), NODE_A, NODE_B, and NODE_C execute synchronized flight guidance laws. Discrepancies between nodes indicate asynchronous bus polling, discrete buffer filtering, or sensor divergence.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <strong className="text-slate-900 font-semibold block text-xs">Explainable Burst Detection</strong>
            <p className="text-[11px] text-slate-600">
              Activity spikes represent event frequency (<code className="text-slate-800">count &gt; mean + 1.5 &times; &sigma;</code>). They do not represent physical aircraft altitude, speed, or attitude excursions.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <strong className="text-slate-900 font-semibold block text-xs">Absence of Log &ne; Hardware Failure</strong>
            <p className="text-[11px] text-slate-600">
              Empty buffer entries indicate that fault triggers were not met or that data was filtered by design. Root cause claims require physical registers or ARINC-429 electrical captures.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationPage;
