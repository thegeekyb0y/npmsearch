import { describe, expect, it } from "vitest";
import type { Element, Root } from "hast";
import {
  extractHeadings,
  rehypeAddCodeCopyButtons,
  rehypeRewriteReadmeUrls,
} from "../../app/lib/readme";

function element(
  tagName: string,
  properties: Element["properties"] = {},
  children: Element["children"] = [],
): Element {
  return { type: "element", tagName, properties, children };
}

describe("readme pipeline", () => {
  it("extracts h2/h3 headings and skips fenced code", () => {
    const markdown = [
      "# Package",
      "## Installation",
      "```sh",
      "## Not a heading",
      "```",
      "### Usage",
      "## Usage",
      "## [Links](https://example.com)",
    ].join("\n");

    expect(extractHeadings(markdown)).toEqual([
      { depth: 2, text: "Installation", id: "installation" },
      { depth: 3, text: "Usage", id: "usage" },
      { depth: 2, text: "Usage", id: "usage-1" },
      { depth: 2, text: "Links", id: "links" },
    ]);
  });

  it("rewrites relative image and link urls against the GitHub repo", () => {
    const tree: Root = {
      type: "root",
      children: [
        element("img", { src: "./assets/logo.png" }),
        element("img", { src: "https://example.com/absolute.png" }),
        element("a", { href: "../docs/guide.md" }),
        element("a", { href: "#usage" }),
      ],
    };

    rehypeRewriteReadmeUrls({
      repositoryUrl: "git+https://github.com/facebook/react.git",
    })(tree);

    const [image, absoluteImage, link, anchor] = tree.children as Element[];

    expect(image.properties?.src).toBe(
      "https://raw.githubusercontent.com/facebook/react/HEAD/assets/logo.png",
    );
    expect(absoluteImage.properties?.src).toBe(
      "https://example.com/absolute.png",
    );
    expect(link.properties?.href).toBe(
      "https://github.com/facebook/react/blob/HEAD/docs/guide.md",
    );
    expect(anchor.properties?.href).toBe("#usage");
  });

  it("wraps pre blocks with a copy button", () => {
    const tree: Root = {
      type: "root",
      children: [element("pre", {}, [element("code")])],
    };

    rehypeAddCodeCopyButtons()(tree);

    const wrapper = tree.children[0] as Element;
    expect(wrapper.tagName).toBe("div");
    expect(wrapper.children).toHaveLength(2);
    expect((wrapper.children[0] as Element).tagName).toBe("pre");
    expect((wrapper.children[1] as Element).tagName).toBe("button");
    expect((wrapper.children[1] as Element).properties?.className).toEqual([
      "readme-copy",
    ]);
  });
});
