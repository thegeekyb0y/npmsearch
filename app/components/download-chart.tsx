"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { DownloadPoint } from "@/app/lib/types";

const WIDTH = 320;
const HEIGHT = 88;
const TOP = 6;
const BOTTOM = 8;

type Coord = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatDay(day?: string) {
  if (!day) return "Unknown date";
  const date = new Date(`${day}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function buildSmoothPath(coords: Coord[], innerHeight: number) {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  let path = `M ${coords[0].x} ${coords[0].y}`;

  for (let index = 0; index < coords.length - 1; index += 1) {
    const p0 = coords[index - 1] ?? coords[index];
    const p1 = coords[index];
    const p2 = coords[index + 1];
    const p3 = coords[index + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = clamp(p1.y + (p2.y - p0.y) / 6, TOP, TOP + innerHeight);
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = clamp(p2.y - (p3.y - p1.y) / 6, TOP, TOP + innerHeight);

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

export function DownloadChart({
  points,
  weekly,
  monthly,
}: {
  points: DownloadPoint[];
  weekly?: number;
  monthly?: number;
}) {
  const values = useMemo(
    () => points.map((point) => point.downloads),
    [points],
  );
  const count = values.length;
  const [active, setActive] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const geometry = useMemo(() => {
    if (count === 0) {
      return null;
    }

    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = Math.max(max - min, 1);
    const innerHeight = HEIGHT - TOP - BOTTOM;

    const coords: Coord[] = values.map((value, index) => ({
      x: count === 1 ? WIDTH / 2 : (index / (count - 1)) * WIDTH,
      y: TOP + (1 - (value - min) / range) * innerHeight,
    }));

    const line = buildSmoothPath(coords, innerHeight);
    const area = `${line} L ${coords[count - 1].x} ${HEIGHT} L ${coords[0].x} ${HEIGHT} Z`;

    const last7 = values.slice(-7).reduce((sum, value) => sum + value, 0);
    const previous7 = values.slice(-14, -7).reduce((sum, value) => sum + value, 0);
    const delta =
      previous7 > 0 ? ((last7 - previous7) / previous7) * 100 : null;

    return { coords, line, area, delta };
  }, [count, values]);

  if (count === 0 || !geometry) {
    return (
      <p className="m-0 text-[12px] leading-5 text-text-secondary">
        Download trend unavailable.
      </p>
    );
  }

  const { coords, line, area, delta } = geometry;
  const activeIndex = active ?? count - 1;
  const activePoint = points[activeIndex];
  const activeCoord = coords[activeIndex];
  const readoutDate = activePoint ? formatDay(activePoint.day) : "Unknown";
  const readoutValue = activePoint
    ? activePoint.downloads.toLocaleString("en-US")
    : "—";
  const range = `${formatDay(points[0]?.day)} → ${formatDay(points[count - 1]?.day)}`;

  function setFromPointer(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;

    const ratio = (event.clientX - rect.left) / rect.width;
    const index = clamp(Math.round(ratio * (count - 1)), 0, count - 1);

    if (index !== active) setActive(index);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const current = active ?? count - 1;
    let next: number | null = null;

    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        next = Math.max(current - 1, 0);
        break;
      case "ArrowRight":
      case "ArrowUp":
        next = Math.min(current + 1, count - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      case "Escape":
        setActive(null);
        return;
      default:
        return;
    }

    event.preventDefault();
    setActive(next);
  }

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-mono text-[26px] leading-none font-semibold tracking-[-0.02em] text-text-primary">
          {typeof weekly === "number"
            ? weekly.toLocaleString("en-US")
            : "Unknown"}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
          weekly
        </span>
        {delta !== null ? (
          <span
            className={`font-mono text-[11px] ${
              delta >= 0 ? "text-accent-green" : "text-brand"
            }`}
            title="Last 7 days vs the previous 7 days"
          >
            {delta >= 0 ? "+" : ""}
            {delta.toFixed(1)}%
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 mb-0 font-mono text-[11px] text-text-secondary">
        {typeof monthly === "number"
          ? `${monthly.toLocaleString("en-US")} in 30 days`
          : "30-day total unavailable"}
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 font-mono text-[10px] text-text-muted">
        <span className="truncate">{range}</span>
        <span className="hidden shrink-0 sm:inline">hover or arrows</span>
      </div>

      <div className="mt-1.5 flex min-h-5 items-center justify-between gap-3 font-mono text-[10px]">
        <span className="text-text-secondary">{readoutDate}</span>
        <span className="text-text-primary">{readoutValue}</span>
      </div>

      <div
        ref={rootRef}
        id="download-chart"
        role="slider"
        tabIndex={0}
        aria-label="Daily download trend"
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={count - 1}
        aria-valuenow={activeIndex}
        aria-valuetext={`${readoutDate}: ${readoutValue} downloads`}
        onKeyDown={handleKeyDown}
        onFocus={() => setActive((current) => current ?? count - 1)}
        onBlur={() => setActive(null)}
        onPointerMove={setFromPointer}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          setFromPointer(event);
        }}
        onPointerLeave={() => {
          if (document.activeElement !== rootRef.current) setActive(null);
        }}
        className="relative mt-1 h-24 w-full cursor-crosshair touch-pan-y rounded-[var(--radius-xs)] outline-offset-4"
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-full w-full text-brand-2"
          aria-hidden="true"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="download-chart-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(94 234 212 / 0.18)" />
              <stop offset="100%" stopColor="rgb(94 234 212 / 0)" />
            </linearGradient>
          </defs>

          <path d={area} fill="url(#download-chart-fill)" />
          <path
            d={line}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {active !== null && activePoint ? (
          <>
            <span
              aria-hidden="true"
              className="pointer-events-none absolute w-px bg-border-strong"
              style={{
                left: `${(activeCoord.x / WIDTH) * 100}%`,
                top: `${(TOP / HEIGHT) * 100}%`,
                bottom: `${(BOTTOM / HEIGHT) * 100}%`,
              }}
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-brand bg-background"
              style={{
                left: `${(activeCoord.x / WIDTH) * 100}%`,
                top: `${(activeCoord.y / HEIGHT) * 100}%`,
              }}
            />
          </>
        ) : null}
      </div>

      <span className="sr-only" aria-live="polite">
        {active !== null
          ? `${readoutDate}: ${readoutValue} downloads`
          : ""}
      </span>
    </div>
  );
}
