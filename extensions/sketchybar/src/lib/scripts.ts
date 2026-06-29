import path from "node:path";

const SHELL_PREFIXES = new Set(["bash", "sh", "zsh", "/bin/bash", "/bin/sh", "/bin/zsh", "env", "/usr/bin/env"]);
const INTERPRETER_BASENAMES = new Set([
  "bash",
  "bun",
  "dash",
  "deno",
  "env",
  "fish",
  "ksh",
  "node",
  "perl",
  "php",
  "python",
  "ruby",
  "sh",
  "swift",
  "zsh",
]);

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}

function executableName(value: string): string {
  return path.basename(value).replace(/\d+(?:\.\d+)*$/, "");
}

function isInterpreter(value: string): boolean {
  return SHELL_PREFIXES.has(value) || INTERPRETER_BASENAMES.has(executableName(value));
}

export function getOpenableScriptPath(script: string | undefined): string | undefined {
  if (!script) {
    return undefined;
  }

  const parts = script.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g)?.map(stripQuotes) ?? [];
  const candidates = parts.filter((part) => !part.includes("=") && !part.startsWith("-") && !SHELL_PREFIXES.has(part));
  return candidates.find((candidate) => path.isAbsolute(candidate) && !isInterpreter(candidate));
}
