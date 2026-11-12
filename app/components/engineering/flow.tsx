import { ChevronRight } from "lucide-react";
import { Fragment, type ReactNode } from "react";

export type Tone = "orange" | "teal" | "blue" | "green" | "violet";

export const TONE_TEXT: Record<Tone, string> = {
  orange: "text-brand",
  teal: "text-brand-2",
  blue: "text-accent-blue",
  green: "text-accent-green",
  violet: "text-accent-violet",
};

const TONE_BOX: Record<Tone, string> = {
  orange:
    "border-[var(--accent-soft-border)] bg-[var(--accent-soft-bg)]",
  teal:
    "border-[var(--accent-teal-soft-border)] bg-[var(--accent-teal-soft-bg)]",
  blue:
    "border-[var(--accent-blue-soft-border)] bg-[var(--accent-blue-soft-bg)]",
  green:
    "border-[var(--accent-green-soft-border)] bg-[var(--accent-green-soft-bg)]",
  violet:
    "border-[var(--accent-violet-soft-border)] bg-[var(--accent-violet-soft-bg)]",
};

const TONE_BAR: Record<Tone, string> = {
  orange: "bg-brand",
  teal: "bg-brand-2",
  blue: "bg-accent-blue",
  green: "bg-accent-green",
  violet: "bg-accent-violet",
};

export type FlowStep = {
  label: string;
  detail?: string;
  tone: Tone;
};

export function Flow({
  steps,
  caption,
}: {
  steps: FlowStep[];
  caption?: ReactNode;
}) {
  return (
    <figure className="m-0">
      <div
        role="list"
        className="flex flex-col gap-2 lg:flex-row lg:items-stretch"
      >
        {steps.map((step, index) => (
          <Fragment key={`${step.label}-${index}`}>
            <div
              role="listitem"
              className={`min-w-0 flex-1 rounded-[var(--radius-sm)] border px-3 py-2.5 ${TONE_BOX[step.tone]}`}
            >
              <span
                aria-hidden="true"
                className={`mb-2 block h-0.5 w-6 rounded-full ${TONE_BAR[step.tone]}`}
              />
              <p className="m-0 font-mono text-[11px] leading-4 font-medium text-text-primary">
                {step.label}
              </p>
              {step.detail ? (
                <p className="mt-1 mb-0 font-mono text-[10px] leading-4 text-text-secondary">
                  {step.detail}
                </p>
              ) : null}
            </div>
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className="flex shrink-0 items-center justify-center text-text-muted"
              >
                <ChevronRight
                  className="h-4 w-4 rotate-90 lg:rotate-0"
                  strokeWidth={2}
                />
              </span>
            ) : null}
          </Fragment>
        ))}
      </div>
      {caption ? (
        <figcaption className="mt-2 font-mono text-[10px] leading-4 text-text-muted">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
