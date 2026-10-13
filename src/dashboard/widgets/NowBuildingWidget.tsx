import React from 'react';
import { PROFILE } from '../../config/profile';

export const NowBuildingWidget: React.FC = () => {
  const items = PROFILE.nowBuilding || [];
  return (
    <div className="flex flex-col gap-1 text-[var(--ink)]" data-testid="widget-now-building">
      {items.slice(0, 2).map((item, idx) => (
        <div key={idx} className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.06em] truncate">
          <span className="inline-block w-1.5 h-1.5 bg-[var(--ink)] shrink-0" />
          <span className="truncate">{item}</span>
        </div>
      ))}
    </div>
  );
};
