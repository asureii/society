import React from 'react';
import { useGithubRepos } from '../../hooks/useGithubRepos';

export const GithubActivityWidget: React.FC = () => {
  const { repos, activityByDay, loading } = useGithubRepos();
  const latest = repos[0];
  const recentSlices = activityByDay.slice(-14);

  return (
    <div className="flex flex-col gap-1.5 text-[var(--ink)]" data-testid="widget-github-activity">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-xs tracking-[0.06em] uppercase truncate">
          {loading ? 'SCANNING REPOS...' : latest?.name || 'NO REPOS'}
        </span>
        {latest && (
          <span className="font-mono text-[8px] tracking-[0.12em] uppercase px-1 border border-[var(--ink)] bg-[var(--paper)]">
            {latest.language}
          </span>
        )}
      </div>
      <div className="grid grid-cols-14 gap-0.5 h-3 items-end border border-[var(--ink)] p-0.5 bg-[var(--paper)]">
        {recentSlices.map((val, i) => (
          <span
            key={i}
            className={val > 0 ? 'bg-[var(--ink)] w-full' : 'bg-[var(--paper-pure)] w-full'}
            style={{ height: `${Math.max(20, Math.min(100, val * 25))}%` }}
          />
        ))}
      </div>
    </div>
  );
};
