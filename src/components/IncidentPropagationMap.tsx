import React from 'react';
import type { TimelineEvent, EvidenceLink } from '../services/apiService';
import { Cpu, ShieldCheck, AlertTriangle } from 'lucide-react';

interface IncidentPropagationMapProps {
  participatingNodes: string[];
  timelineEvents: TimelineEvent[];
  evidenceLinks: EvidenceLink[];
  selectedEventId?: string | null;
  onSelectEvent: (event: TimelineEvent) => void;
  onSelectEvidence?: (link: EvidenceLink) => void;
}

export const IncidentPropagationMap: React.FC<IncidentPropagationMapProps> = ({
  participatingNodes,
  timelineEvents,
  evidenceLinks,
  selectedEventId,
  onSelectEvent,
  onSelectEvidence
}) => {
  // Group events by node
  const eventsByNode: Record<string, TimelineEvent[]> = {
    NODE_A: timelineEvents.filter(e => e.node_id === 'NODE_A'),
    NODE_B: timelineEvents.filter(e => e.node_id === 'NODE_B'),
    NODE_C: timelineEvents.filter(e => e.node_id === 'NODE_C')
  };

  const getNodeTheme = (nodeId: string) => {
    switch (nodeId) {
      case 'NODE_A':
        return {
          title: 'NODE_A (Left FMS Channel)',
          bg: 'bg-blue-50/50',
          border: 'border-blue-300',
          headerBg: 'bg-blue-600',
          badgeBg: 'bg-blue-100 text-blue-800'
        };
      case 'NODE_B':
        return {
          title: 'NODE_B (Center FMS Channel)',
          bg: 'bg-emerald-50/50',
          border: 'border-emerald-300',
          headerBg: 'bg-emerald-600',
          badgeBg: 'bg-emerald-100 text-emerald-800'
        };
      case 'NODE_C':
        return {
          title: 'NODE_C (Right FMS Channel)',
          bg: 'bg-orange-50/50',
          border: 'border-orange-300',
          headerBg: 'bg-orange-600',
          badgeBg: 'bg-orange-100 text-orange-800'
        };
      default:
        return {
          title: nodeId,
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          headerBg: 'bg-gray-600',
          badgeBg: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const getEvidenceColor = (relType: string) => {
    switch (relType) {
      case 'CROSS_NODE_FAULT_RESONANCE': return 'border-red-400 bg-red-50 text-red-800';
      case 'REDUNDANCY_FAILOVER_COORDINATION': return 'border-purple-400 bg-purple-50 text-purple-800';
      case 'SENSOR_ALTITUDE_FREEZE_ANOMALY': return 'border-amber-400 bg-amber-50 text-amber-800';
      case 'NAVIGATION_DATABASE_CYCLE_SYNC': return 'border-blue-400 bg-blue-50 text-blue-800';
      case 'RTOS_CONTEXT_SHUTDOWN_CASCADE': return 'border-rose-500 bg-rose-50 text-rose-900';
      default: return 'border-slate-300 bg-slate-50 text-slate-800';
    }
  };

  return (
    <div className="card p-5 bg-white shadow-sm space-y-6">
      {/* Map Header */}
      <div className="flex justify-between items-center border-b border-gray-200 pb-3">
        <div>
          <h3 className="text-sm font-bold text-aviation-navy uppercase tracking-wider flex items-center">
            <Cpu className="w-4 h-4 mr-2 text-aviation-blue" />
            2D Cross-FMS Incident Propagation Map
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Pictorial representation of participating channels and evidence-supported relationships.
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mr-1.5" />
            Observed Evidence
          </span>
          <span className="flex items-center text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 mr-1.5" />
            Synchronous Match
          </span>
          <span className="flex items-center text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 mr-1.5" />
            Sensor Freeze
          </span>
        </div>
      </div>

      {/* 3-Column Node Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['NODE_A', 'NODE_B', 'NODE_C'].map(nodeId => {
          const theme = getNodeTheme(nodeId);
          const isParticipating = participatingNodes.includes(nodeId);
          const nodeEvents = eventsByNode[nodeId] || [];

          return (
            <div
              key={nodeId}
              className={`rounded-lg border-2 flex flex-col transition-all ${
                isParticipating ? `${theme.border} ${theme.bg} shadow-sm` : 'border-gray-200 bg-gray-50/50 opacity-60'
              }`}
            >
              {/* Channel Header */}
              <div className={`${theme.headerBg} text-white p-3 rounded-t-md flex justify-between items-center`}>
                <div className="text-xs font-bold uppercase tracking-wider">{nodeId}</div>
                <div className="text-[11px] font-medium opacity-90">
                  {nodeEvents.length} events
                </div>
              </div>

              {/* Channel Subtitle */}
              <div className="px-3 py-1.5 bg-white/80 border-b border-gray-200 text-[11px] font-medium text-gray-600">
                {theme.title.split('(')[1]?.replace(')', '') || theme.title}
              </div>

              {/* Event Stack */}
              <div className="p-3 space-y-2 flex-1 max-h-80 overflow-y-auto">
                {nodeEvents.length === 0 ? (
                  <div className="text-xs text-gray-400 italic text-center py-6">
                    No active events on this channel during this incident window.
                  </div>
                ) : (
                  nodeEvents.map(ev => {
                    const isSelected = selectedEventId === ev.source_record_id;
                    return (
                      <div
                        key={ev.source_record_id}
                        onClick={() => onSelectEvent(ev)}
                        className={`p-2.5 rounded border text-xs cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-aviation-blue text-white border-aviation-navy shadow-md ring-2 ring-aviation-lightBlue' 
                            : 'bg-white hover:bg-slate-50 border-gray-200 text-aviation-navy'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className={`font-mono text-[11px] font-bold ${isSelected ? 'text-white' : 'text-aviation-blue'}`}>
                            {ev.event_time.split('T')[1]}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {ev.log_family.replace('FMS_', '')}
                          </span>
                        </div>

                        <div className={`line-clamp-2 ${isSelected ? 'text-white' : 'text-gray-800'} font-medium`}>
                          {ev.event_message}
                        </div>

                        {ev.is_invalid_data && (
                          <div className={`text-[10px] mt-1 font-bold flex items-center ${isSelected ? 'text-amber-200' : 'text-red-600'}`}>
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Sensor Anomaly (Invalid Tag)
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Supporting Evidence Links Panel */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-xs font-bold text-aviation-navy uppercase tracking-wider mb-2.5 flex items-center">
          <ShieldCheck className="w-4 h-4 mr-1.5 text-emerald-600" />
          Evidence-Supported Cross-Node Linkages ({evidenceLinks.length} items)
        </h4>

        {evidenceLinks.length === 0 ? (
          <div className="text-xs text-gray-500 italic p-3 bg-gray-50 rounded">
            No pairwise evidence links recorded for this incident.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
            {evidenceLinks.map((link, idx) => (
              <div 
                key={idx}
                onClick={() => {
                  if (onSelectEvidence) onSelectEvidence(link);
                }}
                className={`p-2.5 rounded border text-xs cursor-pointer transition-all hover:shadow-sm ${getEvidenceColor(link.relationship_type)}`}
              >
                <div className="flex justify-between items-center font-semibold mb-1">
                  <span className="font-bold tracking-tight">{link.relationship_type.replace(/_/g, ' ')}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/80 border border-current">
                    Δt: {link.time_delta_seconds}s • {link.confidence}
                  </span>
                </div>
                <p className="text-[11px] opacity-90 mb-1">{link.explanation}</p>
                <div className="text-[10px] font-mono opacity-80 truncate">
                  {link.source_event} → {link.target_event}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default IncidentPropagationMap;
