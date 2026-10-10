import { useState, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { 
  Plane, 
  AlertTriangle, 
  Network, 
  Database,
  Activity
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import type { HealthData } from '../../services/apiService';

const Sidebar = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await apiService.getHealth();
        setHealth(data);
        setIsOnline(true);
      } catch {
        setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { 
      name: 'Flight Overview', 
      level: 'Level 1',
      path: '/overview', 
      icon: Plane 
    },
    { 
      name: 'Faults & Events', 
      level: 'Level 2',
      path: '/faults', 
      icon: AlertTriangle 
    },
    { 
      name: 'Operation Context', 
      level: 'Level 3',
      path: '/context', 
      icon: Network 
    },
    { 
      name: 'Import Logs', 
      level: 'Ingestion',
      path: '/import', 
      icon: Database 
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen fixed z-50 shadow-md select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-sky-700 text-white font-bold shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white font-sans tracking-wide">
              FlightStory AI
            </h1>
            <span className="text-[11px] text-slate-400 font-sans block">
              FMS Log Investigation
            </span>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="flex-1 mt-4 px-3 overflow-y-auto space-y-1">
        <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
          Investigation Levels
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs transition-all ${
                  isActive 
                    ? 'bg-sky-700 text-white font-semibold shadow-xs' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4 text-slate-300" />
                <span className="font-medium font-sans">{item.name}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {item.level}
              </span>
            </NavLink>
          );
        })}
      </nav>

      {/* System Status Box */}
      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
          <span className="text-slate-400">Backend API:</span>
          <span className={`flex items-center gap-1.5 font-bold ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </span>
        </div>
        {health && isOnline && (
          <div className="text-[11px] text-slate-400 font-mono space-y-0.5">
            <div>Verified Records: {health.loaded_events_count.toLocaleString()}</div>
            <div>Candidate Incidents: {health.loaded_incidents_count}</div>
          </div>
        )}
      </div>
    </aside>
  );
};

const MainLayout = () => {
  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-6 lg:p-8 overflow-y-auto min-h-screen bg-slate-50">
        <Outlet />
        <footer className="mt-12 text-center text-xs font-sans text-slate-500 border-t border-slate-200 pt-4">
          FlightStory AI — Multi-System Log Investigation Platform • Deterministic Analysis Across 3 Cooperating FMS Nodes
        </footer>
      </main>
    </div>
  );
};

export default MainLayout;
