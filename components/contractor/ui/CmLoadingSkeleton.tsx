import React from 'react';
import { useCmTheme } from '../enterpriseTheme';

const CmLoadingSkeleton: React.FC = () => {
  const theme = useCmTheme();

  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading contractor dashboard">
      <div className={`h-28 ${theme.skeleton}`} />
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-11 min-w-[100px] flex-1 ${theme.skeleton}`} />
        ))}
      </div>
      <div className={`h-40 ${theme.skeleton}`} />
    </div>
  );
};

export default CmLoadingSkeleton;
