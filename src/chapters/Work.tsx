import React, { useEffect, useRef } from 'react';
import { PROFILE } from '../config/profile';
import { useGithubRepos, type GithubRepoItem } from '../hooks/useGithubRepos';
import { gsap } from '../lib/gsap';
import { formatRelativeTime, isWithinDays } from '../lib/math';
import { useAppStore } from '../store/useAppStore';
import {
  MangaPanel,
  MangaPinnedChapter,
} from '../ui/MangaPageLayout';

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

const RepoPanelItem: React.FC<{
  repo: GithubRepoItem;
  index: number;
  tiltDeg: number;
  bleedEdge?: 'left' | 'right' | 'none';
  innerRef: (el: HTMLDivElement | null) => void;
}> = ({ repo, index, tiltDeg, bleedEdge = 'none', innerRef }) => {
  const setHoveredRepoIndex = useAppStore((s) => s.setHoveredRepoIndex);
  const isActiveRecent = isWithinDays(repo.pushed_at, 7);
  const badge = getLanguageBadge(repo.language);

  return (
    <MangaPanel
      panelCode={`03.${index + 1} // ${badge.code}`}
      panelTitle={`★ ${repo.stargazers_count} • ${formatRelativeTime(repo.pushed_at)}`}
      tiltDeg={tiltDeg}
      bleedEdge={bleedEdge}
      redAccentCorner={isActiveRecent}
      onMouseEnter={() => setHoveredRepoIndex(index)}
      onMouseLeave={() => setHoveredRepoIndex(null)}
      className="group hover:bg-paper transition-colors py-1.5 sm:py-2"
    >
      <div ref={innerRef}>
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-serif font-bold text-xs sm:text-sm text-ink group-hover:text-red-deep transition-colors truncate">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                className="focus:outline-none after:absolute after:inset-0"
              >
                {repo.name}
              </a>
            </h3>
            {isActiveRecent && (
              <span className="bg-red text-paper-pure font-mono text-[9px] font-bold px-1.5 py-0.2 uppercase shrink-0">
                ACTIVE
              </span>
            )}
          </div>
          <p className="font-sans text-[11px] text-ink leading-snug mt-0.5 line-clamp-1">
            {repo.description}
          </p>
        </div>

        <div className="mt-1 pt-1 border-t border-ink/15 flex flex-wrap items-center justify-between gap-1">
          <div className="flex flex-wrap gap-1">
            {repo.topics.slice(0, 2).map((topic) => (
              <span
                key={topic}
                className="font-mono text-[9px] uppercase border border-ink px-1 bg-paper text-ink"
              >
                #{topic}
              </span>
            ))}
          </div>
          <span className="font-mono text-[9px] font-bold uppercase text-red opacity-0 group-hover:opacity-100 transition-opacity">
            SECTOR 0{index + 1} →
          </span>
        </div>
      </div>
    </MangaPanel>
  );
};

export const Work: React.FC = () => {
  const { repos, activityByDay, errorSignal, retry } = useGithubRepos();
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasLoadedRef = useRef<boolean>(false);
  const activeChapter = useAppStore((s) => s.activeChapter);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  useEffect(() => {
    if (activeChapter !== 'work' || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const elements = rowRefs.current.filter((el): el is HTMLDivElement => el !== null);
    if (elements.length === 0) return;

    if (reducedMotion) {
      elements.forEach((el) => {
        el.style.transform = 'translate3d(0, 0, 0)';
        el.style.clipPath = 'none';
      });
      return;
    }

    gsap.fromTo(
      elements,
      { y: 12 },
      {
        y: 0,
        duration: 0.38,
        stagger: 0.05,
        ease: 'power3.out',
        clearProps: 'clipPath',
      },
    );
  }, [activeChapter, reducedMotion, repos.length]);

  const leftRepos = repos.slice(0, 3);
  const rightRepos = repos.slice(3, 6);
  const tilts = [-1.5, 1.3, -1.2, 1.4, -1.3, 1.1];

  return (
    <MangaPinnedChapter
      id="work"
      sceneId="s3-archive-city"
      chapterNumber="03"
      title="THE ARCHIVE CITY"
      jpSubtitle="参 // 記録都市"
      classification="GITHUB TELEMETRY"
      summary="INDEXED PRODUCTION ARTIFACTS AND FIELD TELEMETRY FROM GITHUB ARCHIVES."
      alignment="full"
    >
      {errorSignal && (
        <div
          role="alert"
          data-avoid-hud
          className="mb-2 flex flex-wrap items-center justify-between gap-2 bg-red text-paper-pure border-2 border-ink px-3 py-1 font-mono text-xs font-bold uppercase pointer-events-auto"
        >
          <span>WARNING // {errorSignal}</span>
          <button
            type="button"
            onClick={retry}
            className="bg-paper-pure text-ink px-2 py-0.5 border border-ink cursor-pointer"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Pinned 2-Wing Spread: Left Repos (5 cols) + Center Void for Focal Rooftops & Canal (2 cols) + Right Repos (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-3 items-stretch max-h-[45vh] lg:max-h-none overflow-hidden">
        {/* Left Column (5 cols): Repos 0, 1, 2 */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          {leftRepos.map((repo, idx) => (
            <RepoPanelItem
              key={repo.name}
              repo={repo}
              index={idx}
              tiltDeg={tilts[idx]}
              bleedEdge={idx === 0 ? 'left' : 'none'}
              innerRef={(el) => {
                rowRefs.current[idx] = el;
              }}
            />
          ))}
        </div>

        {/* Center Void (2 cols): Completely OPEN to S3 Archive City rooftops, canal & red dome */}
        <div
          className="hidden lg:flex lg:col-span-2 pointer-events-none items-center justify-center"
          aria-hidden="true"
        />

        {/* Right Column (5 cols): Repos 3, 4, 5 + commit density */}
        <div className="lg:col-span-5 flex flex-col gap-2">
          {rightRepos.map((repo, idx) => (
            <RepoPanelItem
              key={repo.name}
              repo={repo}
              index={idx + 3}
              tiltDeg={tilts[idx + 3]}
              bleedEdge={idx === 2 ? 'right' : 'none'}
              innerRef={(el) => {
                rowRefs.current[idx + 3] = el;
              }}
            />
          ))}

          {PROFILE.enableGithubHeatmap && (
            <MangaPanel
              panelCode="03.LOG // 28D"
              panelTitle="COMMIT DENSITY"
              tiltDeg={-0.6}
              className="hidden sm:flex"
            >
              <div className="grid grid-cols-14 gap-1">
                {activityByDay.slice(0, 14).map((count, i) => {
                  const isLast = i === 13;
                  const cellClass = isLast
                    ? 'bg-red'
                    : count >= 3
                      ? 'bg-ink'
                      : count >= 1
                        ? 'pattern-hatch-dense bg-paper'
                        : 'bg-paper';
                  return (
                    <div
                      key={i}
                      title={`Day ${i + 1}: ${count} events`}
                      className={`h-3 border border-ink ${cellClass}`}
                    />
                  );
                })}
              </div>
            </MangaPanel>
          )}
        </div>
      </div>
    </MangaPinnedChapter>
  );
};
