import { describe, expect, it } from "vitest";
import { isEditableTarget } from "../../app/lib/keyboard";

describe("isEditableTarget", () => {
  it("detects form fields", () => {
    expect(isEditableTarget({ tagName: "INPUT" } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: "TEXTAREA" } as unknown as EventTarget)).toBe(true);
    expect(isEditableTarget({ tagName: "SELECT" } as unknown as EventTarget)).toBe(true);
  });

  it("detects contenteditable", () => {
    expect(
      isEditableTarget({
        tagName: "DIV",
        isContentEditable: true,
      } as unknown as EventTarget),
    ).toBe(true);
  });

  it("allows links, buttons and empty targets", () => {
    expect(isEditableTarget({ tagName: "A" } as unknown as EventTarget)).toBe(false);
    expect(isEditableTarget({ tagName: "BUTTON" } as unknown as EventTarget)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});
