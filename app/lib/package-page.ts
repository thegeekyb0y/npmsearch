import { cache } from "react";
import { getPackage } from "./registry";

/**
 * The shell renders from the lightweight `/latest` manifest. The README and
 * history sections share one full-packument request per render through this
 * request-scoped cache.
 *
 * `fresh` is used because this only runs during ISR regeneration: a soft-stale
 * entry is refreshed before rendering (with a cached fallback on failure) so
 * the page is never staler than the page window.
 */
export const getPackageExtras = cache(
  (name: string) => getPackage(name, { fresh: true }),
);
