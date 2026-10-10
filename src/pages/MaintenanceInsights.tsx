import { Wrench, Settings, Cpu, AlertTriangle, Calendar, Activity } from 'lucide-react';

const MaintenanceInsights = () => {

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-aviation-navy tracking-tight flex items-center">
          <Wrench className="w-6 h-6 mr-3 text-aviation-blue" />
          Maintenance Insights
        </h2>
        <p className="text-gray-500 mt-1">Component health, operating hours, and upcoming maintenance schedules.</p>
      </header>

      <div className="card p-6">
        <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider mb-4">Component Health Overview</h3>
        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 bg-white border border-gray-200 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-aviation-navy text-lg flex items-center">
                <Settings className="w-5 h-5 mr-2 text-aviation-navy/50" />
                ENGINE #2
              </span>
              <span className="text-aviation-warning font-bold text-xl">87%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
              <div className="bg-aviation-warning h-1.5 rounded-full" style={{ width: '87%' }}></div>
            </div>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 uppercase tracking-widest font-semibold text-[10px]">Operating hours:</span>
                <span className="font-bold">1,284</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 uppercase tracking-widest font-semibold text-[10px]">Previous anomalies:</span>
                <span className="font-bold text-aviation-warning">7</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 uppercase tracking-widest font-semibold text-[10px]">Maintenance events:</span>
                <span className="font-bold">3</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500 uppercase tracking-widest font-semibold text-[10px]">Trend:</span>
                <span className="font-bold text-aviation-warning flex items-center">
                  <Activity className="w-3 h-3 mr-1" /> Increasing vibration
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-4 bg-white border border-gray-200 rounded">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-aviation-navy text-lg flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-aviation-navy/50" />
                AVIONICS
              </span>
              <span className="text-aviation-healthy font-bold text-xl">96%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mb-4">
              <div className="bg-aviation-healthy h-1.5 rounded-full" style={{ width: '96%' }}></div>
            </div>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 uppercase tracking-widest font-semibold text-[10px]">Operating hours:</span>
                <span className="font-bold">4,520</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 uppercase tracking-widest font-semibold text-[10px]">Previous anomalies:</span>
                <span className="font-bold">1</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-1">
                <span className="text-gray-500 uppercase tracking-widest font-semibold text-[10px]">Maintenance events:</span>
                <span className="font-bold">1</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-gray-500 uppercase tracking-widest font-semibold text-[10px]">Trend:</span>
                <span className="font-bold text-aviation-healthy">Stable</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-3">
          <div className="card p-6 border-l-4 border-l-aviation-navy">
            <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider mb-4 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-aviation-warning" />
              Maintenance Priority
            </h3>
            <div className="grid grid-cols-3 gap-4">
              
              <div className="bg-red-50/50 border border-red-200 rounded p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded tracking-widest">HIGH PRIORITY</span>
                  <span className="text-xs font-bold text-red-700"><span className="badge-red">Review</span></span>
                </div>
                <div>
                  <div className="font-bold text-aviation-navy text-lg mb-1">Engine #2</div>
                  <div className="text-xs text-gray-700 mb-2">Reason: Increasing vibration</div>
                  <div className="text-xs text-gray-500 border-t border-red-100 pt-2 mt-2">Next inspection: <span className="font-bold text-red-700">Recommended</span></div>
                </div>
              </div>

              <div className="bg-amber-50/50 border border-amber-200 rounded p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded tracking-widest">MEDIUM PRIORITY</span>
                  <span className="text-xs font-bold text-amber-700"><span className="badge-blue">Monitor</span></span>
                </div>
                <div>
                  <div className="font-bold text-aviation-navy text-lg mb-1">Engine vibration sensor</div>
                  <div className="text-xs text-gray-700 mb-2">Reason: Previous anomalies</div>
                  <div className="text-xs text-gray-500 border-t border-amber-100 pt-2 mt-2">Next inspection: Standard cycle</div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded p-4 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-0.5 rounded tracking-widest">LOW PRIORITY</span>
                  <span className="text-xs font-bold text-gray-700"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200">Normal</span></span>
                </div>
                <div>
                  <div className="font-bold text-aviation-navy text-lg mb-1">Avionics</div>
                  <div className="text-xs text-gray-700 mb-2">Reason: Stable condition</div>
                  <div className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-2">Next inspection: Standard cycle</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Aircraft Currently in Maintenance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Aircraft</th>
                <th className="table-header">Model</th>
                <th className="table-header">Location</th>
                <th className="table-header">Health</th>
                <th className="table-header">Last Maintenance</th>
                <th className="table-header">Expected Completion</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50 border-b border-gray-100">
                <td className="table-cell font-bold text-aviation-blue">AV-210</td>
                <td className="table-cell text-gray-600">A350</td>
                <td className="table-cell">Dubai Hangar 4</td>
                <td className="table-cell text-red-600 font-bold">78%</td>
                <td className="table-cell text-xs font-mono text-gray-500">2026-10-01</td>
                <td className="table-cell text-xs font-mono text-gray-500">2027-01-01</td>
                <td className="table-cell"><span className="badge-blue">In Progress</span></td>
              </tr>
              <tr className="hover:bg-gray-50 border-b border-gray-100">
                <td className="table-cell font-bold text-aviation-blue">AV-118</td>
                <td className="table-cell text-gray-600">B777</td>
                <td className="table-cell">Chennai Hangar 2</td>
                <td className="table-cell text-amber-600 font-bold">82%</td>
                <td className="table-cell text-xs font-mono text-gray-500">2026-09-28</td>
                <td className="table-cell text-xs font-mono text-gray-500">2026-11-15</td>
                <td className="table-cell"><span className="badge-red">Inspection</span></td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="table-cell font-bold text-aviation-blue">AV-092</td>
                <td className="table-cell text-gray-600">A380</td>
                <td className="table-cell">Singapore Hangar 1</td>
                <td className="table-cell text-aviation-healthy font-bold">89%</td>
                <td className="table-cell text-xs font-mono text-gray-500">2026-09-30</td>
                <td className="table-cell text-xs font-mono text-gray-500">2026-10-20</td>
                <td className="table-cell"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200">Scheduled</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-aviation-navy" />
          <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Upcoming Maintenance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Aircraft</th>
                <th className="table-header">Component</th>
                <th className="table-header">Due Date</th>
                <th className="table-header">Priority</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50 border-b border-gray-100">
                <td className="table-cell font-bold text-aviation-navy">AV-101</td>
                <td className="table-cell text-gray-800">Engine #2 Inspection</td>
                <td className="table-cell text-xs font-mono text-gray-600">2026-10-15</td>
                <td className="table-cell"><span className="badge-red">High</span></td>
              </tr>
              <tr className="hover:bg-gray-50 border-b border-gray-100">
                <td className="table-cell font-bold text-aviation-navy">AV-105</td>
                <td className="table-cell text-gray-800">Avionics System Check</td>
                <td className="table-cell text-xs font-mono text-gray-600">2026-10-18</td>
                <td className="table-cell"><span className="badge-blue">Medium</span></td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="table-cell font-bold text-aviation-navy">AV-094</td>
                <td className="table-cell text-gray-800">Landing Gear Overhaul</td>
                <td className="table-cell text-xs font-mono text-gray-600">2026-11-02</td>
                <td className="table-cell"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200">Low</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceInsights;
