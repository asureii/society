import React, { useState } from 'react';
import { PROFILE } from '../config/profile';
import { useGithubRepos, type GithubRepoItem } from '../hooks/useGithubRepos';
import { formatRelativeTime, isWithinDays } from '../lib/math';
import { ChapterCard } from '../ui/ChapterCard';
import { InkSpotIllustration } from '../ui/InkSpotIllustration';
import { useAppStore } from '../store/useAppStore';

function getLanguageBadge(lang: string): { code: string; glyph: string } {
  const normalized = lang.toLowerCase();
  if (normalized.includes('typescript')) return { code: 'TS', glyph: '◆' };
  if (normalized.includes('javascript')) return { code: 'JS', glyph: '◇' };
  if (normalized.includes('rust')) return { code: 'RS', glyph: '▲' };
  if (normalized.includes('c++') || normalized === 'cpp') return { code: 'C+', glyph: '■' };
  if (normalized === 'c') return { code: 'C', glyph: '□' };
  if (normalized.includes('go')) return { code: 'GO', glyph: '●' };
  if (normalized.includes('python')) return { code: 'PY', glyph: '▼' };
  if (normalized.includes('glsl') || normalized.includes('shader')) return { code: 'GL', glyph: '✦' };
  return { code: lang.slice(0, 2).toUpperCase() || 'SW', glyph: '▪' };
}

const RepoMangaPanel: React.FC<{ repo: GithubRepoItem; index: number }> = ({ repo, index }) => {
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const isActiveRecent = isWithinDays(repo.pushed_at, 7);
  const badge = getLanguageBadge(repo.language);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reducedMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -ny * 6, ry: nx * 6 });
  };

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 });
  };

  return (
    <article
      data-content-box={`work-repo-${index}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: 'transform 160ms ease-out',
      }}
      className="group relative bg-paper-pure border-3 border-ink p-5 shadow-[5px_5px_0px_var(--ink)] hover:border-red flex flex-col justify-between overflow-hidden"
    >
      {/* Black hatching sweep overlay on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 pattern-hatch opacity-0 group-hover:opacity-15 transition-opacity duration-300"
      />
      {/* Red accent top bar on hover */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 right-0 h-1.5 bg-red scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300"
      />

      <div className="relative z-10">
        {/* Top metadata row (all text >= 12px per C6) */}
        <div className="flex items-center justify-between gap-2 border-b-2 border-ink pb-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-ink text-paper-pure px-1.5 py-0.5">
              03.{index + 1}
            </span>
            <span className="inline-flex items-center gap-1 border border-ink bg-paper px-1.5 py-0.5 font-mono text-xs font-bold text-ink">
              <span aria-hidden="true">{badge.glyph}</span>
              <span>{badge.code}</span>
              <span className="sr-only">({repo.language})</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isActiveRecent && (
              <span className="bg-red text-paper-pure font-mono text-xs font-bold tracking-wider px-1.5 py-0.5 uppercase">
                ACTIVE
              </span>
            )}
            <span className="font-mono text-xs font-bold text-ink border border-ink px-1.5 py-0.5">
              ★ {repo.stargazers_count}
            </span>
          </div>
        </div>

        {/* Repo Title */}
        <h3 className="font-serif font-bold text-xl text-ink group-hover:text-red-deep transition-colors break-words">
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="focus:outline-none after:absolute after:inset-0"
          >
            {repo.name}
          </a>
        </h3>

        {/* Description */}
        <p className="font-mono text-xs text-ink leading-relaxed mt-2 mb-4">
          {repo.description}
        </p>
      </div>

      <div className="relative z-10 pt-3 border-t border-ink/15 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 3).map((topic) => (
            <span
              key={topic}
              className="font-mono text-xs uppercase tracking-wider border border-ink px-1.5 py-0.5 bg-paper text-ink"
            >
              #{topic}
            </span>
          ))}
        </div>

        <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
          {formatRelativeTime(repo.pushed_at)}
        </span>
      </div>
    </article>
  );
};

export const Work: React.FC = () => {
  const { repos, activityByDay, loading, errorSignal, retry } = useGithubRepos();

  return (
    <section
      id="chapter-work"
      aria-labelledby="heading-work"
      className="relative min-h-screen w-full manga-page-wipe page-beat-safe pb-24 pointer-events-auto flex flex-col justify-center"
    >
      <div className="w-full max-w-6xl mx-auto space-y-8">
        <div
          data-content-box="work-header"
          className="flex flex-col md:flex-row md:items-end justify-between gap-4"
        >
          <div id="heading-work">
            <ChapterCard
              number="03"
              title="THE WORK"
              jpSubtitle="参 // 開発記録"
              alertText="GITHUB TELEMETRY"
            />
          </div>
          <div className="flex items-center gap-3 border-2 border-ink bg-paper-pure p-2">
            <InkSpotIllustration motif="horizon-spire" seed={303} className="w-24 h-14" />
            <span className="font-mono text-xs font-bold uppercase text-ink max-w-[180px]">
              PUBLIC REPOSITORY TRANSMISSIONS.
            </span>
          </div>
        </div>

        {/* Stylized Alert Banner on Rate Limit / Placeholder Config */}
        {errorSignal && (
          <div
            role="alert"
            data-content-box="work-alert"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-red text-paper-pure border-3 border-ink p-3.5 shadow-[4px_4px_0px_var(--ink)]"
          >
            <div className="flex items-center gap-2.5">
              <span className="bg-ink text-paper-pure font-mono text-xs font-bold px-2 py-0.5 uppercase">
                WARNING
              </span>
              <span className="font-mono text-xs font-bold tracking-wider uppercase">
                {errorSignal}
              </span>
            </div>
            <button
              type="button"
              onClick={retry}
              className="bg-paper-pure text-ink font-display text-xs tracking-widest uppercase px-3 py-1 border-2 border-ink hover:bg-ink hover:text-paper-pure transition-colors cursor-pointer self-start sm:self-auto"
            >
              SIGNAL LOST: RETRY
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-paper-pure border-3 border-ink p-5 h-56 flex flex-col justify-between shadow-[5px_5px_0px_var(--ink)]"
              >
                <div className="h-4 w-1/2 border border-ink pattern-hatch" />
                <div className="space-y-2">
                  <div className="h-6 w-3/4 border border-ink pattern-hatch-dense" />
                  <div className="h-3 w-full border border-ink pattern-hatch" />
                  <div className="h-3 w-5/6 border border-ink pattern-hatch" />
                </div>
                <div className="h-4 w-1/3 border border-ink pattern-hatch" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repos.map((repo, idx) => (
              <RepoMangaPanel key={repo.name} repo={repo} index={idx} />
            ))}
          </div>
        )}

        {/* Hatched-Density Contribution Heatmap Grid */}
        {PROFILE.enableGithubHeatmap && (
          <div
            data-content-box="work-heatmap"
            className="bg-paper-pure border-3 border-ink p-4 sm:p-5 shadow-[5px_5px_0px_var(--ink)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/15 pb-2 mb-3">
              <span className="font-mono text-xs font-bold tracking-wider uppercase">
                PUBLIC EVENT DENSITY // LAST 28 DAYS
              </span>
              <span className="font-mono text-xs font-bold text-red uppercase">
                CURRENT DAY = RED SIGNAL
              </span>
            </div>
            <div className="grid grid-cols-14 sm:grid-cols-28 gap-1.5">
              {activityByDay.map((count, i) => {
                const isCurrentDay = i === activityByDay.length - 1;
                let cellClass = 'bg-paper';
                if (isCurrentDay) {
                  cellClass = 'bg-red';
                } else if (count >= 4) {
                  cellClass = 'bg-ink';
                } else if (count === 3) {
                  cellClass = 'pattern-crosshatch bg-paper';
                } else if (count === 2) {
                  cellClass = 'pattern-hatch-dense bg-paper';
                } else if (count === 1) {
                  cellClass = 'pattern-hatch bg-paper';
                }
                return (
                  <div
                    key={i}
                    title={`Day ${i + 1}: ${count} public events`}
                    className={`h-5 border border-ink ${cellClass}`}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
