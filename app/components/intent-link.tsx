"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";

type LinkProps = ComponentProps<typeof Link>;

function toHrefString(href: LinkProps["href"]): string | null {
  if (typeof href === "string") return href;
  if (!href || typeof href !== "object") return null;

  const query = typeof href.query === "string" ? href.query : undefined;

  return `${href.pathname ?? ""}${query ? `?${query}` : ""}${href.hash ?? ""}`;
}

/**
 * Prefetches on intent (hover, focus, touch) instead of on viewport visibility.
 *
 * Viewport prefetch turns every visible dependency/version link into an `_rsc`
 * request and a function invocation; intent keeps navigation instant for real
 * users without the background traffic.
 */
export function IntentLink({
  href,
  onMouseEnter,
  onFocus,
  onTouchStart,
  ...props
}: LinkProps) {
  const router = useRouter();
  const target = toHrefString(href);

  const prefetchTarget = useCallback(() => {
    if (!target) return;
    router.prefetch(target);
  }, [router, target]);

  const handleMouseEnter = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      prefetchTarget();
      onMouseEnter?.(event);
    },
    [onMouseEnter, prefetchTarget],
  );

  const handleFocus = useCallback(
    (event: FocusEvent<HTMLAnchorElement>) => {
      prefetchTarget();
      onFocus?.(event);
    },
    [onFocus, prefetchTarget],
  );

  const handleTouchStart = useCallback(
    (event: TouchEvent<HTMLAnchorElement>) => {
      prefetchTarget();
      onTouchStart?.(event);
    },
    [onTouchStart, prefetchTarget],
  );

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onTouchStart={handleTouchStart}
    />
  );
}
