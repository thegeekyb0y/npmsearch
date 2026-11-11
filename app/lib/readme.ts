import GithubSlugger from "github-slugger";
import type { Element, Root } from "hast";
import { defaultSchema } from "rehype-sanitize";

export type ReadmeHeading = {
  depth: 2 | 3;
  text: string;
  id: string;
};

const baseAttributes = defaultSchema.attributes ?? {};

export const readmeSanitizeSchema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([
      ...(defaultSchema.tagNames ?? []),
      "kbd",
      "sup",
      "sub",
      "figure",
      "figcaption",
      "picture",
      "source",
    ]),
  ),
  attributes: {
    ...baseAttributes,
    img: [
      ...(baseAttributes.img ?? []),
      "alt",
      "title",
      "width",
      "height",
      "loading",
      "decoding",
    ],
    a: [...(baseAttributes.a ?? []), "target", "rel"],
    th: [...(baseAttributes.th ?? []), "align"],
    td: [...(baseAttributes.td ?? []), "align"],
  },
};

type RepositoryRef = {
  owner: string;
  repo: string;
};

function parseRepository(repositoryUrl?: string): RepositoryRef | null {
  if (!repositoryUrl) return null;

  const shorthand = /^github:([^/\s]+)\/([^/#?\s]+)$/i.exec(
    repositoryUrl.trim(),
  );
  if (shorthand) {
    return { owner: shorthand[1], repo: shorthand[2].replace(/\.git$/, "") };
  }

  const match = /github\.com[/:]([^/]+)\/([^/#?]+)/i.exec(repositoryUrl);
  if (!match) return null;

  return {
    owner: match[1],
    repo: match[2].replace(/\.git$/, ""),
  };
}

function isRelativeUrl(value: string): boolean {
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value.trim());
}

function resolveRelativeUrl(base: string, value: string): string {
  let path = value.trim().replace(/^\/+/, "");

  while (path.startsWith("./")) path = path.slice(2);
  // npm READMEs do not reliably include their monorepo directory, so treat
  // parent-relative paths as repo-root relative instead of escaping HEAD.
  while (path.startsWith("../")) path = path.slice(3);

  return new URL(path, base).toString();
}

function walkElements(node: Root | Element, visit: (element: Element) => void) {
  if (node.type === "element") visit(node);

  if (!("children" in node)) return;

  for (const child of node.children) {
    if (child.type === "element") {
      walkElements(child, visit);
    }
  }
}

export function rehypeRewriteReadmeUrls(options: {
  repositoryUrl?: string;
}) {
  return (tree: Root) => {
    const repository = parseRepository(options.repositoryUrl);
    if (!repository) return;

    const rawBase = `https://raw.githubusercontent.com/${repository.owner}/${repository.repo}/HEAD/`;
    const blobBase = `https://github.com/${repository.owner}/${repository.repo}/blob/HEAD/`;

    walkElements(tree, (element) => {
      if (element.tagName === "img") {
        const src = element.properties?.src;
        if (typeof src === "string" && isRelativeUrl(src)) {
          element.properties.src = resolveRelativeUrl(rawBase, src);
        }
      }

      if (element.tagName === "a") {
        const href = element.properties?.href;
        if (typeof href === "string" && isRelativeUrl(href)) {
          element.properties.href = resolveRelativeUrl(blobBase, href);
        }
      }
    });
  };
}

export function rehypeAddCodeCopyButtons() {
  return (tree: Root) => {
    transformCodeBlocks(tree);
  };
}

function transformCodeBlocks(parent: Root | Element) {
  parent.children = parent.children.map((child) => {
    if (child.type === "element" && child.tagName === "pre") {
      return {
        type: "element",
        tagName: "div",
        properties: { className: ["readme-code"] },
        children: [
          child,
          {
            type: "element",
            tagName: "button",
            properties: {
              type: "button",
              className: ["readme-copy"],
              ariaLabel: "Copy code",
            },
            children: [{ type: "text", value: "copy" }],
          },
        ],
      } satisfies Element;
    }

    if (child.type === "element") {
      transformCodeBlocks(child);
    }

    return child;
  }) as typeof parent.children;
}

function cleanHeadingText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\\([\\`*_[\]{}()#+\-.!])/g, "$1")
    .trim();
}

export function extractHeadings(markdown?: string): ReadmeHeading[] {
  if (!markdown) return [];

  const slugger = new GithubSlugger();
  const headings: ReadmeHeading[] = [];
  let inFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const match = /^(#{2,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const text = cleanHeadingText(match[2]);
    if (!text) continue;

    headings.push({
      depth: match[1].length as 2 | 3,
      text,
      id: slugger.slug(text),
    });
  }

  return headings;
}
