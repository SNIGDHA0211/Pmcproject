import React from 'react';
import type { PMCExecutiveTab } from './PMCHeadExecutiveShell';
import { usePmcExecutiveTheme } from '../../utils/pmcExecutiveTheme';

const TAB_LABELS: Record<Exclude<PMCExecutiveTab, 'overview'>, string> = {
  schedule: 'Schedule & Dates',
  money: 'Money',
  people: 'People & Site',
  risk: 'Risk',
  compliance: 'Compliance',
};

interface PMCExecutiveContextBannerProps {
  activeTab: PMCExecutiveTab;
}

export const PMCExecutiveContextBanner: React.FC<PMCExecutiveContextBannerProps> = ({
  activeTab,
}) => {
  const ex = usePmcExecutiveTheme();

  if (activeTab === 'overview') return null;

  const tabLabel = TAB_LABELS[activeTab];

  return (
    <div className={ex.contextBanner}>
      <p className={ex.contextBannerText}>
        PMC Head view · <span className={ex.contextBannerAccent}>{tabLabel}</span> · Same data as Team
        Lead · Executive layout only
      </p>
    </div>
  );
};

interface PMCExecutiveDetailFrameProps {
  active?: boolean;
  children: React.ReactNode;
}

export const PMCExecutiveDetailFrame: React.FC<PMCExecutiveDetailFrameProps> = ({
  active = true,
  children,
}) => {
  const ex = usePmcExecutiveTheme();

  if (!active) {
    return <>{children}</>;
  }

  return <div className={ex.detailFrame}>{children}</div>;
};
