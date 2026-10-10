import React, { useState, useMemo, useRef } from 'react';
import type { IncidentTimelineResponse, TimelineEvent } from '../services/apiService';
import { 
  Network, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Info, 
  ExternalLink, 
  Filter, 
  Search,
  CheckCircle2
} from 'lucide-react';

interface EvidenceRelationshipGraphProps {
  timelineData: IncidentTimelineResponse;
  onSelectEvent: (eventId: string) => void;
  onOpenInspector: (eventId: string) => void;
}

interface GraphNode {
  id: string;
  name: string;
  type: 'channel' | 'fault' | 'mode' | 'nav' | 'sys' | 'diag' | 'event';
  nodeId: string;
  family: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  eventRecord?: TimelineEvent;
}

interface GraphLink {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  confidence: string;
  deltaSeconds: number;
  explanation: string;
  isInferred: boolean;
}

export const EvidenceRelationshipGraph: React.FC<EvidenceRelationshipGraphProps> = ({
  timelineData,
  onSelectEvent,
  onOpenInspector
}) => {
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [filterFamily, setFilterFamily] = useState<string>('ALL');

  const containerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const startPanRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Build Graph Nodes and Links from timeline events and correlation evidence
  const { nodes, links } = useMemo(() => {
    const nodeMap: Record<string, GraphNode> = {};
    const linkList: GraphLink[] = [];

    // 1. Channel Hub Nodes (NODE_A, NODE_B, NODE_C)
    const channelConfigs = [
      { id: 'HUB_NODE_A', name: 'NODE_A (Left FMS)', nodeId: 'NODE_A', x: 200, y: 150, color: '#06b6d4' },
      { id: 'HUB_NODE_B', name: 'NODE_B (Center FMS)', nodeId: 'NODE_B', x: 500, y: 150, color: '#10b981' },
      { id: 'HUB_NODE_C', name: 'NODE_C (Right FMS)', nodeId: 'NODE_C', x: 800, y: 150, color: '#8b5cf6' }
    ];

    channelConfigs.forEach(c => {
      nodeMap[c.id] = {
        id: c.id,
        name: c.name,
        type: 'channel',
        nodeId: c.nodeId,
        family: 'CHANNEL_HUB',
        x: c.x,
        y: c.y,
        vx: 0,
        vy: 0,
        radius: 28,
        color: c.color
      };
    });

    // 2. Event Nodes (Sample up to 30 most critical events to maintain clean, readable graph)
    const eventsToRender = timelineData.timeline_events.slice(0, 24);
    const nodeCount = eventsToRender.length;

    eventsToRender.forEach((ev, idx) => {
      let color = '#38bdf8';
      let type: GraphNode['type'] = 'event';

      if (ev.log_family.includes('FAULT')) {
        color = '#ef4444';
        type = 'fault';
      } else if (ev.log_family.includes('MODE')) {
        color = '#a855f7';
        type = 'mode';
      } else if (ev.log_family.includes('NAV')) {
        color = '#f59e0b';
        type = 'nav';
      } else if (ev.log_family.includes('DIAG')) {
        color = '#3b82f6';
        type = 'diag';
      } else {
        color = '#06b6d4';
        type = 'sys';
      }

      // Position events around their parent channel hub in a radial arrangement
      const hub = channelConfigs.find(c => c.nodeId === ev.node_id) || channelConfigs[0];
      const angle = (idx / Math.max(1, nodeCount)) * 2 * Math.PI + (idx * 0.5);
      const dist = 120 + ((idx % 3) * 35);
      const x = hub.x + Math.cos(angle) * dist;
      const y = hub.y + 180 + Math.sin(angle) * 70;

      nodeMap[ev.source_record_id] = {
        id: ev.source_record_id,
        name: ev.source_record_id.split('#')[1] || ev.source_record_id,
        type,
        nodeId: ev.node_id,
        family: ev.log_family,
        x,
        y,
        vx: 0,
        vy: 0,
        radius: 14,
        color,
        eventRecord: ev
      };

      // Link to Channel Hub
      linkList.push({
        id: `link-hub-${ev.source_record_id}`,
        sourceId: hub.id,
        targetId: ev.source_record_id,
        type: 'CHANNEL_ATTACHMENT',
        confidence: 'HIGH',
        deltaSeconds: 0,
        explanation: `Event ${ev.source_record_id} recorded on physical channel ${ev.node_id}.`,
        isInferred: false
      });
    });

    // 3. Evidence links from backend
    timelineData.evidence_links.forEach((el, idx) => {
      if (nodeMap[el.source_event] && nodeMap[el.target_event]) {
        linkList.push({
          id: `link-ev-${idx}`,
          sourceId: el.source_event,
          targetId: el.target_event,
          type: el.relationship_type,
          confidence: el.confidence,
          deltaSeconds: el.time_delta_seconds,
          explanation: el.explanation,
          isInferred: el.confidence !== 'HIGH'
        });
      }
    });

    // Cross-channel synchronization links
    if (timelineData.participating_nodes.length > 1) {
      const hubs = timelineData.participating_nodes.map(n => `HUB_${n}`).filter(id => nodeMap[id]);
      for (let i = 0; i < hubs.length - 1; i++) {
        linkList.push({
          id: `link-channel-sync-${i}`,
          sourceId: hubs[i],
          targetId: hubs[i + 1],
          type: timelineData.relationship_type,
          confidence: timelineData.confidence_label,
          deltaSeconds: timelineData.duration_seconds,
          explanation: `Cross-FMS coordination link between ${hubs[i]} and ${hubs[i+1]}.`,
          isInferred: false
        });
      }
    }

    return {
      nodes: Object.values(nodeMap),
      links: linkList
    };
  }, [timelineData]);

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    startPanRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setPan({
      x: e.clientX - startPanRef.current.x,
      y: e.clientY - startPanRef.current.y
    });
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const filteredNodes = nodes.filter(n => {
    if (filterFamily === 'ALL') return true;
    if (n.type === 'channel') return true;
    return n.family.includes(filterFamily);
  });

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id));

  const filteredLinks = links.filter(l => 
    filteredNodeIds.has(l.sourceId) && filteredNodeIds.has(l.targetId)
  );

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-700/60 text-cyan-400">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-100 text-sm">Evidence Relationship Graph</span>
              <span className="px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 text-[10px]">
                {timelineData.relationship_type.replace(/_/g, ' ')}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Interactive topology • Solid lines = Observed Links | Dashed = Inferred Bridges
            </span>
          </div>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center space-x-2">
          {/* Family Filter */}
          <div className="flex items-center space-x-1 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
            <Filter className="w-3 h-3 text-slate-400" />
            <select
              value={filterFamily}
              onChange={e => setFilterFamily(e.target.value)}
              className="bg-transparent text-slate-200 border-none focus:ring-0 text-xs py-0"
            >
              <option value="ALL">All Families</option>
              <option value="FAULT">Faults</option>
              <option value="MODE">Modes</option>
              <option value="NAV">Nav Guidance</option>
              <option value="SYS">System</option>
            </select>
          </div>

          <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setZoom(z => Math.min(2.5, z + 0.2))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-slate-400 text-[10px]">{zoom.toFixed(1)}x</span>
            <button
              onClick={() => setZoom(z => Math.max(0.6, z - 0.2))}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => { setZoom(1.0); setPan({ x: 0, y: 0 }); }}
              className="p-1 hover:bg-slate-800 rounded text-slate-300"
              title="Reset View"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="relative w-full h-[460px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden cursor-grab active:cursor-grabbing select-none shadow-inner"
      >
        {/* Background Grid */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #38bdf8 1px, transparent 1px)',
            backgroundSize: '28px 28px'
          }}
        />

        {/* Viewport Transform */}
        <svg
          className="w-full h-full"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '500px 250px',
            transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out'
          }}
        >
          {/* Graph Links */}
          <g>
            {filteredLinks.map((link) => {
              const src = nodes.find(n => n.id === link.sourceId);
              const tgt = nodes.find(n => n.id === link.targetId);
              if (!src || !tgt) return null;

              const isChannelLink = link.type === 'CHANNEL_ATTACHMENT';
              const isSelected = selectedLink?.id === link.id;

              return (
                <g key={link.id} className="cursor-pointer" onClick={(e) => { e.stopPropagation(); setSelectedLink(link); }}>
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke={
                      isSelected 
                        ? '#38bdf8' 
                        : link.isInferred 
                        ? '#c084fc' 
                        : isChannelLink 
                        ? '#334155' 
                        : '#06b6d4'
                    }
                    strokeWidth={isSelected ? 3.5 : isChannelLink ? 1.5 : 2.5}
                    strokeDasharray={link.isInferred ? '6 4' : 'none'}
                    opacity={isChannelLink ? 0.4 : 0.85}
                  />
                  {/* Click Target Hitbox */}
                  <line
                    x1={src.x}
                    y1={src.y}
                    x2={tgt.x}
                    y2={tgt.y}
                    stroke="transparent"
                    strokeWidth="16"
                  />
                </g>
              );
            })}
          </g>

          {/* Graph Nodes */}
          <g>
            {filteredNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const isChannel = node.type === 'channel';

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  className="cursor-pointer transition-transform hover:scale-125"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                    if (node.eventRecord) {
                      onSelectEvent(node.id);
                    }
                  }}
                >
                  {/* Outer Ring */}
                  {isChannel ? (
                    <circle
                      r={node.radius}
                      fill="#020617"
                      stroke={node.color}
                      strokeWidth={isSelected ? 4 : 2.5}
                      className="shadow-lg"
                    />
                  ) : (
                    <circle
                      r={node.radius}
                      fill={node.color}
                      stroke={isSelected ? '#ffffff' : '#020617'}
                      strokeWidth={isSelected ? 3 : 1.5}
                      opacity="0.9"
                    />
                  )}

                  {/* Channel Inner Icon / Label */}
                  {isChannel && (
                    <text
                      textAnchor="middle"
                      dy="4"
                      fill={node.color}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {node.nodeId.replace('NODE_', 'FMS-')}
                    </text>
                  )}

                  {/* Node Label Below */}
                  <text
                    textAnchor="middle"
                    dy={node.radius + 14}
                    fill="#94a3b8"
                    fontSize="9"
                    fontFamily="monospace"
                    className="select-none pointer-events-none"
                  >
                    {node.name.length > 16 ? `${node.name.slice(0, 14)}…` : node.name}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>

        {/* Floating Node / Edge Inspector Pill */}
        {selectedNode && (
          <div className="absolute top-4 left-4 max-w-sm p-3.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 shadow-xl text-xs font-mono animate-fadeIn z-30">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400" /> {selectedNode.type === 'channel' ? 'FMS Channel Node' : 'Evidence Record Node'}
              </span>
              <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <p className="font-semibold text-slate-100">{selectedNode.name}</p>
            <p className="text-[11px] text-slate-400 mt-1">Family: {selectedNode.family}</p>
            {selectedNode.eventRecord && (
              <>
                <p className="text-slate-300 font-sans text-xs mt-2 line-clamp-2">
                  {selectedNode.eventRecord.event_message}
                </p>
                <button
                  onClick={() => onOpenInspector(selectedNode.id)}
                  className="mt-3 w-full py-1.5 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded font-semibold text-center flex items-center justify-center gap-1.5"
                >
                  <Search className="w-3 h-3" /> Inspect Complete Record
                </button>
              </>
            )}
          </div>
        )}

        {selectedLink && (
          <div className="absolute bottom-4 right-4 max-w-md p-3.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 shadow-xl text-xs font-mono animate-fadeIn z-30 space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" /> Evidence Link Inspector
              </span>
              <button onClick={() => setSelectedLink(null)} className="text-slate-400 hover:text-slate-200">✕</button>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Relationship:</span>
              <span className="text-purple-300 font-bold">{selectedLink.type}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Confidence:</span>
              <span className="text-emerald-400 font-bold">{selectedLink.confidence} (Δt={selectedLink.deltaSeconds}s)</span>
            </div>
            <p className="text-slate-200 text-xs font-sans bg-slate-950 p-2.5 rounded border border-slate-800">
              {selectedLink.explanation}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => onOpenInspector(selectedLink.sourceId)}
                className="flex-1 py-1 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded text-[11px] flex items-center justify-center gap-1"
              >
                Source <ExternalLink className="w-3 h-3" />
              </button>
              <button
                onClick={() => onOpenInspector(selectedLink.targetId)}
                className="flex-1 py-1 bg-slate-950 hover:bg-slate-800 text-cyan-300 border border-slate-700 rounded text-[11px] flex items-center justify-center gap-1"
              >
                Target <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
