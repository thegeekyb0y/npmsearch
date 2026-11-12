import rehypeShiki from "@shikijs/rehype";
import { ExternalLinkIcon } from "lucide-react";
import { MarkdownAsync, type Components } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import {
  extractHeadings,
  readmeSanitizeSchema,
  rehypeAddCodeCopyButtons,
  rehypeRewriteReadmeUrls,
} from "@/app/lib/readme";
import { getPackageExtras } from "@/app/lib/package-page";
import { getReadmeFallback } from "@/app/lib/readme-source";
import { ReadmeCopy } from "./readme-copy";

const COMMON_LANGUAGES = [
  "bash",
  "css",
  "diff",
  "go",
  "html",
  "javascript",
  "json",
  "jsx",
  "markdown",
  "python",
  "rust",
  "shellscript",
  "sql",
  "tsx",
  "typescript",
  "yaml",
];

const markdownComponents: Components = {
  h1: ({ children, id }) => (
    <h2
      id={id}
      className="mt-8 mb-4 scroll-mt-24 text-[28px] font-semibold tracking-[-0.02em] text-text-primary first:mt-0"
    >
      {children}
    </h2>
  ),
  h2: ({ children, id }) => (
    <h3
      id={id}
      className="mt-8 mb-3 scroll-mt-24 border-b border-border-subtle pb-3 text-[22px] font-semibold tracking-[-0.02em] text-text-primary"
    >
      {children}
    </h3>
  ),
  h3: ({ children, id }) => (
    <h4
      id={id}
      className="mt-7 mb-3 scroll-mt-24 text-[17px] font-semibold tracking-[-0.01em] text-text-primary"
    >
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-4 text-[14px] leading-7 text-text-secondary">{children}</p>
  ),
  a: ({ href, children }) => {
    const external = href?.startsWith("http") ?? false;

    return (
      <a
        href={href}
        {...(external
          ? { target: "_blank", rel: "noreferrer noopener" }
          : {})}
        className="inline-flex items-center gap-1 font-medium text-text-primary underline decoration-border-strong underline-offset-4 transition-colors duration-150 ease-out hover:text-brand"
      >
        {children}
        {external ? (
          <ExternalLinkIcon
            aria-hidden="true"
            className="h-3.5 w-3.5"
            strokeWidth={1.8}
          />
        ) : null}
      </a>
    );
  },
  img: ({ src, alt, title, width, height }) => (
    // README images come from arbitrary hosts; optimizing them is unsafe.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt ?? ""}
      title={title}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className="my-4 max-w-full rounded-[var(--radius-sm)]"
    />
  ),
  ul: ({ children }) => (
    <ul className="my-4 list-disc space-y-2 pl-6 text-[14px] leading-7 text-text-secondary">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-4 list-decimal space-y-2 pl-6 text-[14px] leading-7 text-text-secondary">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-brand pl-4 text-[14px] leading-7 text-text-secondary">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto rounded-[var(--radius-md)] border border-border-subtle">
      <table className="min-w-full border-collapse text-left text-[13px]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-surface-raised text-text-primary">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="border-b border-border-subtle px-3 py-2.5 font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border-subtle px-3 py-2.5 align-top text-text-secondary">
      {children}
    </td>
  ),
  hr: () => <hr className="my-8 border-0 border-t border-border-subtle" />,
};

export async function PackageReadme({
  packageName,
  version,
  repositoryUrl,
}: {
  packageName: string;
  version?: string;
  repositoryUrl?: string;
}) {
  const data = await getPackageExtras(packageName);

  let readme = data?.readme?.trim() || undefined;
  let readmeTruncated = data?.readmeTruncated ?? false;

  if (!readme && version) {
    const fallback = await getReadmeFallback(packageName, version);
    if (fallback) {
      readme = fallback.readme;
      readmeTruncated = fallback.truncated;
    }
  }

  const toc = extractHeadings(readme);
  const rendered = readme?.trim()
    ? await MarkdownAsync({
        children: readme,
        remarkPlugins: [remarkGfm],
        rehypePlugins: [
          rehypeRaw,
          [rehypeRewriteReadmeUrls, { repositoryUrl }],
          [rehypeSanitize, readmeSanitizeSchema],
          rehypeSlug,
          rehypeAddCodeCopyButtons,
          [
            rehypeShiki,
            {
              theme: "vesper",
              langs: COMMON_LANGUAGES,
              lazy: true,
              defaultLanguage: "text",
              fallbackLanguage: "text",
            },
          ],
        ],
        components: markdownComponents,
      })
    : null;

  return (
    <>
      {toc.length > 1 ? (
        <details className="mb-5 rounded-[var(--radius-sm)] border border-border-subtle px-3 py-2">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.08em] text-text-secondary">
            contents
          </summary>
          <ul className="mt-2 mb-0 list-none space-y-1 p-0">
            {toc.map((heading) => (
              <li
                key={heading.id}
                className={heading.depth === 3 ? "pl-3" : ""}
              >
                <a
                  href={`#${heading.id}`}
                  className="font-mono text-[11px] text-text-secondary transition-colors duration-150 ease-out hover:text-brand"
                >
                  {heading.text}
                </a>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {readmeTruncated ? (
        <p className="mb-4 text-[11px] text-text-secondary">
          README truncated to 256 KB.
        </p>
      ) : null}

      {rendered ? (
        <ReadmeCopy>
          <div className="min-w-0 overflow-hidden">{rendered}</div>
        </ReadmeCopy>
      ) : (
        <p className="m-0 text-[14px] text-text-secondary">
          No README available.
        </p>
      )}
    </>
  );
}
