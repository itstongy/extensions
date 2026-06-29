import { getPreferenceValues } from "@raycast/api";
import os from "node:os";
import path from "node:path";

export type ExtensionPreferences = {
  sketchybarPath?: string;
  configPath?: string;
  defaultPeekSeconds: string;
  restorePreviousHiddenState: boolean;
};

export type ResolvedPreferences = {
  sketchybarPath: string;
  configPath: string;
  configPathConfigured: boolean;
  defaultPeekSeconds: number;
  restorePreviousHiddenState: boolean;
};

const DEFAULT_SKETCHYBAR_PATH = "/opt/homebrew/bin/sketchybar";
const DEFAULT_CONFIG_PATH = "~/.config/sketchybar/sketchybarrc";
const DEFAULT_PEEK_SECONDS = 30;
export const MIN_PEEK_SECONDS = 1;
export const MAX_PEEK_SECONDS = 3600;

export function expandHome(input: string): string {
  if (input === "~") {
    return os.homedir();
  }

  if (input.startsWith("~/")) {
    return path.join(os.homedir(), input.slice(2));
  }

  return input;
}

export function parsePeekSeconds(value: string | undefined): number | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed >= MIN_PEEK_SECONDS && parsed <= MAX_PEEK_SECONDS ? parsed : undefined;
}

export function resolvePeekSeconds(value: string | undefined, fallback = DEFAULT_PEEK_SECONDS): number {
  return parsePeekSeconds(value) ?? fallback;
}

export function getResolvedPreferences(): ResolvedPreferences {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const configuredConfigPath = preferences.configPath?.trim();

  return {
    sketchybarPath: expandHome(preferences.sketchybarPath?.trim() || DEFAULT_SKETCHYBAR_PATH),
    configPath: expandHome(configuredConfigPath || DEFAULT_CONFIG_PATH),
    configPathConfigured: Boolean(configuredConfigPath),
    defaultPeekSeconds: resolvePeekSeconds(preferences.defaultPeekSeconds),
    restorePreviousHiddenState: preferences.restorePreviousHiddenState,
  };
}
