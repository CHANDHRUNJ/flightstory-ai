import { analyticsEngine } from '../services/analyticsEngine';
import { ShieldAlert, TrendingUp, Activity, AlertCircle, CheckCircle, BarChart3, Search } from 'lucide-react';

const FleetRisk = () => {
  const riskScores = analyticsEngine.calculateRisk();

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-bold text-aviation-navy tracking-tight flex items-center">
          <ShieldAlert className="w-6 h-6 mr-3 text-aviation-blue" />
          Fleet Risk
        </h2>
        <p className="text-gray-500 mt-1">Fleet-level risk indicators and emerging patterns.</p>
      </header>

      <div className="grid grid-cols-4 gap-4">
        {riskScores.map(score => {
          const isHighRisk = score.riskScore >= 90;
          const isModerate = score.riskScore >= 85 && score.riskScore < 90;
          return (
            <div key={score.model} className={`card p-4 border-l-4 ${isHighRisk ? 'border-l-aviation-warning' : isModerate ? 'border-l-amber-500' : 'border-l-aviation-healthy'}`}>
              <div className="flex justify-between items-start mb-2">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">{score.model}</div>
                <div className={`text-xs px-2 py-0.5 rounded font-bold ${
                  isHighRisk ? 'bg-red-50 text-red-700 border border-red-200' : 
                  isModerate ? 'bg-amber-50 text-amber-700 border border-amber-200' : 
                  'bg-green-50 text-green-700 border border-green-200'
                }`}>
                  {isHighRisk ? 'ELEVATED' : isModerate ? 'MODERATE' : 'LOW RISK'}
                </div>
              </div>
              <div className="flex items-end space-x-3 mb-3">
                <div className={`text-3xl font-bold ${isHighRisk ? 'text-aviation-warning' : isModerate ? 'text-amber-600' : 'text-aviation-healthy'}`}>
                  {score.riskScore}%
                </div>
                <div className="text-xs text-gray-400 mb-1 font-medium tracking-wide">RISK SCORE</div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-500 font-medium">
                <span className="flex items-center"><Activity className="w-3 h-3 mr-1"/>{score.model === 'A350' ? 12 : score.model === 'B777' ? 8 : score.model === 'A380' ? 5 : 15} monitored</span>
                <span className="flex items-center"><AlertCircle className="w-3 h-3 mr-1"/>{isHighRisk ? 2 : isModerate ? 1 : 0} patterns</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Aircraft Monitored</div>
            <div className="text-xl font-bold text-aviation-navy">40</div>
          </div>
          <Activity className="w-6 h-6 text-gray-300" />
        </div>
        <div className="bg-white border border-gray-200 rounded p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Patterns</div>
            <div className="text-xl font-bold text-aviation-warning">3</div>
          </div>
          <TrendingUp className="w-6 h-6 text-aviation-warning/30" />
        </div>
        <div className="bg-white border border-gray-200 rounded p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Highest Risk Model</div>
            <div className="text-xl font-bold text-aviation-navy">B787</div>
          </div>
          <AlertCircle className="w-6 h-6 text-gray-300" />
        </div>
        <div className="bg-white border border-gray-200 rounded p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Fleet Avg Health</div>
            <div className="text-xl font-bold text-aviation-healthy">89.5%</div>
          </div>
          <CheckCircle className="w-6 h-6 text-aviation-healthy/30" />
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <TrendingUp className="w-4 h-4 mr-2 text-aviation-warning" />
          <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Emerging Fleet Patterns</h3>
        </div>
        <div className="p-4 grid grid-cols-3 gap-4">
          
          <div className="border border-gray-200 rounded bg-white overflow-hidden flex flex-col">
            <div className="bg-red-50 px-3 py-2 border-b border-red-100 flex justify-between items-center">
              <span className="text-[10px] font-bold text-red-700 uppercase tracking-widest">PATTERN 01</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-800">ELEVATED</span>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="font-bold text-sm text-aviation-navy mb-1">Engine vibration trend</div>
                <div className="text-xs text-gray-600 mb-3">8 aircraft affected</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500 uppercase">Models:</span>
                    <span className="font-medium text-gray-700">A350, B777</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500 uppercase">Time window:</span>
                    <span className="font-medium text-gray-700">Last 30 days</span>
                  </div>
                </div>
              </div>
              <button className="mt-4 w-full py-1.5 text-xs font-bold text-aviation-blue bg-blue-50 hover:bg-blue-100 rounded transition-colors flex items-center justify-center">
                <Search className="w-3 h-3 mr-1.5" />
                Inspect
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded bg-white overflow-hidden flex flex-col">
            <div className="bg-amber-50 px-3 py-2 border-b border-amber-100 flex justify-between items-center">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">PATTERN 02</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">MODERATE</span>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="font-bold text-sm text-aviation-navy mb-1">Repeated temp deviation</div>
                <div className="text-xs text-gray-600 mb-3">5 aircraft affected</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500 uppercase">Models:</span>
                    <span className="font-medium text-gray-700">A350, B787</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500 uppercase">Time window:</span>
                    <span className="font-medium text-gray-700">Last 14 days</span>
                  </div>
                </div>
              </div>
              <button className="mt-4 w-full py-1.5 text-xs font-bold text-aviation-blue bg-blue-50 hover:bg-blue-100 rounded transition-colors flex items-center justify-center">
                <Search className="w-3 h-3 mr-1.5" />
                Inspect
              </button>
            </div>
          </div>

          <div className="border border-gray-200 rounded bg-white overflow-hidden flex flex-col">
            <div className="bg-blue-50 px-3 py-2 border-b border-blue-100 flex justify-between items-center">
              <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">PATTERN 03</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">WATCH</span>
            </div>
            <div className="p-3 flex-1 flex flex-col justify-between">
              <div>
                <div className="font-bold text-sm text-aviation-navy mb-1">Avionics warning recurrence</div>
                <div className="text-xs text-gray-600 mb-3">3 aircraft affected</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500 uppercase">Models:</span>
                    <span className="font-medium text-gray-700">B777</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-gray-500 uppercase">Time window:</span>
                    <span className="font-medium text-gray-700">Last 7 days</span>
                  </div>
                </div>
              </div>
              <button className="mt-4 w-full py-1.5 text-xs font-bold text-aviation-blue bg-blue-50 hover:bg-blue-100 rounded transition-colors flex items-center justify-center">
                <Search className="w-3 h-3 mr-1.5" />
                Inspect
              </button>
            </div>
          </div>

        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <BarChart3 className="w-4 h-4 mr-2 text-aviation-navy" />
          <h3 className="font-semibold text-aviation-navy text-sm uppercase tracking-wider">Fleet Risk Signals</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="table-header">Aircraft</th>
                <th className="table-header">Model</th>
                <th className="table-header">Risk</th>
                <th className="table-header">Primary Signal</th>
                <th className="table-header">Trend</th>
                <th className="table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="hover:bg-gray-50 border-b border-gray-100">
                <td className="table-cell font-bold text-aviation-navy">AV-101</td>
                <td className="table-cell text-gray-600">A350</td>
                <td className="table-cell text-aviation-warning font-bold">91%</td>
                <td className="table-cell text-gray-800">Engine vibration</td>
                <td className="table-cell"><TrendingUp className="w-4 h-4 text-aviation-warning" /></td>
                <td className="table-cell"><span className="badge-red">Monitor</span></td>
              </tr>
              <tr className="hover:bg-gray-50 border-b border-gray-100">
                <td className="table-cell font-bold text-aviation-navy">AV-112</td>
                <td className="table-cell text-gray-600">B777</td>
                <td className="table-cell text-amber-600 font-bold">84%</td>
                <td className="table-cell text-gray-800">Temperature</td>
                <td className="table-cell"><TrendingUp className="w-4 h-4 text-gray-400 rotate-90" /></td>
                <td className="table-cell"><span className="badge-blue">Watch</span></td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="table-cell font-bold text-aviation-navy">AV-089</td>
                <td className="table-cell text-gray-600">A380</td>
                <td className="table-cell text-amber-600 font-bold">88%</td>
                <td className="table-cell text-gray-800">RPM deviation</td>
                <td className="table-cell"><TrendingUp className="w-4 h-4 text-aviation-warning" /></td>
                <td className="table-cell"><span className="px-2 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-700 border border-gray-200">Review</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FleetRisk;
