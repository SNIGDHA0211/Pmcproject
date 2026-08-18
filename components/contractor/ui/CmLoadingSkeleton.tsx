import React from 'react';
import { CardLoadingSkeleton } from '../../WorkspaceStatusPanels';

const CmLoadingSkeleton: React.FC = () => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading contractor dashboard">
    <CardLoadingSkeleton metrics={5} chartHeight={160} />
  </div>
);

export default CmLoadingSkeleton;
