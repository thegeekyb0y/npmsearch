import { Github, Star } from "lucide-react";
import { getRepoStars } from "@/app/lib/repo";
import { GITHUB_REPO_URL } from "@/app/lib/site";

function RepoLink({ stars }: { stars?: number }) {
  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noreferrer noopener"
      className="inline-flex min-h-11 items-center gap-1.5 text-text-secondary transition-colors duration-150 ease-out hover:text-text-primary"
    >
      <Github
        aria-hidden="true"
        className="h-3.5 w-3.5 text-text-muted"
        strokeWidth={1.8}
      />
      <span className="link-underline">github</span>
      {typeof stars === "number" ? (
        <span className="inline-flex items-center gap-1 text-brand-2">
          <Star aria-hidden="true" className="h-3 w-3" strokeWidth={1.8} />
          {stars.toLocaleString("en-US")}
        </span>
      ) : null}
    </a>
  );
}

export function RepoStarsFallback() {
  return <RepoLink />;
}

export async function RepoStars() {
  const stars = await getRepoStars();
  return <RepoLink stars={stars} />;
}
