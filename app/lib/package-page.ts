import { cache } from "react";
import { getPackage } from "./registry";

/**
 * The shell renders from the lightweight `/latest` manifest. The README and
 * history sections share one full-packument request per render through this
 * request-scoped cache.
 */
export const getPackageExtras = cache(getPackage);
