"use client";

import { motion, useReducedMotion, type Transition } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

function getRouteQuery(pathname: string, searchParams: URLSearchParams) {
  const query = searchParams.get("q")?.trim();
  if (query) return query;
  if (pathname.startsWith("/package/")) {
    return decodeURIComponent(pathname.replace("/package/", ""));
  }
  return "";
}

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const isHome = pathname === "/";
  const routeQuery = useMemo(
    () => getRouteQuery(pathname, searchParams),
    [pathname, searchParams],
  );
  const deferredRouteQuery = useDeferredValue(routeQuery);
  const [query, setQuery] = useState(routeQuery);

  useEffect(() => {
    setQuery(deferredRouteQuery);
  }, [deferredRouteQuery]);

  const shellTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 300, damping: 32, mass: 0.9 };
  const fadeTransition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.16, ease: "easeOut" };

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuery = query.trim();
    startTransition(() => {
      router.push(
        trimmedQuery ? `/search?q=${encodeURIComponent(trimmedQuery)}` : "/",
      );
    });
  }

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <motion.div
        aria-hidden="true"
        className="fixed inset-x-0 top-0 z-20 h-[72px] border-b border-border-subtle bg-[rgb(10_10_10/0.96)]"
        initial={false}
        animate={{ opacity: isHome ? 0 : 1 }}
        transition={fadeTransition}
      />

      <motion.div
        className="fixed left-1/2 z-30 w-[calc(100vw-32px)] -translate-x-1/2 sm:w-[calc(100vw-48px)]"
        initial={false}
        animate={isHome ? { top: "50vh", y: "-50%" } : { top: 0, y: 0 }}
        transition={shellTransition}
      >
        <motion.div
          className="mx-auto w-full"
          initial={false}
          animate={{ maxWidth: 1080 }}
          transition={shellTransition}
        >
          <motion.div
            className={isHome ? "flex flex-col gap-6" : "flex min-h-[72px] flex-wrap items-center gap-4 py-4"}
            layout
            transition={shellTransition}
          >
            <motion.div
              className={
                isHome
                  ? "flex max-w-[560px] flex-col gap-6 md:mr-auto"
                  : "flex min-w-0 flex-1 flex-wrap items-center gap-4"
              }
              layout
              transition={shellTransition}
            >
              <Link
                href="/"
                className={isHome
                  ? "inline-flex w-fit items-center gap-3 text-[32px] leading-none font-semibold tracking-[-0.01em] text-text-primary"
                  : "inline-flex items-center gap-2 whitespace-nowrap text-[14px] font-medium tracking-[-0.01em] text-text-primary transition-colors duration-150 ease-out hover:text-brand"}
              >
                <span className="text-brand">npm</span>
                <span>Search</span>
              </Link>

              <motion.form
                action="/search"
                method="GET"
                onSubmit={handleSubmit}
                className={isHome ? "flex flex-col gap-3 sm:flex-row" : "flex min-w-0 flex-1 flex-wrap gap-2 sm:flex-nowrap"}
                layout
                transition={shellTransition}
              >
                <input
                  type="text"
                  name="q"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                  autoFocus={isHome}
                  placeholder="Search packages, scopes, and libraries"
                  className={`min-h-11 w-full rounded-[var(--radius-md)] border border-border-subtle bg-surface-code px-4 text-text-primary placeholder:text-text-muted transition-colors duration-150 ease-out hover:border-border-strong hover:bg-[#101010] focus:border-brand focus:outline-none focus:ring-0 ${
                    isHome ? "text-[16px]" : "min-w-[180px] text-[14px]"
                  }`}
                />
                <button
                  type="submit"
                  className={`inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] border border-brand bg-brand px-4 font-medium text-white transition-colors duration-150 ease-out hover:border-brand-hover hover:bg-brand-hover ${
                    isHome ? "text-[16px] sm:min-w-28" : "text-[14px]"
                  }`}
                >
                  Search
                </button>
              </motion.form>
            </motion.div>

            {isHome ? (
              <motion.div layout transition={shellTransition}>
                {children}
              </motion.div>
            ) : null}
          </motion.div>
        </motion.div>
      </motion.div>

      {isHome ? <div className="min-h-screen" /> : <div className="pt-[104px]">{children}</div>}
    </div>
  );
}
