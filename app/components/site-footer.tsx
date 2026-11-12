import Link from "next/link";
import { Github } from "lucide-react";
import { GITHUB_REPO_URL } from "@/app/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border-subtle">
      <div className="mx-auto flex w-full max-w-[var(--container-max)] flex-col gap-1 px-4 py-4 font-mono text-[11px] text-text-secondary sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <Link
          href="/how-it-works"
          className="inline-flex min-h-11 items-center self-start text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
        >
          <span className="link-underline">how it works</span>
        </Link>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-11 items-center gap-2 self-start text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
        >
          <Github
            aria-hidden="true"
            className="h-4 w-4 text-text-muted"
            strokeWidth={1.8}
          />
          <span className="link-underline">contribute to the project</span>
        </a>
      </div>
    </footer>
  );
}
