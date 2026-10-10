import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { IncidentCandidate } from '../services/apiService';
import { 
  AlertTriangle, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, 
  ShieldAlert, ArrowRight
} from 'lucide-react';

const RELATIONSHIP_TYPES = [
  'All',
  'REDUNDANCY_FAILOVER_COORDINATION',
  'CROSS_NODE_FAULT_RESONANCE',
  'INTRA_NODE_FAULT_CASCADE',
  'STATE_MACHINE_TRANSITION',
  'NAVIGATION_DATABASE_CYCLE_SYNC',
  'SENSOR_ALTITUDE_FREEZE_ANOMALY',
  'RTOS_CONTEXT_SHUTDOWN_CASCADE'
];

const NODES = ['All', 'NODE_A', 'NODE_B', 'NODE_C'];
const CONFIDENCES = ['All', 'HIGH', 'MEDIUM'];

const IncidentExplorer: React.FC = () => {
  const navigate = useNavigate();
  const [incidents, setIncidents] = useState<IncidentCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  
  const [search, setSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState('All');
  const [selectedRelType, setSelectedRelType] = useState('All');
  const [selectedConfidence, setSelectedConfidence] = useState('All');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getIncidents({
        page,
        page_size: pageSize,
        node: selectedNode,
        relationship_type: selectedRelType,
        confidence: selectedConfidence
      });
      
      // Client-side search filtering if keyword provided
      let items = data.items;
      if (search.trim()) {
        const kw = search.toLowerCase();
        items = items.filter(i => 
          i.incident_candidate_id.toLowerCase().includes(kw) ||
          i.relationship_type.toLowerCase().includes(kw) ||
          i.confidence_explanation.toLowerCase().includes(kw)
        );
      }
      
      setIncidents(items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      setError(err.message || 'Failed to load incident candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [page, pageSize, selectedNode, selectedRelType, selectedConfidence]);

  const getRelBadgeStyle = (relType: string) => {
    switch (relType) {
      case 'REDUNDANCY_FAILOVER_COORDINATION':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CROSS_NODE_FAULT_RESONANCE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'RTOS_CONTEXT_SHUTDOWN_CASCADE':
        return 'bg-rose-100 text-rose-900 border-rose-300 font-bold';
      case 'SENSOR_ALTITUDE_FREEZE_ANOMALY':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'NAVIGATION_DATABASE_CYCLE_SYNC':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getNodeBadge = (node: string) => {
    switch (node) {
      case 'NODE_A': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'NODE_B': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'NODE_C': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex justify-between items-start border-b border-gray-200 pb-4">
        <div>
          <div className="text-xs text-aviation-blue font-bold uppercase tracking-wider">FlightStory AI Investigation</div>
          <h2 className="text-2xl font-bold text-aviation-navy tracking-tight mt-1 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2.5 text-aviation-warning" />
            Deterministic Incident Explorer
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Browse and filter cross-FMS incident candidate groups formed through temporal proximity and semantic evidence.
          </p>
        </div>
        <button
          onClick={fetchIncidents}
          disabled={loading}
          className="px-3.5 py-2 bg-white border border-gray-200 rounded text-sm text-aviation-navy hover:bg-gray-50 transition-colors flex items-center shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Filter Controls Bar */}
      <div className="card p-4 bg-white shadow-sm space-y-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Search */}
          <div className="col-span-12 md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search Incident ID, Fault, or Evidence..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-aviation-blue"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchIncidents()}
            />
          </div>

          {/* Node Filter */}
          <div className="col-span-6 md:col-span-2">
            <select
              className="w-full py-2 px-3 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-aviation-blue"
              value={selectedNode}
              onChange={e => { setSelectedNode(e.target.value); setPage(1); }}
            >
              {NODES.map(n => <option key={n} value={n}>Node: {n}</option>)}
            </select>
          </div>

          {/* Relationship Type Filter */}
          <div className="col-span-6 md:col-span-3">
            <select
              className="w-full py-2 px-3 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-aviation-blue"
              value={selectedRelType}
              onChange={e => { setSelectedRelType(e.target.value); setPage(1); }}
            >
              {RELATIONSHIP_TYPES.map(t => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Relationships' : t.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Confidence Filter */}
          <div className="col-span-6 md:col-span-2">
            <select
              className="w-full py-2 px-3 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-aviation-blue"
              value={selectedConfidence}
              onChange={e => { setSelectedConfidence(e.target.value); setPage(1); }}
            >
              {CONFIDENCES.map(c => <option key={c} value={c}>Confidence: {c}</option>)}
            </select>
          </div>

          {/* Page Size */}
          <div className="col-span-6 md:col-span-1">
            <select
              className="w-full py-2 px-2 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-aviation-blue"
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={10}>10 / pg</option>
              <option value={15}>15 / pg</option>
              <option value={25}>25 / pg</option>
              <option value={50}>50 / pg</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {loading ? (
        <div className="card p-12 text-center text-gray-500 bg-white">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-aviation-blue mb-3" />
          <p className="text-sm font-medium">Loading incident candidates from backend...</p>
        </div>
      ) : error ? (
        <div className="card p-8 border-red-200 bg-red-50 text-center">
          <ShieldAlert className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <h3 className="text-base font-bold text-red-800">Error Loading Incidents</h3>
          <p className="text-sm text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchIncidents}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Retry Request
          </button>
        </div>
      ) : incidents.length === 0 ? (
        <div className="card p-12 text-center text-gray-500 bg-white">
          <Filter className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <h3 className="text-base font-bold text-gray-700">No Incident Candidates Matched</h3>
          <p className="text-sm mt-1">Try adjusting your filters or search query.</p>
        </div>
      ) : (
        <div className="card bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Candidate ID</th>
                  <th className="py-3 px-4">Relationship Type</th>
                  <th className="py-3 px-4">Confidence</th>
                  <th className="py-3 px-4">Participating Nodes</th>
                  <th className="py-3 px-4">Time Span (2032-06-18)</th>
                  <th className="py-3 px-4 text-center">Events</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {incidents.map(inc => (
                  <tr 
                    key={inc.incident_candidate_id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/incident/${inc.incident_candidate_id}`)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-aviation-blue">
                      {inc.incident_candidate_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-1 text-xs rounded border font-medium ${getRelBadgeStyle(inc.relationship_type)}`}>
                        {inc.relationship_type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 text-xs rounded font-semibold ${
                        inc.confidence_label === 'HIGH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inc.confidence_label}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-1.5">
                        {inc.participating_nodes.map(n => (
                          <span key={n} className={`px-2 py-0.5 text-xs rounded border font-semibold ${getNodeBadge(n)}`}>
                            {n.replace('NODE_', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 text-xs font-mono">
                      {inc.start_time.split('T')[1]} → {inc.end_time.split('T')[1]} ({inc.duration_seconds}s)
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-aviation-navy">
                      {inc.event_count}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button 
                        className="inline-flex items-center text-xs font-semibold text-aviation-blue hover:text-aviation-navy transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/incident/${inc.incident_candidate_id}`);
                        }}
                      >
                        Inspect
                        <ArrowRight className="w-3.5 h-3.5 ml-1" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold">{Math.min(total, (page - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-semibold">{Math.min(total, page * pageSize)}</span> of{' '}
              <span className="font-semibold">{total}</span> incident groups
            </div>
            
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </button>
              <div className="px-3 py-1.5 bg-white border border-gray-200 rounded font-semibold text-aviation-navy">
                Page {page} of {totalPages}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentExplorer;
