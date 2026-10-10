import { MOCK_HISTORICAL } from '../data/mockData';
import { History, Search, ListTree, PieChart, Activity, Wrench } from 'lucide-react';

const HistoricalIntelligence = () => {

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-aviation-navy tracking-tight flex items-center">
          <History className="w-6 h-6 mr-3 text-aviation-blue" />
          Historical Intelligence
        </h2>
        <p className="text-gray-500 mt-1">Retired aircraft data and historical incidents.</p>
      </header>

      <div className="card">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Historical Similarity Search</h3>
        </div>
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Find incidents similar to INC-2041"
              defaultValue="INC-2041"
              className="pl-9 pr-4 py-2 border border-gray-200 rounded text-sm w-full focus:outline-none focus:ring-1 focus:ring-aviation-navy bg-gray-50"
              readOnly
            />
          </div>
        </div>
        <div className="p-0">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Similarity</th>
                <th className="table-header">Incident ID</th>
                <th className="table-header">Aircraft</th>
                <th className="table-header">Date</th>
                <th className="table-header">Subsystem</th>
                <th className="table-header">Resolution</th>
                <th className="table-header text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORICAL.map((sim, index) => (
                <tr key={sim.incidentId} className={`hover:bg-gray-50 transition-colors ${index === 0 ? 'bg-blue-50/30' : ''}`}>
                  <td className="table-cell">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        sim.similarityScore >= 80 ? 'bg-aviation-healthy/20 text-aviation-healthy' : 'bg-aviation-warning/20 text-aviation-warning'
                      }`}>
                        {sim.similarityScore}%
                      </span>
                      {index === 0 && <span className="text-[9px] font-bold text-aviation-blue bg-blue-100 px-1.5 py-0.5 rounded tracking-widest">MATCH</span>}
                    </div>
                  </td>
                  <td className="table-cell font-bold text-aviation-blue cursor-pointer hover:underline">{sim.incidentId}</td>
                  <td className="table-cell text-gray-700">{sim.aircraftId}</td>
                  <td className="table-cell text-gray-600 font-mono text-xs">{sim.date}</td>
                  <td className="table-cell text-gray-800">{sim.subsystem}</td>
                  <td className="table-cell text-xs text-gray-600 truncate max-w-xs" title={sim.resolution}>{sim.resolution}</td>
                  <td className="table-cell text-right">
                    <button className="text-xs font-bold text-aviation-blue hover:text-blue-800 uppercase tracking-wider">Compare</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-3 lg:col-span-1 space-y-6">
          <div className="card">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
              <PieChart className="w-4 h-4 mr-2 text-aviation-navy" />
              <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Similarity Insights</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Common Subsystem</div>
                <div className="text-sm font-bold text-aviation-navy flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-aviation-warning" />
                  Engine Vibration
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Typical Resolution</div>
                <div className="text-sm font-bold text-aviation-navy flex items-center">
                  <Wrench className="w-4 h-4 mr-2 text-aviation-blue" />
                  Engine inspection / bearing replacement
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded p-3">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Average Similarity</div>
                <div className="text-lg font-bold text-aviation-healthy">77%</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-3 lg:col-span-2">
          <div className="card h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
              <ListTree className="w-4 h-4 mr-2 text-aviation-navy" />
              <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Resolution Patterns</h3>
            </div>
            <div className="p-0 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="table-header">Resolution</th>
                    <th className="table-header text-center">Historical Cases</th>
                    <th className="table-header">Frequency</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-800">Engine inspection</td>
                    <td className="table-cell text-center font-bold text-aviation-navy">12</td>
                    <td className="table-cell"><span className="badge-red">High</span></td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-800">Sensor replacement</td>
                    <td className="table-cell text-center font-bold text-aviation-navy">7</td>
                    <td className="table-cell"><span className="badge-blue">Medium</span></td>
                  </tr>
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-800">Mount inspection</td>
                    <td className="table-cell text-center font-bold text-aviation-navy">5</td>
                    <td className="table-cell"><span className="badge-blue">Medium</span></td>
                  </tr>
                  <tr className="hover:bg-gray-50">
                    <td className="table-cell font-medium text-gray-800">Component replacement</td>
                    <td className="table-cell text-center font-bold text-aviation-navy">4</td>
                    <td className="table-cell"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200">Low</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Retired Aircraft Archive</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded p-4 bg-white flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-bold text-lg text-aviation-navy">AV-205</div>
                  <div className="text-xs font-bold text-gray-500 tracking-wider">B787</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Final Health</div>
                  <div className="text-lg font-bold text-aviation-healthy">92%</div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500 uppercase tracking-wider font-semibold">Active:</span>
                  <span className="font-medium text-gray-800">3.8 years</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500 uppercase tracking-wider font-semibold">Retirement:</span>
                  <span className="font-medium text-gray-800">Scheduled lifecycle</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4 bg-white flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-bold text-lg text-aviation-navy">AV-184</div>
                  <div className="text-xs font-bold text-gray-500 tracking-wider">A350</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Final Health</div>
                  <div className="text-lg font-bold text-amber-600">88%</div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500 uppercase tracking-wider font-semibold">Active:</span>
                  <span className="font-medium text-gray-800">5.1 years</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500 uppercase tracking-wider font-semibold">Retirement:</span>
                  <span className="font-medium text-gray-800">Maintenance history</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4 bg-white flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-bold text-lg text-aviation-navy">AV-167</div>
                  <div className="text-xs font-bold text-gray-500 tracking-wider">B777</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Final Health</div>
                  <div className="text-lg font-bold text-aviation-warning">84%</div>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between border-b border-gray-100 pb-1">
                  <span className="text-gray-500 uppercase tracking-wider font-semibold">Active:</span>
                  <span className="font-medium text-gray-800">6.2 years</span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-gray-500 uppercase tracking-wider font-semibold">Retirement:</span>
                  <span className="font-medium text-gray-800">Fleet renewal</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoricalIntelligence;
