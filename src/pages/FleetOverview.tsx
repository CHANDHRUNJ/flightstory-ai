import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { SummaryData, HealthData } from '../services/apiService';
import { 
  Activity, AlertTriangle, Layers, ArrowRight, RefreshCw, 
  ShieldAlert, Cpu, Network, Database, CheckCircle2, Clock
} from 'lucide-react';

const FleetOverview: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, healthData] = await Promise.all([
        apiService.getSummary(),
        apiService.getHealth()
      ]);
      setSummary(sumData);
      setHealth(healthData);
    } catch (err: any) {
      setError(err.message || 'Failed to connect to FlightStory AI backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <header className="flex justify-between items-start border-b border-gray-200 pb-4">
        <div>
          <div className="text-xs text-aviation-blue font-bold uppercase tracking-wider">FlightStory AI • System Intelligence</div>
          <h2 className="text-2xl font-bold text-aviation-navy tracking-tight mt-1">
            Triple-Redundant FMS Investigation Dashboard
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Real-time analytics and deterministic cross-node event correlation across Airbus A350 Flight Management Systems.
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-gray-200 rounded text-sm text-aviation-navy hover:bg-gray-50 transition-colors flex items-center shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/incidents')}
            className="px-4 py-2 bg-aviation-navy text-white text-sm font-medium rounded hover:bg-aviation-charcoal transition-colors flex items-center shadow-sm"
          >
            Open Incident Explorer
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>
      </header>

      {/* Loading State */}
      {loading ? (
        <div className="card p-16 text-center text-gray-500 bg-white">
          <RefreshCw className="w-10 h-10 mx-auto animate-spin text-aviation-blue mb-4" />
          <h3 className="text-base font-semibold text-aviation-navy">Fetching Dataset & Intelligence Metrics...</h3>
          <p className="text-sm text-gray-400 mt-1">Querying FastAPI backend on http://127.0.0.1:8000</p>
        </div>
      ) : error ? (
        <div className="card p-8 border-red-200 bg-red-50 text-center">
          <ShieldAlert className="w-10 h-10 text-red-600 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-red-800">Backend Connection Error</h3>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <p className="text-xs text-gray-500 mt-2">Make sure Uvicorn server is running on http://127.0.0.1:8000</p>
          <button
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Retry Connection
          </button>
        </div>
      ) : summary && (
        <>
          {/* System Health Banner */}
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex justify-between items-center text-emerald-900">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-bold text-sm">System Status: {health?.status.toUpperCase()}</span>
                <span className="text-xs text-emerald-700 ml-3">Loaded {health?.loaded_events_count.toLocaleString()} events across 3 redundant channels</span>
              </div>
            </div>
            <div className="text-xs text-emerald-700 font-mono">
              API Engine v{health?.version} • 15 Files Validated
            </div>
          </div>

          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Total Events */}
            <div className="card p-5 bg-white shadow-sm border-l-4 border-l-aviation-navy">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Raw Events</span>
                <Database className="w-4 h-4 text-aviation-navy" />
              </div>
              <div className="text-3xl font-extrabold text-aviation-navy mt-2">
                {summary.total_events.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">100% losslessly parsed</div>
            </div>

            {/* Incident Candidates */}
            <div className="card p-5 bg-white shadow-sm border-l-4 border-l-aviation-warning">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Incident Candidates</span>
                <AlertTriangle className="w-4 h-4 text-aviation-warning" />
              </div>
              <div className="text-3xl font-extrabold text-aviation-navy mt-2">
                {summary.total_incidents.toLocaleString()}
              </div>
              <div className="text-xs text-aviation-warning font-medium mt-1">
                {summary.cross_node_incidents} Cross-Node • {summary.single_node_incidents} Isolated
              </div>
            </div>

            {/* Correlated Events */}
            <div className="card p-5 bg-white shadow-sm border-l-4 border-l-aviation-lightBlue">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Correlated Events</span>
                <Network className="w-4 h-4 text-aviation-blue" />
              </div>
              <div className="text-3xl font-extrabold text-aviation-navy mt-2">
                {summary.total_correlated_events.toLocaleString()}
              </div>
              <div className="text-xs text-aviation-blue font-medium mt-1">
                {summary.correlation_coverage_percent}% dataset correlation coverage
              </div>
            </div>

            {/* Redundancy Architecture */}
            <div className="card p-5 bg-white shadow-sm border-l-4 border-l-emerald-600">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Redundancy Status</span>
                <Cpu className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-extrabold text-aviation-navy mt-2">
                3 Nodes
              </div>
              <div className="text-xs text-emerald-700 font-medium mt-1">Left, Center & Right FMS channels</div>
            </div>
          </div>

          {/* Node Breakdown & Topology */}
          <div className="grid grid-cols-12 gap-6">
            {/* 3 Redundant Nodes Column */}
            <div className="col-span-12 lg:col-span-6 space-y-4">
              <div className="card p-5 bg-white shadow-sm">
                <h3 className="text-sm font-bold text-aviation-navy uppercase tracking-wider mb-4 flex items-center">
                  <Cpu className="w-4 h-4 mr-2 text-aviation-blue" />
                  Triple-Redundant Node Event Breakdown
                </h3>

                <div className="space-y-4">
                  {/* Node A */}
                  <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-blue-950">NODE_A (Left FMS Channel)</span>
                      <span className="text-sm font-extrabold text-blue-800">{summary.records_by_node['NODE_A']?.toLocaleString()} events</span>
                    </div>
                    <div className="w-full bg-blue-200 h-2 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(summary.records_by_node['NODE_A'] / summary.total_events) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-blue-700 mt-2 font-mono">
                      <span>Fault: {summary.records_by_node_and_family['NODE_A']?.['FMS_FAULT_REPO']}</span>
                      <span>Nav: {summary.records_by_node_and_family['NODE_A']?.['FMS_NAV_GUIDANCE']}</span>
                      <span>Sys: {summary.records_by_node_and_family['NODE_A']?.['FMS_SYS_EVENT']}</span>
                      <span>Mode: {summary.records_by_node_and_family['NODE_A']?.['FMS_MODE_STATE']}</span>
                    </div>
                  </div>

                  {/* Node B */}
                  <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-emerald-950">NODE_B (Center FMS Channel)</span>
                      <span className="text-sm font-extrabold text-emerald-800">{summary.records_by_node['NODE_B']?.toLocaleString()} events</span>
                    </div>
                    <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full" 
                        style={{ width: `${(summary.records_by_node['NODE_B'] / summary.total_events) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-emerald-700 mt-2 font-mono">
                      <span>Fault: {summary.records_by_node_and_family['NODE_B']?.['FMS_FAULT_REPO']}</span>
                      <span>Nav: {summary.records_by_node_and_family['NODE_B']?.['FMS_NAV_GUIDANCE']}</span>
                      <span>Sys: {summary.records_by_node_and_family['NODE_B']?.['FMS_SYS_EVENT']}</span>
                      <span>Mode: {summary.records_by_node_and_family['NODE_B']?.['FMS_MODE_STATE']}</span>
                    </div>
                  </div>

                  {/* Node C */}
                  <div className="p-4 rounded-lg bg-orange-50/50 border border-orange-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-orange-950">NODE_C (Right FMS Channel)</span>
                      <span className="text-sm font-extrabold text-orange-800">{summary.records_by_node['NODE_C']?.toLocaleString()} events</span>
                    </div>
                    <div className="w-full bg-orange-200 h-2 rounded-full overflow-hidden mt-2">
                      <div 
                        className="bg-orange-600 h-2 rounded-full" 
                        style={{ width: `${(summary.records_by_node['NODE_C'] / summary.total_events) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-orange-700 mt-2 font-mono">
                      <span>Fault: {summary.records_by_node_and_family['NODE_C']?.['FMS_FAULT_REPO']}</span>
                      <span>Nav: {summary.records_by_node_and_family['NODE_C']?.['FMS_NAV_GUIDANCE']}</span>
                      <span>Sys: {summary.records_by_node_and_family['NODE_C']?.['FMS_SYS_EVENT']}</span>
                      <span>Mode: {summary.records_by_node_and_family['NODE_C']?.['FMS_MODE_STATE']}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Relationship Types & Log Families */}
            <div className="col-span-12 lg:col-span-6 space-y-6">
              <div className="card p-5 bg-white shadow-sm">
                <h3 className="text-sm font-bold text-aviation-navy uppercase tracking-wider mb-4 flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-aviation-warning" />
                  Incident Relationship Type Distribution
                </h3>
                <div className="space-y-2.5">
                  {Object.entries(summary.relationship_type_breakdown).map(([relType, count]) => (
                    <div key={relType} className="flex justify-between items-center py-1.5 border-b border-gray-100 text-sm">
                      <span className="text-gray-700 font-medium">{relType.replace(/_/g, ' ')}</span>
                      <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-slate-100 text-aviation-navy">
                        {count} incidents
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-5 bg-white shadow-sm">
                <h3 className="text-sm font-bold text-aviation-navy uppercase tracking-wider mb-4 flex items-center">
                  <Layers className="w-4 h-4 mr-2 text-aviation-lightBlue" />
                  Log Family Distribution
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(summary.records_by_family).map(([fam, count]) => (
                    <div key={fam} className="p-3 bg-gray-50 rounded border border-gray-100">
                      <div className="text-xs text-gray-500 font-semibold">{fam}</div>
                      <div className="text-lg font-bold text-aviation-navy mt-0.5">{count.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Multi-Window Sensitivity Benchmark Table */}
          <div className="card p-5 bg-white shadow-sm">
            <h3 className="text-sm font-bold text-aviation-navy uppercase tracking-wider mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-aviation-blue" />
              Multi-Window Correlation Sensitivity Benchmark
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Comparison of deterministic correlation yields across 1-second, 3-second, 5-second, and 15-second hop windows.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Correlation Window</th>
                    <th className="py-2.5 px-4">Candidate Groups</th>
                    <th className="py-2.5 px-4">Correlated Events</th>
                    <th className="py-2.5 px-4">Dataset Coverage</th>
                    <th className="py-2.5 px-4">Cross-Node Incidents</th>
                    <th className="py-2.5 px-4">High Confidence Groups</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(summary.window_comparison_analysis).map(([key, wData]) => (
                    <tr key={key} className={`hover:bg-gray-50 ${key === '5s_window' ? 'bg-blue-50/40 font-semibold' : ''}`}>
                      <td className="py-2.5 px-4">
                        {wData.window_seconds}s Window {key === '5s_window' && '(Selected Default)'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-aviation-navy">{wData.incident_candidates_count}</td>
                      <td className="py-2.5 px-4">{wData.total_correlated_events.toLocaleString()}</td>
                      <td className="py-2.5 px-4">{wData.percent_dataset_correlated}%</td>
                      <td className="py-2.5 px-4 text-purple-700 font-medium">{wData.cross_node_incidents_count}</td>
                      <td className="py-2.5 px-4 text-emerald-700 font-medium">{wData.confidence_level_breakdown['HIGH']}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Key Incident Spotlight Quick Links */}
          <div className="card p-5 bg-white shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-aviation-navy uppercase tracking-wider flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-aviation-warning" />
              Key High-Impact Candidate Incidents
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'INC_0014', type: 'Redundancy Failover', nodes: 'A + B + C', events: 158, time: '09:41:22' },
                { id: 'INC_0025', type: 'Fault Resonance', nodes: 'A + B', events: 2, time: '09:44:25' },
                { id: 'INC_0099', type: 'RTOS Context Shutdown', nodes: 'A + C', events: 7, time: '12:02:52' },
                { id: 'INC_0129', type: 'Altitude Freeze (2870ft)', nodes: 'A + C', events: 12, time: '13:13:52' },
              ].map(item => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/incident/${item.id}`)}
                  className="p-3.5 rounded border border-gray-200 hover:border-aviation-blue hover:shadow-md cursor-pointer transition-all bg-gray-50/50"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-mono font-bold text-aviation-blue text-sm">{item.id}</span>
                    <span className="text-[11px] font-semibold text-gray-500">{item.time}</span>
                  </div>
                  <div className="text-xs font-bold text-aviation-navy mt-1">{item.type}</div>
                  <div className="flex justify-between text-[11px] text-gray-500 mt-2">
                    <span>Nodes: {item.nodes}</span>
                    <span>{item.events} events</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FleetOverview;
