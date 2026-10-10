export interface Aircraft {
  id: string;
  model: string;
  age: number; // in years
  status: 'IN FLIGHT' | 'LANDED' | 'PREPARING' | 'MAINTENANCE' | 'INCIDENT' | 'RETIRED';
  location: string;
  health: number; // percentage
  currentFlight?: string;
  lastMaintenance?: string;
  nextScheduledMaintenance?: string;
}

export interface Flight {
  flightId: string;
  aircraftId: string;
  origin: string;
  destination: string;
  status: 'SCHEDULED' | 'IN FLIGHT' | 'LANDED';
  departure: string;
  arrival: string;
  altitude: string;
  speed: string;
}

export interface SensorEvent {
  id: string;
  timestamp: string;
  aircraftId: string;
  system: string;
  sensor: string;
  value: number;
  baseline: number;
  unit: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  aircraftId: string;
  system: string;
  event: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface Incident {
  incidentId: string;
  aircraftId: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  startTime: string;
  endTime?: string;
  affectedSystems: string[];
  eventIds: string[];
  status: 'ACTIVE' | 'RESOLVED' | 'UNDER INVESTIGATION';
}

export interface HistoricalIncident {
  incidentId: string;
  aircraftId: string;
  date: string;
  subsystem: string;
  sequence: string[];
  similarityScore: number;
  resolution: string;
}

// -----------------------------------------------------------------------------
// Mock Data Collections
// -----------------------------------------------------------------------------

export const MOCK_AIRCRAFT: Aircraft[] = [
  { id: 'AV-101', model: 'A350', age: 4.2, status: 'IN FLIGHT', location: 'Dubai \u2192 London', health: 96, currentFlight: 'AV-421', lastMaintenance: '2026-09-15', nextScheduledMaintenance: '2026-11-01' },
  { id: 'AV-142', model: 'B777', age: 8.1, status: 'LANDED', location: 'Mumbai', health: 89, currentFlight: 'AV-318', lastMaintenance: '2026-08-20', nextScheduledMaintenance: '2026-10-10' },
  { id: 'AV-183', model: 'A380', age: 12.4, status: 'IN FLIGHT', location: 'Singapore \u2192 Dubai', health: 94, currentFlight: 'AV-612', lastMaintenance: '2026-09-01', nextScheduledMaintenance: '2026-12-15' },
  { id: 'AV-205', model: 'B787', age: 3.8, status: 'RETIRED', location: 'Historical', health: 92, lastMaintenance: '2025-11-10' },
  { id: 'AV-210', model: 'A350', age: 2.1, status: 'MAINTENANCE', location: 'Dubai Hangar 4', health: 78, lastMaintenance: '2026-10-01', nextScheduledMaintenance: '2027-01-01' },
  { id: 'AV-255', model: 'A320', age: 1.5, status: 'PREPARING', location: 'Dubai Gate A4', health: 99, currentFlight: 'AV-102', lastMaintenance: '2026-09-20' },
];

export const MOCK_FLIGHTS: Flight[] = [
  { flightId: 'AV-421', aircraftId: 'AV-101', origin: 'Dubai', destination: 'London', status: 'IN FLIGHT', departure: '08:00', arrival: '14:32', altitude: '37,000 ft', speed: '481 kt' },
  { flightId: 'AV-318', aircraftId: 'AV-142', origin: 'Mumbai', destination: 'Dubai', status: 'LANDED', departure: '04:15', arrival: '07:30', altitude: 'Ground', speed: '0 kt' },
  { flightId: 'AV-612', aircraftId: 'AV-183', origin: 'Singapore', destination: 'Dubai', status: 'IN FLIGHT', departure: '10:00', arrival: '16:15', altitude: '35,000 ft', speed: '472 kt' },
  { flightId: 'AV-102', aircraftId: 'AV-255', origin: 'Dubai', destination: 'Jeddah', status: 'SCHEDULED', departure: '18:00', arrival: '20:00', altitude: 'Ground', speed: '0 kt' },
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    incidentId: 'INC-2041',
    aircraftId: 'AV-101',
    title: 'Engine Vibration Anomaly',
    severity: 'HIGH',
    startTime: '10:31:05',
    affectedSystems: ['ENGINE', 'AVIONICS', 'FLIGHT CONTROL'],
    eventIds: ['EV-1', 'EV-2', 'EV-3', 'EV-4', 'EV-5', 'EV-6'],
    status: 'ACTIVE'
  }
];

export const MOCK_EVENTS = [
  { id: 'EV-1', aircraftId: 'AV-101', type: 'SENSOR', timestamp: '10:31:05', system: 'ENGINE', detail: 'Vibration increased', value: 8.7, baseline: 3.2, severity: 'HIGH' },
  { id: 'EV-2', aircraftId: 'AV-101', type: 'SENSOR', timestamp: '10:31:08', system: 'ENGINE', detail: 'Temperature deviation', value: 950, baseline: 805, severity: 'HIGH' },
  { id: 'EV-3', aircraftId: 'AV-101', type: 'SENSOR', timestamp: '10:31:12', system: 'ENGINE', detail: 'RPM deviation', value: 9200, baseline: 9900, severity: 'MEDIUM' },
  { id: 'EV-4', aircraftId: 'AV-101', type: 'SYSTEM', timestamp: '10:31:15', system: 'AVIONICS', detail: 'Engine warning', severity: 'HIGH' },
  { id: 'EV-5', aircraftId: 'AV-101', type: 'SYSTEM', timestamp: '10:31:18', system: 'FLIGHT CONTROL', detail: 'Compensation activated', severity: 'MEDIUM' },
  { id: 'EV-6', aircraftId: 'AV-101', type: 'SYSTEM', timestamp: '10:31:20', system: 'SYSTEM', detail: 'Caution generated', severity: 'MEDIUM' }
];

export const MOCK_HISTORICAL: HistoricalIncident[] = [
  { incidentId: 'INC-1872', aircraftId: 'AV-042', date: '2025-08-14', subsystem: 'Engine Vibration', sequence: ['Vibration Anomaly', 'Temp Deviation', 'Thrust Reduction'], similarityScore: 87, resolution: 'Engine inspection at destination. Replaced bearing.' },
  { incidentId: 'INC-1654', aircraftId: 'AV-112', date: '2025-02-09', subsystem: 'Engine Vibration', sequence: ['Vibration Anomaly', 'Sensor Fault Isolation'], similarityScore: 74, resolution: 'Faulty vibration sensor replaced.' },
  { incidentId: 'INC-1411', aircraftId: 'AV-089', date: '2024-11-20', subsystem: 'Engine Mount', sequence: ['Vibration Anomaly', 'Warning Caution'], similarityScore: 69, resolution: 'Mount tightened during C-check.' }
];
