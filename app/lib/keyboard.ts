type EditableLike = {
  tagName?: string;
  isContentEditable?: boolean;
};

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || typeof target !== "object") return false;

  const element = target as EditableLike;
  if (element.isContentEditable) return true;

  const tagName = element.tagName?.toUpperCase();
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

export function focusGlobalSearch(): void {
  const input = document.querySelector<HTMLInputElement>("[data-global-search]");
  if (!input) return;

  input.focus();
  input.select();
}
