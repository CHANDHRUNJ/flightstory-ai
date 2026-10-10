import { MOCK_HISTORICAL, MOCK_INCIDENTS, MOCK_EVENTS } from '../data/mockData';

export const analyticsEngine = {
  // Simulate anomaly detection with a deterministic rule
  detectAnomaly: (sensorValue: number, baseline: number) => {
    return sensorValue > baseline * 1.5;
  },

  // Simulate graph data generation for 3D mapping
  buildIncidentGraph: (incidentId: string) => {
    const incident = MOCK_INCIDENTS.find(i => i.incidentId === incidentId);
    if (!incident) return { nodes: [], links: [] };

    // Fetch and sort events chronologically
    const events = MOCK_EVENTS.filter(e => incident.eventIds.includes(e.id))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    if (events.length === 0) return { nodes: [], links: [] };

    const nodes: any[] = [];
    const links: any[] = [];

    // Build nodes
    events.forEach((ev, idx) => {
      
      let causalExplanation = 'Telemetry deviated beyond configured predictive thresholds triggering the event chain.';
      if (ev.detail.includes('Vibration')) causalExplanation = 'Engine vibration exceeded baseline, indicating potential mechanical imbalance.';
      else if (ev.detail.includes('Temperature')) causalExplanation = 'Subsequent temperature rise strongly correlates with the earlier vibration increase.';
      else if (ev.detail.includes('RPM')) causalExplanation = 'RPM deviation immediately followed temperature increase, signaling secondary mechanical stress.';
      else if (ev.detail.includes('Warning')) causalExplanation = 'Avionics detected the combined engine anomalies and successfully generated a predictive warning.';
      else if (ev.detail.includes('Response')) causalExplanation = 'Flight control automatically adjusted parameters to compensate for the engine anomaly.';
      else if (ev.detail.includes('Caution')) causalExplanation = 'Master caution was triggered to alert the crew to the contained incident.';

      nodes.push({
        id: ev.id,
        group: ev.system,
        timestamp: ev.timestamp,
        val: (ev as any).value,
        baseline: (ev as any).baseline,
        severity: ev.severity,
        label: ev.detail,
        isFinal: false,
        prevEventName: idx > 0 ? events[idx - 1].detail : 'None (Incident Start)',
        nextEventName: idx < events.length - 1 ? events[idx + 1].detail : 'Final Outcome',
        causalExplanation
      });

      if (idx > 0) {
        links.push({
          source: events[idx - 1].id,
          target: ev.id,
          id: `link-${events[idx-1].id}-${ev.id}`
        });
      }
    });

    // Add Final Outcome node
    const finalNodeId = 'FINAL_OUTCOME';
    nodes.push({
      id: finalNodeId,
      group: 'OUTCOME',
      timestamp: 'FINAL',
      severity: 'FINAL',
      label: 'Incident Contained\nAircraft Continues Monitoring',
      isFinal: true,
      prevEventName: events[events.length - 1].detail,
      nextEventName: 'None (End of Incident)',
      causalExplanation: 'Incident successfully contained based on automatic system response protocols.'
    });

    // Link last event to Final Outcome
    links.push({
      source: events[events.length - 1].id,
      target: finalNodeId,
      id: `link-${events[events.length-1].id}-${finalNodeId}`
    });

    return { nodes, links };
  },

  // Simulating an AI explanation generator based strictly on provided data
  generateEvidenceSummary: (incidentId: string) => {
    if (incidentId === 'INC-2041') {
      return "The earliest detected anomaly was increased engine vibration. A temperature deviation and RPM instability followed within the correlation window, after which the avionics warning was generated and flight-control compensation was activated.";
    }
    return "No AI explanation available for this incident.";
  },

  // Mock fleet-wide risk calculation
  calculateRisk: () => {
    return [
      { model: 'A350', riskScore: 91 },
      { model: 'B777', riskScore: 84 },
      { model: 'A380', riskScore: 88 },
      { model: 'B787', riskScore: 95 }
    ];
  },

  findSimilarIncidents: (incidentId: string) => {
    // Deterministic return for demo scenario
    if (incidentId === 'INC-2041') {
      return MOCK_HISTORICAL.sort((a, b) => b.similarityScore - a.similarityScore);
    }
    return [];
  },

  runWhatIfScenario: (scenarioType: string) => {
    const WHAT_IF_SCENARIOS: any = {
      'Earlier anomaly detection': {
        observed: [
          { time: '10:31:05', step: 'Vibration' },
          { time: '10:31:08', step: 'Temperature' },
          { time: '10:31:12', step: 'RPM' },
          { time: '10:31:15', step: 'Warning' },
          { time: '10:31:18', step: 'Control Response' },
          { time: '10:31:20', step: 'Caution' }
        ],
        hypothetical: [
          { time: '10:30:55', step: 'EARLY DETECTION' },
          { time: '10:30:57', step: 'Investigation' },
          { time: '10:31:02', step: 'Engine condition reviewed' },
          { time: '10:31:05', step: 'Preventive Action' },
          { time: '—', step: 'Incident progression reduced' }
        ],
        metrics: {
          metric1Label: 'Detection Time',
          detectionObserved: '10:31:05',
          detectionWhatIf: '10:30:55',
          metric2Label: 'Investigation Start',
          investigationObserved: '10:31:15',
          investigationWhatIf: '10:30:57',
          eventChainObserved: '6 events',
          eventChainWhatIf: '4 events',
          riskObserved: 'High',
          riskWhatIf: 'Low'
        },
        explanation: {
          cause: 'The engine vibration exceeds its normal baseline before the downstream temperature and RPM deviations.',
          intervention: 'Detect and flag the vibration anomaly earlier.',
          downstreamEffect: 'Temperature deviation — prevented\nRPM deviation — prevented\nAvionics warning — prevented\nFlight-control compensation — not required\nSystem caution — avoided',
          predictedOutcome: 'Incident progression reduced. Early intervention prevents secondary component stress.'
        }
      },
      'Earlier maintenance inspection': {
        observed: [
          { time: '10:31:05', step: 'Vibration' },
          { time: '10:31:08', step: 'Temperature' },
          { time: '10:31:12', step: 'RPM' },
          { time: '10:31:15', step: 'Warning' },
          { time: '10:31:18', step: 'Control Response' },
          { time: '10:31:20', step: 'Caution' }
        ],
        hypothetical: [
          { time: '09:00:00', step: 'Maintenance inspection' },
          { time: '09:15:00', step: 'Engine vibration checked' },
          { time: '09:25:00', step: 'Abnormal component identified' },
          { time: '09:40:00', step: 'Maintenance action completed' },
          { time: '10:31:05', step: 'Normal engine condition' }
        ],
        metrics: {
          metric1Label: 'Detection Time',
          detectionObserved: '10:31:05',
          detectionWhatIf: '09:15:00',
          metric2Label: 'Investigation Start',
          investigationObserved: '10:31:15',
          investigationWhatIf: '09:15:00',
          eventChainObserved: '6 events',
          eventChainWhatIf: '5 events',
          riskObserved: 'High',
          riskWhatIf: 'Low'
        },
        explanation: {
          cause: 'Previous abnormal engine behavior indicates that maintenance could have been performed before the incident.',
          intervention: 'Perform an engine inspection before the flight.',
          downstreamEffect: 'Initial vibration anomaly — reduced/removed\nTemperature deviation — avoided\nRPM deviation — avoided\nAvionics warning — avoided',
          predictedOutcome: 'Flight begins with normal engine condition. Incident completely avoided.'
        }
      },
      'Sensor validation': {
        observed: [
          { time: '10:31:05', step: 'Vibration' },
          { time: '10:31:08', step: 'Temperature' },
          { time: '10:31:12', step: 'RPM' },
          { time: '10:31:15', step: 'Warning' },
          { time: '10:31:18', step: 'Control Response' },
          { time: '10:31:20', step: 'Caution' }
        ],
        hypothetical: [
          { time: '10:31:05', step: 'Vibration Reading' },
          { time: '10:31:06', step: 'Sensor Validation' },
          { time: '10:31:08', step: 'Condition Confirmed' },
          { time: '10:31:10', step: 'Condition assessed' },
          { time: '10:31:12', step: 'Monitoring' },
          { time: '—', step: 'No immediate escalation' }
        ],
        metrics: {
          metric1Label: 'Detection Time',
          detectionObserved: '10:31:05',
          detectionWhatIf: '10:31:05',
          metric2Label: 'Validation Start',
          investigationObserved: 'N/A',
          investigationWhatIf: '10:31:06',
          eventChainObserved: '6 events',
          eventChainWhatIf: '5 events',
          riskObserved: 'High',
          riskWhatIf: 'Medium'
        },
        explanation: {
          cause: 'The abnormal vibration/temperature reading may require validation before escalating the incident.',
          intervention: 'Cross-check the sensor reading against baseline and related engine measurements.',
          downstreamEffect: 'Sensor anomaly is validated earlier.\nNo immediate escalation to avionics warning.\nNo unnecessary flight-control response.',
          predictedOutcome: 'Validation confirms the reading without immediately triggering automated flight-control compensation.'
        }
      },
      'Warning response adjustment': {
        observed: [
          { time: '10:31:05', step: 'Vibration' },
          { time: '10:31:08', step: 'Temperature' },
          { time: '10:31:12', step: 'RPM' },
          { time: '10:31:15', step: 'Warning' },
          { time: '10:31:18', step: 'Control Response' },
          { time: '10:31:20', step: 'Caution' }
        ],
        hypothetical: [
          { time: '10:31:05', step: 'Vibration anomaly' },
          { time: '10:31:08', step: 'Temperature deviation' },
          { time: '10:31:09', step: 'Correlated anomaly recognized' },
          { time: '10:31:10', step: 'Early warning response' },
          { time: '10:31:12', step: 'Condition monitored' }
        ],
        metrics: {
          metric1Label: 'Detection Time',
          detectionObserved: '10:31:05',
          detectionWhatIf: '10:31:05',
          metric2Label: 'Response Start',
          investigationObserved: '10:31:15',
          investigationWhatIf: '10:31:09',
          eventChainObserved: '6 events',
          eventChainWhatIf: '5 events',
          riskObserved: 'High',
          riskWhatIf: 'Medium-Low'
        },
        explanation: {
          cause: 'The engine anomaly progresses until the avionics warning threshold is reached.',
          intervention: 'Trigger an earlier engineering/operational response when correlated vibration + temperature deviations are detected.',
          downstreamEffect: 'RPM deviation — reduced\nAvionics warning — delayed/suppressed\nFlight-control compensation — reduced\nMaster caution — avoided',
          predictedOutcome: 'Early correlated response prevents full system escalation.'
        }
      },
      'Component replacement': {
        observed: [
          { time: '10:31:05', step: 'Vibration' },
          { time: '10:31:08', step: 'Temperature' },
          { time: '10:31:12', step: 'RPM' },
          { time: '10:31:15', step: 'Warning' },
          { time: '10:31:18', step: 'Control Response' },
          { time: '10:31:20', step: 'Caution' }
        ],
        hypothetical: [
          { time: '08:30:00', step: 'Maintenance review' },
          { time: '08:45:00', step: 'Component inspection' },
          { time: '09:00:00', step: 'Component replacement' },
          { time: '09:30:00', step: 'Post-maintenance verification' },
          { time: '10:31:05', step: 'Normal engine operation' },
          { time: '—', step: 'Incident avoided' }
        ],
        metrics: {
          metric1Label: 'Detection Time',
          detectionObserved: '10:31:05',
          detectionWhatIf: 'N/A',
          metric2Label: 'Maintenance Start',
          investigationObserved: '10:31:15',
          investigationWhatIf: '08:30:00',
          eventChainObserved: '6 events',
          eventChainWhatIf: '5 events',
          riskObserved: 'High',
          riskWhatIf: 'Low'
        },
        explanation: {
          cause: 'Historical incidents indicate that abnormal vibration may be associated with a mechanical component requiring inspection/replacement.',
          intervention: 'Replace the suspected component during scheduled maintenance before the incident flight.',
          downstreamEffect: 'Vibration anomaly — avoided\nTemperature deviation — avoided\nRPM deviation — avoided\nAvionics warning — avoided\nFlight-control compensation — not required',
          predictedOutcome: 'Incident is entirely avoided through proactive mechanical replacement.'
        }
      }
    };

    return WHAT_IF_SCENARIOS[scenarioType] || WHAT_IF_SCENARIOS['Earlier anomaly detection'];
  }
};
