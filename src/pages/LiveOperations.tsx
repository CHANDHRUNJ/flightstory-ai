import { useNavigate } from 'react-router-dom';
import { MOCK_AIRCRAFT, MOCK_FLIGHTS } from '../data/mockData';

const LiveOperations = () => {
  const navigate = useNavigate();
  const activeAircraft = MOCK_AIRCRAFT.filter(a => a.status === 'IN FLIGHT' || a.status === 'LANDED' || a.status === 'PREPARING');

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-aviation-navy tracking-tight">Live Operations</h2>
        <p className="text-gray-500 mt-1">Currently active aircraft and their operational state.</p>
      </header>

      <div className="card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-header">Aircraft</th>
              <th className="table-header">Flight</th>
              <th className="table-header">Route</th>
              <th className="table-header">Status</th>
              <th className="table-header">Altitude</th>
              <th className="table-header">Speed</th>
              <th className="table-header">ETA</th>
              <th className="table-header">Health</th>
              <th className="table-header">Active Alerts</th>
            </tr>
          </thead>
          <tbody>
            {activeAircraft.map(aircraft => {
              const flight = MOCK_FLIGHTS.find(f => f.aircraftId === aircraft.id);
              return (
                <tr 
                  key={aircraft.id} 
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/aircraft/${aircraft.id}`)}
                >
                  <td className="table-cell font-medium text-aviation-blue">{aircraft.id}</td>
                  <td className="table-cell">{flight ? flight.flightId : '—'}</td>
                  <td className="table-cell">{flight ? `${flight.origin} \u2192 ${flight.destination}` : '—'}</td>
                  <td className="table-cell">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      aircraft.status === 'IN FLIGHT' ? 'bg-aviation-blue/10 text-aviation-blue' :
                      aircraft.status === 'PREPARING' ? 'bg-aviation-warning/10 text-aviation-warning' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {aircraft.status}
                    </span>
                  </td>
                  <td className="table-cell font-mono text-xs">{flight ? flight.altitude : '—'}</td>
                  <td className="table-cell font-mono text-xs">{flight ? flight.speed : '—'}</td>
                  <td className="table-cell font-mono text-xs">{flight ? flight.arrival : '—'}</td>
                  <td className="table-cell">{aircraft.health}%</td>
                  <td className="table-cell">
                    {aircraft.health < 90 ? (
                      <span className="text-xs font-medium text-aviation-critical">Maintenance review</span>
                    ) : (
                      <span className="text-xs text-gray-500">No critical alerts</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveOperations;
