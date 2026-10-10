import React from 'react';
import { FmsEventExplorer } from './FmsEventExplorer';

interface TemporalEvidenceGalaxyProps {
  incidentId: string;
  activeReplayEventId?: string | null;
  onSelectEvent?: (eventId: string) => void;
  onOpenInspector: (eventId: string) => void;
}

export const TemporalEvidenceGalaxy: React.FC<TemporalEvidenceGalaxyProps> = ({
  incidentId,
  onOpenInspector
}) => {
  return (
    <FmsEventExplorer
      incidentId={incidentId}
      onOpenInspector={onOpenInspector}
    />
  );
};

export default TemporalEvidenceGalaxy;
