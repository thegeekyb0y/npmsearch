import { describe, expect, it } from "vitest";
import rehypeShiki from "@shikijs/rehype";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownAsync } from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import {
  readmeSanitizeSchema,
  rehypeAddCodeCopyButtons,
} from "../../app/lib/readme";

describe("README rendering", () => {
  it("renders sanitized markdown with shiki and copy buttons", async () => {
    const element = await MarkdownAsync({
      children: [
        "## Install",
        "",
        "<script>alert(1)</script>",
        '<img src="https://example.com/badge.svg" alt="badge" width="100" height="20">',
        "",
        "```ts",
        "const answer = 42",
        "```",
      ].join("\n"),
      remarkPlugins: [remarkGfm],
      rehypePlugins: [
        rehypeRaw,
        [rehypeSanitize, readmeSanitizeSchema],
        rehypeSlug,
        rehypeAddCodeCopyButtons,
        [
          rehypeShiki,
          {
            theme: "vesper",
            langs: ["ts"],
            defaultLanguage: "text",
            fallbackLanguage: "text",
          },
        ],
      ],
    });

    const html = renderToStaticMarkup(element);

    expect(html).toContain('id="install"');
    expect(html).toContain("shiki");
    expect(html).toContain("readme-copy");
    expect(html).toContain('alt="badge"');
    expect(html).toContain('width="100"');
    expect(html).not.toContain("<script");
  }, 60_000);

  it("adds copy buttons without shiki", async () => {
    const element = await MarkdownAsync({
      children: ["```ts", "const answer = 42", "```"].join("\n"),
      rehypePlugins: [
        rehypeRaw,
        [rehypeSanitize, readmeSanitizeSchema],
        rehypeAddCodeCopyButtons,
      ],
    });

    const html = renderToStaticMarkup(element);
    expect(html).toContain("readme-copy");
  });
});
