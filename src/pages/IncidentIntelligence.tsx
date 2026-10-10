import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/apiService';
import type { 
  IncidentCandidate, 
  IncidentTimelineResponse, 
  EventRecord 
} from '../services/apiService';
import { TemporalEvidenceGalaxy } from '../components/TemporalEvidenceGalaxy';
import { AIIncidentStoryboard } from '../components/AIIncidentStoryboard';
import { EvidenceRelationshipGraph } from '../components/EvidenceRelationshipGraph';
import { HowWeKnowInspector } from '../components/HowWeKnowInspector';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ChevronRight, 
  ChevronLeft,
  AlertTriangle, 
  Clock, 
  ArrowLeft, 
  ShieldAlert, 
  RefreshCw, 
  Database, 
  Sparkles,
  Network,
  ListOrdered,
  Eye,
  Layers,
  Gauge
} from 'lucide-react';

const IncidentIntelligence: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<IncidentCandidate | null>(null);
  const [timelineData, setTimelineData] = useState<IncidentTimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'galaxy' | 'storyboard' | 'graph' | 'timeline'>('galaxy');

  // Coordinated Replay Controls
  const [isPlaying, setIsPlaying] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<number>(1.0); // 0.5x, 1x, 2x, 5x
  const [currentStepIndex, setCurrentStepIndex] = useState(-1); // -1 = show all

  // Inspector Modal State
  const [inspectorEventId, setInspectorEventId] = useState<string | null>(null);
  const [selectedEventRecord, setSelectedEventRecord] = useState<EventRecord | null>(null);

  const fetchIncidentDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [incData, tlData] = await Promise.all([
        apiService.getIncidentById(id),
        apiService.getIncidentTimeline(id)
      ]);
      setIncident(incData);
      setTimelineData(tlData);
      setCurrentStepIndex(-1);
    } catch (err: any) {
      setError(err.message || `Failed to load incident '${id}'`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidentDetails();
  }, [id]);

  // Replay playback interval
  useEffect(() => {
    let timer: any;
    const eventsCount = timelineData?.timeline_events.length || 0;
    
    if (isPlaying && eventsCount > 0) {
      const intervalMs = Math.max(150, Math.floor(1000 / replaySpeed));
      timer = setInterval(() => {
        setCurrentStepIndex(prev => {
          if (prev < eventsCount - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, intervalMs);
    }
    return () => clearInterval(timer);
  }, [isPlaying, replaySpeed, timelineData]);

  // Active event from current step
  const activeReplayEvent = useMemo(() => {
    if (!timelineData || currentStepIndex === -1 || currentStepIndex >= timelineData.timeline_events.length) {
      return null;
    }
    return timelineData.timeline_events[currentStepIndex];
  }, [timelineData, currentStepIndex]);

  const visibleEvents = useMemo(() => {
    if (!timelineData) return [];
    if (currentStepIndex === -1) return timelineData.timeline_events;
    return timelineData.timeline_events.slice(0, currentStepIndex + 1);
  }, [timelineData, currentStepIndex]);

  const handleOpenInspector = async (eventId: string) => {
    setInspectorEventId(eventId);
    try {
      const full = await apiService.getEventById(eventId);
      setSelectedEventRecord(full);
    } catch (err) {
      setSelectedEventRecord(null);
    }
  };

  const handleCloseInspector = () => {
    setInspectorEventId(null);
    setSelectedEventRecord(null);
  };

  const getNodeColor = (nodeId: string) => {
    switch (nodeId) {
      case 'NODE_A': return 'border-l-cyan-500 bg-cyan-950/40 text-cyan-200 border-cyan-800/60';
      case 'NODE_B': return 'border-l-emerald-500 bg-emerald-950/40 text-emerald-200 border-emerald-800/60';
      case 'NODE_C': return 'border-l-purple-500 bg-purple-950/40 text-purple-200 border-purple-800/60';
      default: return 'border-l-slate-500 bg-slate-900 text-slate-200 border-slate-800';
    }
  };

  if (loading) {
    return (
      <div className="card p-16 text-center text-slate-400 bg-slate-900 border border-slate-800 rounded-xl shadow-lg">
        <RefreshCw className="w-10 h-10 mx-auto animate-spin text-cyan-400 mb-4" />
        <h3 className="text-base font-semibold text-slate-100">Loading Cross-System Investigation Workspace...</h3>
        <p className="text-xs text-slate-400 mt-1">Reconstructing multi-lane galaxy, 9-card storyboard, and evidence topology</p>
      </div>
    );
  }

  if (error || !incident || !timelineData) {
    return (
      <div className="card p-8 border border-red-800 bg-red-950/50 text-center space-y-3 rounded-xl shadow-lg">
        <ShieldAlert className="w-10 h-10 text-red-400 mx-auto" />
        <h3 className="text-lg font-bold text-red-200">Incident Investigation Not Found</h3>
        <p className="text-sm text-red-400">{error || 'Requested incident candidate does not exist in the processed dataset.'}</p>
        <button
          onClick={() => navigate('/incidents')}
          className="px-4 py-2 bg-slate-800 text-slate-200 rounded text-sm font-medium hover:bg-slate-700 transition-colors"
        >
          Back to Incident Explorer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={() => navigate('/incidents')}
          className="inline-flex items-center text-xs font-mono font-semibold text-slate-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back to Incident Explorer
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchIncidentDetails}
            className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-300 hover:bg-slate-800 hover:text-cyan-300 flex items-center shadow-sm transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Incident Header Card */}
      <header className="p-6 bg-slate-900 border border-slate-800 rounded-xl shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-base font-bold text-cyan-300 bg-cyan-950 px-2.5 py-0.5 rounded border border-cyan-700">
                {incident.incident_candidate_id}
              </span>
              <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded border ${
                incident.confidence_label === 'HIGH' 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600' 
                  : 'bg-amber-950/80 text-amber-300 border-amber-600'
              }`}>
                {incident.confidence_label} CONFIDENCE
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-semibold rounded bg-purple-950/80 text-purple-300 border border-purple-700">
                {incident.relationship_type.replace(/_/g, ' ')}
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-100 leading-snug">
              {incident.confidence_explanation}
            </h2>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Span: {incident.start_time.split('T')[1]} → {incident.end_time.split('T')[1]} ({incident.duration_seconds}s)
              </span>
              <span>•</span>
              <span>Total Correlated Events: {incident.event_count}</span>
              <span>•</span>
              <span>Evidence Links: {timelineData.evidence_links.length} verified</span>
            </div>
          </div>

          {/* Participating Physical FMS Channels */}
          <div className="flex flex-col items-start lg:items-end space-y-1.5 flex-shrink-0">
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Participating FMS Channels
            </span>
            <div className="flex flex-wrap gap-1.5">
              {incident.participating_nodes.map(node => {
                let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
                let label = node;
                if (node === 'NODE_A') {
                  badgeClass = 'bg-cyan-950 text-cyan-300 border-cyan-700';
                  label = 'NODE_A (Left FMS)';
                } else if (node === 'NODE_B') {
                  badgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-700';
                  label = 'NODE_B (Center FMS)';
                } else if (node === 'NODE_C') {
                  badgeClass = 'bg-purple-950 text-purple-300 border-purple-700';
                  label = 'NODE_C (Right FMS)';
                }
                return (
                  <span key={node} className={`px-2.5 py-1 text-xs font-mono font-bold rounded border ${badgeClass}`}>
                    {label}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* Universal Replay Controller Ribbon */}
      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl shadow-md space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs font-mono">
          {/* Left: Playback buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                if (currentStepIndex === -1 || currentStepIndex >= timelineData.timeline_events.length - 1) {
                  setCurrentStepIndex(0);
                }
                setIsPlaying(!isPlaying);
              }}
              className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold flex items-center shadow transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4 mr-1.5" /> : <Play className="w-4 h-4 mr-1.5" />}
              {isPlaying ? 'Pause Replay' : 'Play Replay'}
            </button>

            <button
              disabled={currentStepIndex <= 0 && currentStepIndex !== -1}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(prev => Math.max(0, (prev === -1 ? timelineData.timeline_events.length - 1 : prev - 1)));
              }}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg disabled:opacity-40 transition-colors"
              title="Step Backward"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              disabled={currentStepIndex >= timelineData.timeline_events.length - 1}
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(prev => Math.min(timelineData.timeline_events.length - 1, (prev === -1 ? 0 : prev + 1)));
              }}
              className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg disabled:opacity-40 transition-colors"
              title="Step Forward"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentStepIndex(-1);
              }}
              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-lg transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Show All ({timelineData.timeline_events.length})
            </button>
          </div>

          {/* Center: Replay Speed Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-slate-400 text-[11px]">Speed:</span>
            {[0.5, 1.0, 2.0, 5.0].map(speed => (
              <button
                key={speed}
                onClick={() => setReplaySpeed(speed)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  replaySpeed === speed 
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-700' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          {/* Right: Step Indicator */}
          <div className="text-slate-400 text-[11px]">
            {currentStepIndex === -1 ? (
              <span className="text-emerald-400 font-semibold">Displaying all {timelineData.timeline_events.length} timeline events</span>
            ) : (
              <span>
                Step <strong className="text-cyan-300">{currentStepIndex + 1}</strong> of <strong>{timelineData.timeline_events.length}</strong>
                {activeReplayEvent && ` • [${activeReplayEvent.node_id}] ${activeReplayEvent.event_time.split('T')[1]}`}
              </span>
            )}
          </div>
        </div>

        {/* Scrub Slider */}
        <div className="flex items-center space-x-3 pt-1">
          <span className="text-[10px] text-slate-400 font-mono">0</span>
          <input
            type="range"
            min="0"
            max={timelineData.timeline_events.length - 1}
            value={currentStepIndex === -1 ? timelineData.timeline_events.length - 1 : currentStepIndex}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStepIndex(parseInt(e.target.value, 10));
            }}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
          <span className="text-[10px] text-slate-400 font-mono">{timelineData.timeline_events.length - 1}</span>
        </div>
      </div>

      {/* Main View Mode Tabs */}
      <div className="flex border-b border-slate-800 space-x-2 text-xs font-mono font-semibold">
        <button
          onClick={() => setActiveTab('galaxy')}
          className={`px-4 py-2.5 transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'galaxy'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-cyan-400" />
          Temporal Evidence Galaxy
        </button>

        <button
          onClick={() => setActiveTab('storyboard')}
          className={`px-4 py-2.5 transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'storyboard'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-400" />
          AI Incident Storyboard (9 Cards)
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`px-4 py-2.5 transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'graph'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Network className="w-4 h-4 text-emerald-400" />
          Evidence Relationship Graph
        </button>

        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2.5 transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'timeline'
              ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ListOrdered className="w-4 h-4 text-amber-400" />
          Chronological Event Stream
        </button>
      </div>

      {/* Tab 1: Temporal Evidence Galaxy */}
      {activeTab === 'galaxy' && (
        <div className="space-y-4 animate-fadeIn">
          <TemporalEvidenceGalaxy
            incidentId={incident.incident_candidate_id}
            activeReplayEventId={activeReplayEvent?.source_record_id}
            onSelectEvent={(eventId) => handleOpenInspector(eventId)}
            onOpenInspector={(eventId) => handleOpenInspector(eventId)}
          />
        </div>
      )}

      {/* Tab 2: AI Incident Storyboard */}
      {activeTab === 'storyboard' && (
        <div className="space-y-4 animate-fadeIn">
          <AIIncidentStoryboard
            incidentId={incident.incident_candidate_id}
            onSelectEvent={(eventId) => handleOpenInspector(eventId)}
            onOpenInspector={(eventId) => handleOpenInspector(eventId)}
          />
        </div>
      )}

      {/* Tab 3: Evidence Relationship Graph */}
      {activeTab === 'graph' && (
        <div className="space-y-4 animate-fadeIn">
          <EvidenceRelationshipGraph
            timelineData={timelineData}
            onSelectEvent={(eventId) => handleOpenInspector(eventId)}
            onOpenInspector={(eventId) => handleOpenInspector(eventId)}
          />
        </div>
      )}

      {/* Tab 4: Chronological Event Stream */}
      {activeTab === 'timeline' && (
        <div className="grid grid-cols-12 gap-6 animate-fadeIn">
          {/* Left Column: Events List */}
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-xs font-mono">
                <span className="font-bold text-slate-200 uppercase tracking-wider">
                  Timeline Events ({visibleEvents.length} of {timelineData.timeline_events.length})
                </span>
                <span className="text-slate-400">Click event to inspect full record</span>
              </div>

              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {visibleEvents.map((ev) => {
                  const isSelected = inspectorEventId === ev.source_record_id;
                  return (
                    <div
                      key={ev.source_record_id}
                      onClick={() => handleOpenInspector(ev.source_record_id)}
                      className={`p-3 rounded-lg border-l-4 border transition-all cursor-pointer ${getNodeColor(ev.node_id)} ${
                        isSelected ? 'ring-2 ring-cyan-400 shadow-lg' : 'hover:border-cyan-600/60'
                      }`}
                    >
                      <div className="flex justify-between items-center text-xs mb-1 font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold">{ev.node_id}</span>
                          <span className="text-slate-400 font-medium">{ev.event_time.split('T')[1]}</span>
                          {ev.source_sequence !== null && (
                            <span className="text-[10px] text-slate-500">#{ev.source_sequence}</span>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800">
                          {ev.log_family}
                        </span>
                      </div>

                      <div className="text-xs font-mono text-slate-200 mt-1 font-medium">
                        {ev.event_message}
                      </div>

                      {ev.is_invalid_data && (
                        <div className="text-xs text-red-400 font-bold mt-1.5 flex items-center gap-1 font-mono">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                          Sensor Markup Anomaly Flagged
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Quick Preview & Provenance */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 h-full flex flex-col">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center">
                  <Database className="w-4 h-4 mr-2 text-cyan-400" />
                  Quick Record Preview
                </h3>
              </div>

              {!selectedEventRecord ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8 text-center">
                  <Eye className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
                  <p className="text-xs font-mono font-medium text-slate-400">Select any event on the timeline to preview</p>
                  <p className="text-[11px] text-slate-500 mt-1">Full modal inspection with complete fields is also available.</p>
                </div>
              ) : (
                <div className="space-y-4 text-xs font-mono overflow-y-auto max-h-[500px] mt-3">
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <div><span className="text-slate-400">Record ID:</span> <span className="text-cyan-300 font-bold break-all">{selectedEventRecord.source_record_id}</span></div>
                    <div><span className="text-slate-400">Source File:</span> <span className="text-slate-200">{selectedEventRecord.source_file}</span></div>
                    <div><span className="text-slate-400">Timestamp:</span> <span className="text-slate-200">{selectedEventRecord.event_time}</span></div>
                    <div><span className="text-slate-400">FMS Node:</span> <span className="text-slate-200">{selectedEventRecord.node_id}</span></div>
                  </div>

                  <button
                    onClick={() => setInspectorEventId(selectedEventRecord.source_record_id)}
                    className="w-full py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700 rounded-lg font-bold text-center transition-colors"
                  >
                    Open "How We Know" Deep Inspector
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* "How We Know" Lossless Evidence Modal */}
      {inspectorEventId && (
        <HowWeKnowInspector
          sourceRecordId={inspectorEventId}
          eventRecord={selectedEventRecord}
          onClose={handleCloseInspector}
          onSelectEvent={(evId) => handleOpenInspector(evId)}
        />
      )}
    </div>
  );
};

export default IncidentIntelligence;
