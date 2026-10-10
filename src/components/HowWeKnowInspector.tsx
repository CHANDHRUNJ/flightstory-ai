import React, { useState, useEffect } from 'react';
import type { EventRecord, EvidenceLink } from '../services/apiService';
import { apiService } from '../services/apiService';
import { 
  X, 
  FileText, 
  Clock, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  ShieldAlert, 
  Link as LinkIcon,
  Layers,
  Search,
  Code
} from 'lucide-react';

interface HowWeKnowInspectorProps {
  eventRecord?: EventRecord | null;
  sourceRecordId?: string | null;
  evidenceLink?: EvidenceLink | null;
  onClose: () => void;
  onSelectEvent?: (eventId: string) => void;
}

export const HowWeKnowInspector: React.FC<HowWeKnowInspectorProps> = ({
  eventRecord: initialRecord,
  sourceRecordId,
  evidenceLink,
  onClose,
  onSelectEvent
}) => {
  const [record, setRecord] = useState<EventRecord | null>(initialRecord || null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'parsed' | 'raw' | 'provenance' | 'quality'>('parsed');

  useEffect(() => {
    if (initialRecord) {
      setRecord(initialRecord);
      return;
    }
    if (sourceRecordId) {
      setLoading(true);
      setError(null);
      apiService.getEventById(sourceRecordId)
        .then((res) => {
          setRecord(res);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to fetch source record');
          setLoading(false);
        });
    }
  }, [initialRecord, sourceRecordId]);

  const getNodeBadge = (nodeId: string) => {
    switch (nodeId) {
      case 'NODE_A':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-sky-100 text-sky-800 border border-sky-300">NODE_A (Left FMS Channel)</span>;
      case 'NODE_B':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">NODE_B (Center FMS Channel)</span>;
      case 'NODE_C':
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300">NODE_C (Right FMS Channel)</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">{nodeId}</span>;
    }
  };

  const getFamilyBadge = (family: string) => {
    let color = 'text-slate-700 border-slate-300 bg-slate-100';
    if (family.includes('FAULT')) color = 'text-rose-800 border-rose-300 bg-rose-50';
    if (family.includes('SYS')) color = 'text-sky-800 border-sky-300 bg-sky-50';
    if (family.includes('MODE')) color = 'text-purple-800 border-purple-300 bg-purple-50';
    if (family.includes('NAV')) color = 'text-amber-800 border-amber-300 bg-amber-50';
    if (family.includes('DIAG')) color = 'text-blue-800 border-blue-300 bg-blue-50';

    return (
      <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-semibold border ${color}`}>
        {family}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white border border-slate-300 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-sky-100 border border-sky-200 text-sky-700">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold text-slate-900 tracking-wide font-sans">
                  Level 4 — Original Source Evidence Inspector
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider rounded bg-sky-100 text-sky-800 border border-sky-200">
                  Lossless Provenance
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans mt-0.5">
                Exact HTML row fields, decoded parameters, and data-quality flags
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-sky-600">
              <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-mono text-slate-600">Retrieving exact source record from normalized dataset...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Unable to Load Evidence Record</p>
                <p className="text-xs text-rose-600 mt-1">{error}</p>
              </div>
            </div>
          )}

          {evidenceLink && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sky-800 uppercase tracking-wider flex items-center gap-1.5">
                  <LinkIcon className="w-3.5 h-3.5" /> Correlation Link Evidence
                </span>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-100 text-sky-800 border border-sky-200">
                  Δt = {evidenceLink.time_delta_seconds}s | Confidence: {evidenceLink.confidence}
                </span>
              </div>
              <p className="text-sm font-sans text-slate-800">{evidenceLink.explanation}</p>
              <div className="flex items-center gap-2 pt-2 text-xs font-mono text-slate-500 border-t border-slate-200">
                <span>Source:</span>
                <button 
                  onClick={() => onSelectEvent && onSelectEvent(evidenceLink.source_event)}
                  className="text-sky-700 font-bold hover:underline flex items-center gap-1"
                >
                  {evidenceLink.source_event} <ExternalLink className="w-3 h-3" />
                </button>
                <span>→</span>
                <span>Target:</span>
                <button 
                  onClick={() => onSelectEvent && onSelectEvent(evidenceLink.target_event)}
                  className="text-sky-700 font-bold hover:underline flex items-center gap-1"
                >
                  {evidenceLink.target_event} <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {record && (
            <>
              {/* Record Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Source Record ID</span>
                  <span className="text-xs font-mono font-bold text-slate-900 break-all">{record.source_record_id}</span>
                </div>
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Event Time (ISO 8601)</span>
                  <span className="text-xs font-mono text-slate-800 flex items-center gap-1 font-bold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {record.event_time}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">FMS Physical Channel</span>
                  {getNodeBadge(record.node_id)}
                </div>
                <div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block mb-1">Log Family</span>
                  {getFamilyBadge(record.log_family)}
                </div>
              </div>

              {/* Message Banner */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-mono text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" /> Normalized Event Summary
                </div>
                <p className="text-sm font-semibold text-slate-900 font-mono leading-relaxed">
                  {record.event_message}
                </p>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-200 space-x-2">
                <button
                  onClick={() => setActiveTab('parsed')}
                  className={`px-4 py-2 text-xs font-mono font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'parsed'
                      ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Parsed Columns & Parameters
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`px-4 py-2 text-xs font-mono font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'raw'
                      ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Code className="w-3.5 h-3.5" /> Raw Message String
                </button>
                <button
                  onClick={() => setActiveTab('quality')}
                  className={`px-4 py-2 text-xs font-mono font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'quality'
                      ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Data Quality & Validity
                </button>
                <button
                  onClick={() => setActiveTab('provenance')}
                  className={`px-4 py-2 text-xs font-mono font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
                    activeTab === 'provenance'
                      ? 'border-sky-600 text-sky-700 bg-sky-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" /> Provenance & Source File
                </button>
              </div>

              {/* Tab 1: Parsed Columns */}
              {activeTab === 'parsed' && (
                <div className="space-y-4">
                  {record.original_fields?.columns && Object.keys(record.original_fields.columns).length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
                        Extracted Table Columns ({Object.keys(record.original_fields.columns).length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {Object.entries(record.original_fields.columns).map(([colName, colVal]) => (
                          <div key={colName} className="p-2 rounded bg-white border border-slate-200 flex flex-col">
                            <span className="text-[10px] font-mono text-sky-700 uppercase font-semibold">{colName}</span>
                            <span className="text-xs font-mono text-slate-900 mt-0.5 break-all font-bold">
                              {colVal !== '' ? colVal : <span className="text-slate-400 italic font-normal">&lt;empty&gt;</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {record.original_fields?.message_parameters && Object.keys(record.original_fields.message_parameters).length > 0 && (
                    <div>
                      <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider mb-2">
                        Parsed Key-Value Parameters ({Object.keys(record.original_fields.message_parameters).length})
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                        {Object.entries(record.original_fields.message_parameters).map(([k, v]) => (
                          <div key={k} className="p-2 rounded bg-white border border-slate-200 flex flex-col">
                            <span className="text-[10px] font-mono text-purple-700 uppercase font-semibold">{k}</span>
                            <span className="text-xs font-mono text-slate-900 mt-0.5 break-all font-bold">
                              {v !== '' ? v : <span className="text-slate-400 italic font-normal">&lt;empty&gt;</span>}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Raw Message */}
              {activeTab === 'raw' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-slate-500 uppercase tracking-wider">
                    Unmodified Raw String From Source Log Table
                  </h4>
                  <div className="p-4 rounded-lg bg-slate-900 font-mono text-xs text-emerald-400 border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                    {record.original_fields?.raw_message_text || record.event_message}
                  </div>
                </div>
              )}

              {/* Tab 3: Data Quality */}
              {activeTab === 'quality' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center space-x-3">
                      {record.original_fields?.data_quality?.has_invalid_data ? (
                        <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-semibold text-slate-900 block">Sensor Validity</span>
                        <span className="text-[11px] text-slate-500">
                          {record.original_fields?.data_quality?.has_invalid_data ? 'Flagged with Invalid Data' : 'Valid Sensor Readings'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center space-x-3">
                      {record.original_fields?.data_quality?.has_na_data ? (
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-semibold text-slate-900 block">Missing Field Status</span>
                        <span className="text-[11px] text-slate-500">
                          {record.original_fields?.data_quality?.has_na_data ? 'Contains N/A Placeholders' : 'All Fields Present'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center space-x-3">
                      {record.original_fields?.data_quality?.is_redacted ? (
                        <AlertTriangle className="w-5 h-5 text-purple-600 flex-shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      )}
                      <div>
                        <span className="text-xs font-semibold text-slate-900 block">Redaction Status</span>
                        <span className="text-[11px] text-slate-500">
                          {record.original_fields?.data_quality?.is_redacted ? 'Contains Redacted Tokens' : 'Unredacted Payload'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {record.original_fields?.data_quality?.invalid_values && record.original_fields.data_quality.invalid_values.length > 0 && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
                      <span className="text-xs font-mono font-bold text-rose-800 uppercase tracking-wider block mb-1">
                        Detected Invalid Markup Tokens
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {record.original_fields.data_quality.invalid_values.map((v, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs font-mono bg-rose-100 text-rose-800 rounded border border-rose-200">
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Provenance */}
              {activeTab === 'provenance' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200 font-mono text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Source HTML File:</span>
                    <span className="text-slate-900 font-bold">{record.source_file}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Source Row Index:</span>
                    <span className="text-slate-900 font-bold">{record.source_sequence !== null ? `#${record.source_sequence}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-200">
                    <span className="text-slate-500">Associated Incident Candidates:</span>
                    <span className="text-sky-800 font-bold">
                      {record.incident_candidate_ids?.join(', ') || 'None'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500">Correlation Status:</span>
                    <span className={record.is_correlated ? 'text-emerald-700 font-bold' : 'text-slate-600'}>
                      {record.is_correlated ? 'Correlated into Incident Candidate' : 'Uncorrelated Baseline Event'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Validated Deterministic Ingestion • Zero Speculation</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold transition-colors shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
