import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_AIRCRAFT, MOCK_INCIDENTS, MOCK_EVENTS } from '../data/mockData';
import { Plane, AlertTriangle, ArrowRight } from 'lucide-react';

const AircraftIntelligence = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const aircraft = MOCK_AIRCRAFT.find(a => a.id === id);
  const [activeTab, setActiveTab] = useState('Overview');

  if (!aircraft) {
    return <div>Aircraft not found</div>;
  }

  const activeIncident = MOCK_INCIDENTS.find(i => i.aircraftId === id && i.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h2 className="text-2xl font-bold text-aviation-navy tracking-tight">{aircraft.id} Intelligence</h2>
            <span className={`px-2 py-1 text-xs font-medium rounded ${
              aircraft.status === 'IN FLIGHT' ? 'bg-aviation-blue/10 text-aviation-blue' :
              aircraft.status === 'RETIRED' ? 'bg-gray-100 text-gray-600' :
              'bg-aviation-healthy/10 text-aviation-healthy'
            }`}>
              {aircraft.status}
            </span>
          </div>
          <p className="text-gray-500">Model: {aircraft.model} • Age: {aircraft.age} years • Current Location: {aircraft.location}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 font-semibold mb-1">OVERALL HEALTH</div>
          <div className="text-3xl font-bold text-aviation-healthy">{aircraft.health}%</div>
        </div>
      </header>

      {/* Tabs Placeholder */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['Overview', 'Events', 'Incidents', 'Maintenance', 'Flight History'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`${activeTab === tab ? 'border-aviation-navy text-aviation-navy font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'Overview' && (
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          
          {/* Active Incident Warning */}
          {activeIncident && (
            <div className="bg-aviation-critical/10 border border-aviation-critical/20 rounded p-4 flex justify-between items-center">
              <div className="flex items-start">
                <AlertTriangle className="w-5 h-5 text-aviation-critical mr-3 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-aviation-critical">ACTIVE INCIDENT: {activeIncident.title}</h3>
                  <p className="text-xs text-aviation-critical/80 mt-1">Severity: HIGH • Detected: {activeIncident.startTime}</p>
                </div>
              </div>
              <button 
                onClick={() => navigate(`/incident/${activeIncident.incidentId}`)}
                className="px-4 py-2 bg-aviation-critical text-white text-sm font-medium rounded hover:bg-aviation-critical/90 transition-colors flex items-center"
              >
                Investigate
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          )}

          <div className="card">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Current Flight Status</h3>
            </div>
            <div className="p-6 flex items-center justify-between">
              <div className="text-center">
                <div className="text-2xl font-bold text-aviation-navy">DXB</div>
                <div className="text-xs text-gray-500">Dubai</div>
              </div>
              <div className="flex-1 px-8 relative">
                <div className="h-0.5 w-full bg-gray-200 absolute top-1/2 -translate-y-1/2"></div>
                <Plane className="w-6 h-6 text-aviation-blue absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2" />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-aviation-navy">LHR</div>
                <div className="text-xs text-gray-500">London</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 border-t border-gray-100 p-4 bg-gray-50/50">
              <div>
                <div className="text-xs text-gray-500 mb-1">Flight</div>
                <div className="font-medium">{aircraft.currentFlight || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Altitude</div>
                <div className="font-medium">37,000 ft</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Speed</div>
                <div className="font-medium">481 kt</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Component Health</h3>
            </div>
            <div className="p-4 space-y-4">
              {[
                { name: 'ENGINE 1', health: 94 },
                { name: 'ENGINE 2', health: 87, warning: true },
                { name: 'AVIONICS', health: 96 },
                { name: 'FLIGHT CONTROL', health: 98 },
              ].map(comp => (
                <div key={comp.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{comp.name}</span>
                    <span className={`font-bold ${comp.warning ? 'text-aviation-warning' : 'text-aviation-healthy'}`}>{comp.health}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded overflow-hidden">
                    <div 
                      className={`h-full ${comp.warning ? 'bg-aviation-warning' : 'bg-aviation-healthy'}`}
                      style={{ width: `${comp.health}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === 'Events' && (
        <div className="card">
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Encountered Events</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Timestamp</th>
                <th className="table-header">System</th>
                <th className="table-header">Event Detail</th>
                <th className="table-header">Value / Baseline</th>
                <th className="table-header">Severity</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_EVENTS.filter(e => e.aircraftId === id).map(event => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="table-cell font-mono text-xs">{event.timestamp}</td>
                  <td className="table-cell font-medium">{event.system}</td>
                  <td className="table-cell text-gray-700">{event.detail}</td>
                  <td className="table-cell font-mono text-xs text-gray-500">
                    {event.value ? `${event.value} / ${event.baseline}` : '—'}
                  </td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      event.severity === 'HIGH' ? 'bg-aviation-critical/10 text-aviation-critical' :
                      event.severity === 'MEDIUM' ? 'bg-aviation-warning/10 text-aviation-warning' :
                      'bg-aviation-healthy/10 text-aviation-healthy'
                    }`}>
                      {event.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default AircraftIntelligence;
