"use client";

import type { MouseEvent, ReactNode } from "react";

export function ReadmeCopy({ children }: { children: ReactNode }) {
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("button.readme-copy");
    if (!button) return;

    const wrapper = button.closest(".readme-code");
    const pre = wrapper?.querySelector("pre");
    if (!pre) return;

    void navigator.clipboard
      .writeText(pre.textContent ?? "")
      .then(() => {
        button.textContent = "copied";
        window.setTimeout(() => {
          button.textContent = "copy";
        }, 1500);
      })
      .catch(() => {
        button.textContent = "copy";
      });
  }

  return (
    <div className="readme min-w-0" onClick={handleClick}>
      {children}
    </div>
  );
}
