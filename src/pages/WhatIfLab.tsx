import { useState } from 'react';
import { analyticsEngine } from '../services/analyticsEngine';
import { FlaskConical, AlertTriangle } from 'lucide-react';

const WhatIfLab = () => {
  const [selectedScenario, setSelectedScenario] = useState('Earlier anomaly detection');
  const scenarioData = analyticsEngine.runWhatIfScenario(selectedScenario);

  const scenarios = [
    'Earlier anomaly detection',
    'Earlier maintenance inspection',
    'Sensor validation',
    'Warning response adjustment',
    'Component replacement'
  ];

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-aviation-navy tracking-tight flex items-center">
          <FlaskConical className="w-6 h-6 mr-3 text-aviation-blue" />
          What-If Lab
        </h2>
        <p className="text-gray-500 mt-1">Explore hypothetical interventions using historical incident data.</p>
        <div className="mt-4 inline-flex items-center px-3 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
          <AlertTriangle className="w-3 h-3 mr-2" />
          Simulation only. Results are hypothetical and are not certified aircraft predictions.
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Controls */}
        <div className="col-span-3 space-y-6">
          <div className="card p-4">
            <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">Target Incident</h3>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="font-medium text-sm text-aviation-navy">INC-2041</div>
              <div className="text-xs text-gray-600">Engine Vibration Anomaly</div>
              <div className="text-xs text-gray-500 mt-1">Aircraft: AV-101</div>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="font-semibold text-xs text-gray-500 uppercase tracking-wider mb-3">Hypothetical Scenario</h3>
            <div className="space-y-2">
              {scenarios.map(sc => (
                <button
                  key={sc}
                  onClick={() => setSelectedScenario(sc)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                    selectedScenario === sc 
                    ? 'bg-aviation-navy text-white' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {sc}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="col-span-9 space-y-6">
          
          <div className="grid grid-cols-2 gap-6">
            <div className="card">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">OBSERVED EVENT CHAIN</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {scenarioData?.observed.map((obs: any, idx: number) => (
                    <div key={idx} className="flex items-center text-sm">
                      <div className="w-20 font-mono text-gray-500 text-xs">{obs.time}</div>
                      <div className="w-4 h-4 rounded-full bg-aviation-critical mr-3"></div>
                      <div className="font-medium text-gray-800">{obs.step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="card border-2 border-aviation-blue">
              <div className="p-4 border-b border-gray-200 bg-blue-50/50">
                <h3 className="font-semibold text-aviation-blue text-sm uppercase tracking-wider">HYPOTHETICAL EVENT CHAIN</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {scenarioData?.hypothetical.map((hyp: any, idx: number) => (
                    <div key={idx} className="flex items-center text-sm">
                      <div className="w-20 font-mono text-aviation-blue text-xs">{hyp.time}</div>
                      <div className="w-4 h-4 rounded-full bg-aviation-blue mr-3"></div>
                      <div className="font-medium text-gray-800">{hyp.step}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">WHY THIS SCENARIO CHANGES THE INCIDENT</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">CAUSE</h4>
                <p className="text-sm text-gray-800">{scenarioData?.explanation?.cause}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">INTERVENTION</h4>
                <p className="text-sm text-gray-800">{scenarioData?.explanation?.intervention}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">DOWNSTREAM EFFECT</h4>
                <div className="text-sm text-gray-800 whitespace-pre-line">{scenarioData?.explanation?.downstreamEffect}</div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">PREDICTED OUTCOME</h4>
                <p className="text-sm text-gray-800">{scenarioData?.explanation?.predictedOutcome}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header">Metric</th>
                  <th className="table-header text-aviation-critical">Observed</th>
                  <th className="table-header text-aviation-blue">What-If Simulation</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="table-cell font-medium">{scenarioData?.metrics?.metric1Label || 'Detection Time'}</td>
                  <td className="table-cell">{scenarioData?.metrics?.detectionObserved}</td>
                  <td className="table-cell font-bold text-aviation-blue">{scenarioData?.metrics?.detectionWhatIf}</td>
                </tr>
                <tr>
                  <td className="table-cell font-medium">{scenarioData?.metrics?.metric2Label || 'Investigation Start'}</td>
                  <td className="table-cell text-aviation-critical">{scenarioData?.metrics?.investigationObserved}</td>
                  <td className="table-cell font-bold text-aviation-blue">{scenarioData?.metrics?.investigationWhatIf}</td>
                </tr>
                <tr>
                  <td className="table-cell font-medium">Event Chain Length</td>
                  <td className="table-cell">{scenarioData?.metrics?.eventChainObserved}</td>
                  <td className="table-cell font-bold text-aviation-blue">{scenarioData?.metrics?.eventChainWhatIf}</td>
                </tr>
                <tr>
                  <td className="table-cell font-medium">Risk Indicator</td>
                  <td className="table-cell">
                    <span className="badge-red">{scenarioData?.metrics?.riskObserved}</span>
                  </td>
                  <td className="table-cell">
                    <span className="badge-blue">{scenarioData?.metrics?.riskWhatIf}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default WhatIfLab;
