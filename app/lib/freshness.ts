/**
 * Single revalidation window for package data.
 *
 * The ISR route segments and every fetch that feeds them import this value so
 * the page cache and the Next Data Cache can never drift apart.
 */
export const PAGE_REVALIDATE_SECONDS = 60;

/**
 * Refresh this many seconds before the Redis soft window ends.
 *
 * A rendered page can be served for up to `PAGE_REVALIDATE_SECONDS`, so data
 * that enters the page at age `soft - window` leaves it at age `soft`, which is
 * exactly the staleness bound the dynamic route allowed before ISR. Without
 * this, the page window would add itself on top of the Redis soft TTL.
 */
export function revalidationSafeWindow(softSeconds: number): number {
  return Math.max(0, softSeconds - PAGE_REVALIDATE_SECONDS);
}

