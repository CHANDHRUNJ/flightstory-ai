import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import FlightOverviewPage from './pages/FlightOverviewPage';
import FaultsAndEventsPage from './pages/FaultsAndEventsPage';
import OperationContextPage from './pages/OperationContextPage';
import LogImporterPage from './pages/LogImporterPage';
import VisualizationPage from './pages/VisualizationPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<FlightOverviewPage />} />
          <Route path="visualization" element={<VisualizationPage />} />
          <Route path="faults" element={<FaultsAndEventsPage />} />
          <Route path="context" element={<OperationContextPage />} />
          <Route path="context/:id" element={<OperationContextPage />} />
          <Route path="import" element={<LogImporterPage />} />

          {/* Backward compatibility redirects */}
          <Route path="events" element={<Navigate to="/faults" replace />} />
          <Route path="incidents" element={<Navigate to="/faults" replace />} />
          <Route path="incident/:id" element={<Navigate to="/context" replace />} />
          <Route path="fleet" element={<Navigate to="/overview" replace />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
