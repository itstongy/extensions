import path from "node:path";

const SHELL_PREFIXES = new Set(["bash", "sh", "zsh", "/bin/bash", "/bin/sh", "/bin/zsh", "env", "/usr/bin/env"]);

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

export function getOpenableScriptPath(script: string | undefined): string | undefined {
  if (!script) {
    return undefined;
  }

  const parts = script.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(stripQuotes) ?? [];
  const candidates = parts.filter((part) => !part.includes("=") && !part.startsWith("-") && !SHELL_PREFIXES.has(part));
  return candidates.find((candidate) => path.isAbsolute(candidate));
}
