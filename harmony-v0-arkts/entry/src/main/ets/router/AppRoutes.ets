export const AppRoutes = {
  HOME: 'home',
  JOBS: 'jobs',
  CIRCLE: 'circle',
  PROFILE: 'profile',
  AI: 'ai',
};

export function isTabRoute(route: string): boolean {
  return route === AppRoutes.HOME
    || route === AppRoutes.JOBS
    || route === AppRoutes.CIRCLE
    || route === AppRoutes.PROFILE;
}
