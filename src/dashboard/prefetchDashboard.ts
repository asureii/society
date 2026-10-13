let prefetchPromise: Promise<typeof import('./DashboardPage')> | null = null;
let preloadArtCallback: (() => void) | null = null;

export function registerDashboardArtPreloader(cb: (() => void) | null): void {
  preloadArtCallback = cb;
}

export function prefetchDashboardRoute(): Promise<typeof import('./DashboardPage')> {
  if (preloadArtCallback) {
    preloadArtCallback();
  }
  if (!prefetchPromise) {
    prefetchPromise = import('./DashboardPage');
  }
  return prefetchPromise;
}
