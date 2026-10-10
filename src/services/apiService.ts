/**
 * FlightStory AI - Centralized API Service
 * Connects frontend to the FastAPI Incident Intelligence backend.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export interface HealthData {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  loaded_events_count: number;
  loaded_incidents_count: number;
}

export interface SummaryData {
  total_events: number;
  total_incidents: number;
  total_correlated_events: number;
  correlation_coverage_percent: number;
  cross_node_incidents: number;
  single_node_incidents: number;
  records_by_node: Record<string, number>;
  records_by_family: Record<string, number>;
  records_by_node_and_family: Record<string, Record<string, number>>;
  relationship_type_breakdown: Record<string, number>;
  confidence_level_breakdown: Record<string, number>;
  participating_nodes_topology: Record<string, number>;
  window_comparison_analysis: Record<string, {
    window_seconds: number;
    incident_candidates_count: number;
    total_correlated_events: number;
    percent_dataset_correlated: number;
    cross_node_incidents_count: number;
    relationship_type_breakdown: Record<string, number>;
    confidence_level_breakdown: Record<string, number>;
  }>;
}

export interface EvidenceLink {
  source_event: string;
  target_event: string;
  relationship_type: string;
  confidence: string;
  explanation: string;
  time_delta_seconds: number;
}

export interface IncidentCandidate {
  incident_candidate_id: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  relationship_type: string;
  confidence_label: string;
  confidence_explanation: string;
  participating_nodes: string[];
  participating_log_families: string[];
  event_count: number;
  ordered_event_references: string[];
  observed_event_descriptions: string[];
  correlation_evidence: EvidenceLink[];
  referenced_events?: EventRecord[];
}

export interface EventRecord {
  source_record_id: string;
  event_time: string;
  node_id: string;
  log_family: string;
  source_file: string;
  source_sequence: number | null;
  event_message: string;
  incident_candidate_ids?: string[];
  is_correlated?: boolean;
  original_fields?: {
    columns?: Record<string, string>;
    message_parameters?: Record<string, string>;
    raw_message_text?: string;
    data_quality?: {
      has_invalid_data?: boolean;
      invalid_values?: string[];
      has_na_data?: boolean;
      is_redacted?: boolean;
    };
  };
}

export interface TimelineEvent {
  source_record_id: string;
  event_time: string;
  node_id: string;
  log_family: string;
  source_file: string;
  source_sequence: number | null;
  event_message: string;
  is_invalid_data: boolean;
  invalid_values: string[];
  has_na_data: boolean;
  is_redacted: boolean;
  evidence_links: EvidenceLink[];
}

export interface IncidentTimelineResponse {
  incident_id: string;
  relationship_type: string;
  confidence_label: string;
  confidence_explanation: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  participating_nodes: string[];
  participating_log_families: string[];
  event_count: number;
  timeline_events: TimelineEvent[];
  evidence_links: EvidenceLink[];
}

export interface PaginatedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  items: T[];
}

export interface HistogramBucket {
  time: string;
  critical: number;
  warning: number;
  info: number;
  total: number;
}

export interface HistogramResponse {
  interval_minutes: number;
  histogram: HistogramBucket[];
}

export interface IncidentFilterParams {
  page?: number;
  page_size?: number;
  node?: string;
  relationship_type?: string;
  confidence?: string;
  start_time?: string;
  end_time?: string;
}

export interface EventFilterParams {
  page?: number;
  page_size?: number;
  node_id?: string;
  log_family?: string;
  start_time?: string;
  end_time?: string;
  is_correlated?: boolean;
  significant_only?: boolean;
  incident_id?: string;
  keyword?: string;
}

export interface StoryboardCard {
  card_id: string;
  title: string;
  claim: string;
  label: 'CONFIRMED OBSERVATION' | 'CORROBORATED FINDING' | 'POSSIBLE INTERPRETATION' | 'UNKNOWN / INSUFFICIENT EVIDENCE' | 'CONFIRMED CAUSAL EXPLANATION';
  text: string;
  evidence_references: string[];
  strengths: string[];
  limitations: string[];
  is_inference: boolean;
}

export interface PlainEnglishSummary {
  section_a_what_happened: string;
  section_b_how_it_unfolded: Array<{
    step: number;
    timestamp: string;
    node: string;
    description: string;
    source_record_id: string;
  }>;
  section_c_evidence_support: Array<{
    claim: string;
    evidence_references: string[];
  }>;
  section_d_known_vs_uncertain: {
    what_is_known: string;
    what_is_uncertain: string;
  };
  section_e_what_happened_afterward: string;
}

export interface StoryboardResponse {
  incident_id: string;
  relationship_type: string;
  confidence_label: string;
  confidence_explanation: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  participating_nodes: string[];
  participating_log_families: string[];
  event_count: number;
  llm_provider_status: {
    configured: boolean;
    provider: string;
    model: string;
    is_simulated_llm: boolean;
    configuration_status: string;
  };
  plain_english_summary?: PlainEnglishSummary;
  cards: StoryboardCard[];
}

export interface DetectedDataGap {
  node_id: string;
  gap_type: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  preceding_event?: string;
  following_event?: string;
  is_inferred_bridge: boolean;
  explanation: string;
}

export interface GalaxyContextEvent extends EventRecord {
  is_in_selected_incident?: boolean;
}

export interface GalaxyResponse {
  incident: IncidentCandidate;
  timeline_span: {
    window_start: string;
    window_end: string;
    incident_start: string;
    incident_end: string;
    context_seconds: number;
  };
  incident_events_count: number;
  total_context_events_count: number;
  context_events: GalaxyContextEvent[];
  detected_data_gaps: DetectedDataGap[];
  evidence_links: EvidenceLink[];
}

export interface SkippedRecordSample {
  source_file: string;
  row_index: number;
  reason: string;
  data_sample: string;
}

export interface IngestSummary {
  status: string;
  total_files: number;
  total_raw_rows_scanned: number;
  total_normalized_records: number;
  total_skipped_rows: number;
  total_failed_rows: number;
  duplicate_records_prevented: number;
  uncorrelated_baseline_records: number;
  correlated_incident_records: number;
  records_by_node: Record<string, number>;
  records_by_family: Record<string, number>;
  timestamp_parsing_errors: number;
  skipped_records_sample: SkippedRecordSample[];
  last_ingestion_timestamp: string;
}

export const apiService = {
  async getHealth(): Promise<HealthData> {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    if (!res.ok) throw new Error(`Failed to fetch API health (Status ${res.status})`);
    return res.json();
  },

  async getSummary(): Promise<SummaryData> {
    const res = await fetch(`${API_BASE_URL}/api/summary`);
    if (!res.ok) throw new Error(`Failed to fetch dataset summary (Status ${res.status})`);
    return res.json();
  },

  async getIngestSummary(): Promise<IngestSummary> {
    const res = await fetch(`${API_BASE_URL}/api/ingest/summary`);
    if (!res.ok) throw new Error(`Failed to fetch ingestion summary (Status ${res.status})`);
    return res.json();
  },

  async runIngestPipeline(): Promise<IngestSummary> {
    const res = await fetch(`${API_BASE_URL}/api/ingest/run`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to run ingestion pipeline (Status ${res.status})`);
    return res.json();
  },

  async getIncidents(params: IncidentFilterParams = {}): Promise<PaginatedResponse<IncidentCandidate>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params.node && params.node !== 'All') searchParams.append('node', params.node);
    if (params.relationship_type && params.relationship_type !== 'All') searchParams.append('relationship_type', params.relationship_type);
    if (params.confidence && params.confidence !== 'All') searchParams.append('confidence', params.confidence);
    if (params.start_time) searchParams.append('start_time', params.start_time);
    if (params.end_time) searchParams.append('end_time', params.end_time);

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/incidents${query ? `?${query}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch incidents (Status ${res.status})`);
    return res.json();
  },

  async getIncidentById(incidentId: string): Promise<IncidentCandidate> {
    const res = await fetch(`${API_BASE_URL}/api/incidents/${encodeURIComponent(incidentId)}`);
    if (!res.ok) throw new Error(`Incident candidate '${incidentId}' not found (Status ${res.status})`);
    return res.json();
  },

  async getIncidentTimeline(incidentId: string): Promise<IncidentTimelineResponse> {
    const res = await fetch(`${API_BASE_URL}/api/incidents/${encodeURIComponent(incidentId)}/timeline`);
    if (!res.ok) throw new Error(`Failed to fetch incident timeline for '${incidentId}' (Status ${res.status})`);
    return res.json();
  },

  async getIncidentExplain(incidentId: string): Promise<StoryboardResponse> {
    const res = await fetch(`${API_BASE_URL}/api/incidents/${encodeURIComponent(incidentId)}/explain`);
    if (!res.ok) throw new Error(`Failed to generate explanation for '${incidentId}' (Status ${res.status})`);
    return res.json();
  },

  async getIncidentGalaxy(incidentId: string, contextSeconds = 30): Promise<GalaxyResponse> {
    const res = await fetch(`${API_BASE_URL}/api/incidents/${encodeURIComponent(incidentId)}/galaxy?context_seconds=${contextSeconds}`);
    if (!res.ok) throw new Error(`Failed to fetch galaxy data for '${incidentId}' (Status ${res.status})`);
    return res.json();
  },

  async getEvents(params: EventFilterParams = {}): Promise<PaginatedResponse<EventRecord>> {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.page_size) searchParams.append('page_size', params.page_size.toString());
    if (params.node_id && params.node_id !== 'All') searchParams.append('node_id', params.node_id);
    if (params.log_family && params.log_family !== 'All') searchParams.append('log_family', params.log_family);
    if (params.start_time) searchParams.append('start_time', params.start_time);
    if (params.end_time) searchParams.append('end_time', params.end_time);
    if (params.is_correlated !== undefined) searchParams.append('is_correlated', params.is_correlated.toString());
    if (params.significant_only !== undefined) searchParams.append('significant_only', params.significant_only.toString());
    if (params.incident_id) searchParams.append('incident_id', params.incident_id);
    if (params.keyword) searchParams.append('keyword', params.keyword);

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/events${query ? `?${query}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch events (Status ${res.status})`);
    return res.json();
  },

  async getEventsHistogram(params: EventFilterParams = {}): Promise<HistogramResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('interval_minutes', '10');
    if (params.node_id && params.node_id !== 'All') searchParams.append('node_id', params.node_id);
    if (params.log_family && params.log_family !== 'All') searchParams.append('log_family', params.log_family);
    if (params.start_time) searchParams.append('start_time', params.start_time);
    if (params.end_time) searchParams.append('end_time', params.end_time);
    if (params.is_correlated !== undefined) searchParams.append('is_correlated', params.is_correlated.toString());
    if (params.significant_only !== undefined) searchParams.append('significant_only', params.significant_only.toString());
    if (params.incident_id) searchParams.append('incident_id', params.incident_id);
    if (params.keyword) searchParams.append('keyword', params.keyword);

    const query = searchParams.toString();
    const url = `${API_BASE_URL}/api/events/histogram${query ? `?${query}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch events histogram (Status ${res.status})`);
    return res.json();
  },

  async getEventById(sourceRecordId: string): Promise<EventRecord> {
    const res = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(sourceRecordId)}`);
    if (!res.ok) throw new Error(`Event '${sourceRecordId}' not found (Status ${res.status})`);
    return res.json();
  }
};


