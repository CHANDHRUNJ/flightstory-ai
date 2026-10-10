import React, { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import type { EventRecord } from '../services/apiService';
import { 
  Database, Search, Filter, RefreshCw, ChevronLeft, ChevronRight, 
  ShieldAlert, Eye, X
} from 'lucide-react';

const NODES = ['All', 'NODE_A', 'NODE_B', 'NODE_C'];
const FAMILIES = [
  'All',
  'FMS_NAV_GUIDANCE',
  'FMS_FAULT_REPO',
  'FMS_SYS_EVENT',
  'FMS_MODE_STATE',
  'FMS_DIAG_SNAPSHOT'
];

const EventsExplorer: React.FC = () => {
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedNode, setSelectedNode] = useState('All');
  const [selectedFamily, setSelectedFamily] = useState('All');
  const [isCorrelatedFilter, setIsCorrelatedFilter] = useState<'all' | 'true' | 'false'>('all');
  const [search, setSearch] = useState('');

  const [selectedEvent, setSelectedEvent] = useState<EventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiService.getEvents({
        page,
        page_size: pageSize,
        node_id: selectedNode,
        log_family: selectedFamily,
        is_correlated: isCorrelatedFilter === 'all' ? undefined : (isCorrelatedFilter === 'true'),
        keyword: search.trim() || undefined
      });
      setEvents(data.items);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch normalized events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, pageSize, selectedNode, selectedFamily, isCorrelatedFilter]);

  const getNodeColor = (nodeId: string) => {
    switch (nodeId) {
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
          <div className="text-xs text-aviation-blue font-bold uppercase tracking-wider">Dataset Explorer</div>
          <h2 className="text-2xl font-bold text-aviation-navy tracking-tight mt-1 flex items-center">
            <Database className="w-6 h-6 mr-2.5 text-aviation-blue" />
            Raw Normalized Events Explorer
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Browse, search, and inspect all 5,257 chronologically indexed events across the 3 FMS channels.
          </p>
        </div>
        <button
          onClick={fetchEvents}
          disabled={loading}
          className="px-3.5 py-2 bg-white border border-gray-200 rounded text-sm text-aviation-navy hover:bg-gray-50 transition-colors flex items-center shadow-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Filter Controls */}
      <div className="card p-4 bg-white shadow-sm space-y-4">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-4 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search keyword, fault code, or record ID..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-aviation-blue"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchEvents()}
            />
          </div>

          <div className="col-span-6 md:col-span-2">
            <select
              className="w-full py-2 px-3 border border-gray-200 rounded text-sm bg-white"
              value={selectedNode}
              onChange={e => { setSelectedNode(e.target.value); setPage(1); }}
            >
              {NODES.map(n => <option key={n} value={n}>Node: {n}</option>)}
            </select>
          </div>

          <div className="col-span-6 md:col-span-3">
            <select
              className="w-full py-2 px-3 border border-gray-200 rounded text-sm bg-white"
              value={selectedFamily}
              onChange={e => { setSelectedFamily(e.target.value); setPage(1); }}
            >
              {FAMILIES.map(f => <option key={f} value={f}>{f === 'All' ? 'All Log Families' : f}</option>)}
            </select>
          </div>

          <div className="col-span-6 md:col-span-2">
            <select
              className="w-full py-2 px-3 border border-gray-200 rounded text-sm bg-white"
              value={isCorrelatedFilter}
              onChange={e => { setIsCorrelatedFilter(e.target.value as any); setPage(1); }}
            >
              <option value="all">All Events</option>
              <option value="true">Correlated Only (1,669)</option>
              <option value="false">Uncorrelated Only</option>
            </select>
          </div>

          <div className="col-span-6 md:col-span-1">
            <select
              className="w-full py-2 px-2 border border-gray-200 rounded text-sm bg-white"
              value={pageSize}
              onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              <option value={25}>25/pg</option>
              <option value={50}>50/pg</option>
              <option value={100}>100/pg</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Table */}
      {loading ? (
        <div className="card p-12 text-center text-gray-500 bg-white">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-aviation-blue mb-3" />
          <p className="text-sm font-medium">Loading events...</p>
        </div>
      ) : error ? (
        <div className="card p-8 border-red-200 bg-red-50 text-center">
          <ShieldAlert className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="card p-12 text-center text-gray-500 bg-white">
          <Filter className="w-8 h-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm">No events found matching your criteria.</p>
        </div>
      ) : (
        <div className="card bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Node</th>
                  <th className="py-2.5 px-4">Log Family</th>
                  <th className="py-2.5 px-4">Event Message</th>
                  <th className="py-2.5 px-4">Correlated</th>
                  <th className="py-2.5 px-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-mono">
                {events.map(ev => (
                  <tr 
                    key={ev.source_record_id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedEvent(ev)}
                  >
                    <td className="py-2 px-4 whitespace-nowrap text-gray-600 font-bold">
                      {ev.event_time.split('T')[1]}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${getNodeColor(ev.node_id)}`}>
                        {ev.node_id}
                      </span>
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap text-gray-700">
                      {ev.log_family.replace('FMS_', '')}
                    </td>
                    <td className="py-2 px-4 text-aviation-navy font-sans text-xs truncate max-w-md">
                      {ev.event_message}
                    </td>
                    <td className="py-2 px-4 whitespace-nowrap">
                      {ev.is_correlated ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                          {ev.incident_candidate_ids?.[0] || 'Correlated'}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-[10px]">—</span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <button 
                        className="text-aviation-blue hover:text-aviation-navy font-bold text-xs"
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                      >
                        <Eye className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-sm text-gray-600">
            <div>
              Showing <span className="font-semibold">{Math.min(total, (page - 1) * pageSize + 1)}</span> to{' '}
              <span className="font-semibold">{Math.min(total, page * pageSize)}</span> of{' '}
              <span className="font-semibold">{total.toLocaleString()}</span> events
            </div>
            
            <div className="flex space-x-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4 mr-1 inline" />
                Prev
              </button>
              <div className="px-3 py-1.5 bg-white border border-gray-200 rounded font-semibold text-aviation-navy">
                Page {page} of {totalPages}
              </div>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-40"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1 inline" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <h3 className="font-bold text-base text-aviation-navy flex items-center">
                <Database className="w-4 h-4 mr-2 text-aviation-blue" />
                Event Record Inspector
              </h3>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-3 text-xs flex-1">
              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1 font-mono">
                <div><strong>Record ID:</strong> {selectedEvent.source_record_id}</div>
                <div><strong>Source File:</strong> {selectedEvent.source_file}</div>
                <div><strong>Timestamp:</strong> {selectedEvent.event_time}</div>
                <div><strong>Node:</strong> {selectedEvent.node_id}</div>
                <div><strong>Log Family:</strong> {selectedEvent.log_family}</div>
                {selectedEvent.source_sequence !== null && (
                  <div><strong>Sequence #:</strong> {selectedEvent.source_sequence}</div>
                )}
              </div>

              {selectedEvent.original_fields?.message_parameters && Object.keys(selectedEvent.original_fields.message_parameters).length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-700 uppercase tracking-wider mb-1.5">Parsed Message Parameters</h4>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 font-mono text-[11px] max-h-40 overflow-y-auto">
                    {Object.entries(selectedEvent.original_fields.message_parameters).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-slate-100 py-0.5">
                        <span className="text-slate-600 font-semibold">{k}:</span>
                        <span className="text-slate-900 font-bold ml-2 text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedEvent.original_fields?.columns && (
                <div>
                  <h4 className="font-bold text-gray-700 uppercase tracking-wider mb-1.5">Original Table Columns</h4>
                  <div className="bg-slate-50 p-2.5 rounded border border-slate-200 space-y-1 font-mono text-[11px] max-h-48 overflow-y-auto">
                    {Object.entries(selectedEvent.original_fields.columns).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b border-slate-100 py-0.5">
                        <span className="text-slate-600">{k}:</span>
                        <span className="text-slate-900 font-semibold ml-2 text-right">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 pt-3 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-aviation-navy text-white rounded text-xs font-semibold hover:bg-aviation-charcoal"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsExplorer;
