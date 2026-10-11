import { useCallback, useEffect, useState } from 'react';
import { PROFILE, type RepoFallback } from '../config/profile';
import { getSessionCache, setSessionCache } from '../lib/cache';

export interface GithubRepoItem {
  name: string;
  description: string;
  language: string;
  stargazers_count: number;
  pushed_at: string;
  topics: string[];
  html_url: string;
  isFeatured: boolean;
  lastEventAction?: string;
}

interface GithubApiRawRepo {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  topics?: string[];
  html_url: string;
  fork: boolean;
}

interface GithubApiRawEvent {
  type: string;
  repo?: { name: string };
  created_at?: string;
}

interface CachedGithubPayload {
  repos: GithubRepoItem[];
  activityByDay: number[];
}

const CACHE_KEY = 'pilot_file_github_v1';
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function mapFallbackRepos(fallbacks: RepoFallback[]): GithubRepoItem[] {
  return fallbacks.slice(0, 6).map((r) => ({
    name: r.name,
    description:
      r.description || 'NO TELEMETRY DESCRIPTION PROVIDED // ARCHIVE RECORD ONLY.',
    language: r.language || 'SYS',
    stargazers_count: r.stargazers_count,
    pushed_at: r.pushed_at,
    topics: r.topics.length > 0 ? r.topics : ['classified'],
    html_url: r.html_url,
    isFeatured: Boolean(r.isFeatured),
  }));
}

export function useGithubRepos() {
  const [repos, setRepos] = useState<GithubRepoItem[]>([]);
  const [activityByDay, setActivityByDay] = useState<number[]>(() =>
    Array.from({ length: 28 }, (_, i) => ((i * 7 + 3) % 5)),
  );
  const [loading, setLoading] = useState<boolean>(true);
  const [errorSignal, setErrorSignal] = useState<string | null>(null);

  const fetchGithubData = useCallback(async (bypassCache = false) => {
    setLoading(true);
    setErrorSignal(null);

    const username = PROFILE.githubUsername.trim();
    if (!username || username.startsWith('TODO')) {
      setRepos(mapFallbackRepos(PROFILE.fallbackRepos));
      setErrorSignal('CONFIG NOTICE // SET githubUsername IN src/config/profile.ts FOR LIVE API');
      setLoading(false);
      return;
    }

    if (!bypassCache) {
      const cached = getSessionCache<CachedGithubPayload>(CACHE_KEY, CACHE_TTL_MS);
      if (cached) {
        setRepos(cached.repos);
        setActivityByDay(cached.activityByDay);
        setLoading(false);
        return;
      }
    }

    try {
      const [reposRes, eventsRes] = await Promise.all([
        fetch(
          `https://api.github.com/users/${encodeURIComponent(
            username,
          )}/repos?sort=pushed&per_page=30`,
        ),
        fetch(
          `https://api.github.com/users/${encodeURIComponent(
            username,
          )}/events/public?per_page=30`,
        ),
      ]);

      if (!reposRes.ok) {
        throw new Error(`HTTP ${reposRes.status}: RATE LIMIT OR UNREACHABLE`);
      }

      const rawRepos = (await reposRes.json()) as GithubApiRawRepo[];
      const rawEvents: GithubApiRawEvent[] = eventsRes.ok
        ? ((await eventsRes.json()) as GithubApiRawEvent[])
        : [];

      // Map latest public event timestamp/type per repo
      const latestEventByRepo = new Map<string, { type: string; createdAt: string }>();
      const dayBuckets = new Array<number>(28).fill(0);
      const now = Date.now();

      for (const ev of rawEvents) {
        const shortName = ev.repo?.name?.split('/')[1];
        if (shortName && ev.created_at && !latestEventByRepo.has(shortName)) {
          latestEventByRepo.set(shortName, {
            type: ev.type,
            createdAt: ev.created_at,
          });
        }
        if (ev.created_at) {
          const daysAgo = Math.floor((now - new Date(ev.created_at).getTime()) / 86400000);
          if (daysAgo >= 0 && daysAgo < 28) {
            dayBuckets[27 - daysAgo] += 1;
          }
        }
      }

      const filtered = rawRepos.filter((r) => (PROFILE.excludeForks ? !r.fork : true));
      const featuredSet = new Set(PROFILE.featuredRepos.map((n) => n.toLowerCase()));

      const sorted = [...filtered].sort((a, b) => {
        const aFeat = featuredSet.has(a.name.toLowerCase()) ? 1 : 0;
        const bFeat = featuredSet.has(b.name.toLowerCase()) ? 1 : 0;
        if (aFeat !== bFeat) return bFeat - aFeat;
        return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
      });

      const mapped: GithubRepoItem[] = sorted.slice(0, 6).map((r) => {
        const ev = latestEventByRepo.get(r.name);
        return {
          name: r.name,
          description:
            r.description?.trim() ||
            'NO DESCRIPTION IN REPOSITORY MANIFEST // DIRECT SOURCE INSPECTION AVAILABLE.',
          language: r.language || 'CODE',
          stargazers_count: r.stargazers_count ?? 0,
          pushed_at: ev?.createdAt || r.pushed_at,
          topics: r.topics && r.topics.length > 0 ? r.topics.slice(0, 4) : ['repository'],
          html_url: r.html_url,
          isFeatured: featuredSet.has(r.name.toLowerCase()),
          lastEventAction: ev?.type,
        };
      });

      const finalRepos = mapped.length > 0 ? mapped : mapFallbackRepos(PROFILE.fallbackRepos);
      setRepos(finalRepos);
      setActivityByDay(dayBuckets);
      setSessionCache<CachedGithubPayload>(CACHE_KEY, {
        repos: finalRepos,
        activityByDay: dayBuckets,
      });
    } catch {
      setErrorSignal('SIGNAL LOST: GITHUB API RATE LIMIT OR OFFLINE — SHOWING ARCHIVE FALLBACK');
      setRepos(mapFallbackRepos(PROFILE.fallbackRepos));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGithubData(false);
  }, [fetchGithubData]);

  return {
    repos,
    activityByDay,
    loading,
    errorSignal,
    retry: () => void fetchGithubData(true),
  };
}
