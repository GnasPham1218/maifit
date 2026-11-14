// Data attached to a route with `handle`, read by MainLayout through useMatches()
export interface RouteHandle {
  title: string; // the page heading; the home page shows a greeting instead
  greeting?: boolean;
  ownHeading?: boolean; // the page shows its own h1 (e.g. a food name only known after loading)
}

export function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null && typeof (value as RouteHandle).title === 'string';
}
