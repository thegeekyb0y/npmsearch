"use client";

import { useState } from "react";
import { CopyButton } from "./ui";

export function CopyInstallButton({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return <CopyButton copied={copied} onClick={handleCopy} />;
}
