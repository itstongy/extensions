import { Clipboard } from "@raycast/api";
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { getResolvedPreferences } from "./preferences";
import type { DiagnosticCheck, SketchyBarBar, SketchyBarEvents, SketchyBarHiddenState, SketchyBarItem } from "./types";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_PATHS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"];
const RESTORE_TOKEN_PATH = path.join(os.tmpdir(), "raycast-sketchybar-restore-token");

function mergePath(existingPath: string | undefined): string {
  const parts = [...DEFAULT_PATHS, ...(existingPath?.split(":") ?? [])].filter(Boolean);
  return [...new Set(parts)].join(":");
}

function getCommandEnvironment(): NodeJS.ProcessEnv {
  const username = os.userInfo().username;

  return {
    ...process.env,
    HOME: process.env.HOME || os.homedir(),
    LOGNAME: process.env.LOGNAME || username,
    PATH: mergePath(process.env.PATH),
    SHELL: process.env.SHELL || "/bin/zsh",
    USER: process.env.USER || username,
  };
}

export class SketchyBarError extends Error {
  readonly title: string;
  readonly detail?: string;

  constructor(title: string, detail?: string) {
    super(detail ? `${title}: ${detail}` : title);
    this.name = "SketchyBarError";
    this.title = title;
    this.detail = detail;
  }
}

function normalizeCliValue(value: string | null | undefined): string | undefined {
  if (!value || value === "(null)") {
    return undefined;
  }

  return value;
}

export function cleanItem(item: SketchyBarItem): SketchyBarItem {
  return {
    ...item,
    scripting: item.scripting
      ? {
          ...item.scripting,
          script: normalizeCliValue(item.scripting.script),
          click_script: normalizeCliValue(item.scripting.click_script),
        }
      : undefined,
  };
}

export async function runSketchyBar(args: string[], options?: { timeoutMs?: number }) {
  const { sketchybarPath } = getResolvedPreferences();

  try {
    return await execFileAsync(sketchybarPath, args, {
      env: getCommandEnvironment(),
      timeout: options?.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      maxBuffer: 1024 * 1024 * 8,
    });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException & { stderr?: string; stdout?: string };

    if (nodeError.code === "ENOENT") {
      throw new SketchyBarError(
        "SketchyBar was not found",
        `Raycast could not run ${sketchybarPath}. Install SketchyBar or update the path in extension preferences.`,
      );
    }

    if (nodeError.code === "EACCES") {
      throw new SketchyBarError("SketchyBar is not executable", `${sketchybarPath} exists but cannot be executed.`);
    }

    if (nodeError.code === "ETIMEDOUT") {
      throw new SketchyBarError("SketchyBar command timed out", `Command: sketchybar ${args.join(" ")}`);
    }

    const stderr = nodeError.stderr?.trim();
    const stdout = nodeError.stdout?.trim();
    throw new SketchyBarError("SketchyBar command failed", stderr || stdout || nodeError.message);
  }
}

async function queryJson<T>(target: string): Promise<T> {
  const { stdout } = await runSketchyBar(["--query", target]);

  try {
    return JSON.parse(stdout) as T;
  } catch {
    throw new SketchyBarError("SketchyBar returned invalid JSON", stdout.trim());
  }
}

export async function queryBar(): Promise<SketchyBarBar> {
  return queryJson<SketchyBarBar>("bar");
}

export async function queryItem(name: string): Promise<SketchyBarItem> {
  return cleanItem(await queryJson<SketchyBarItem>(name));
}

export async function queryEvents(): Promise<SketchyBarEvents> {
  return queryJson<SketchyBarEvents>("events");
}

export async function queryDefaults(): Promise<SketchyBarItem> {
  return cleanItem(await queryJson<SketchyBarItem>("defaults"));
}

async function invalidatePendingHiddenRestore(): Promise<void> {
  await fs.writeFile(RESTORE_TOKEN_PATH, randomUUID(), "utf8");
}

export async function setBarHidden(hidden: boolean): Promise<void> {
  await invalidatePendingHiddenRestore();
  await runSketchyBar(["--bar", `hidden=${hidden ? "on" : "off"}`]);
}

export async function setItemDrawing(itemName: string, drawing: boolean): Promise<void> {
  await runSketchyBar(["--set", itemName, `drawing=${drawing ? "on" : "off"}`]);
}

export async function triggerEvent(eventName: string): Promise<void> {
  await runSketchyBar(["--trigger", eventName]);
}

export async function reloadSketchyBar(): Promise<void> {
  const { configPath, configPathConfigured } = getResolvedPreferences();
  await invalidatePendingHiddenRestore();
  await runSketchyBar(configPathConfigured ? ["--reload", configPath] : ["--reload"]);
}

export async function copyDebugSnapshot(): Promise<void> {
  const [bar, events] = await Promise.all([queryBar(), queryEvents()]);
  const itemResults = await Promise.allSettled((bar.items ?? []).map((item) => queryItem(item)));
  const items = itemResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
  const failedItems = itemResults.flatMap((result, index) =>
    result.status === "rejected" ? [{ name: bar.items?.[index], error: String(result.reason) }] : [],
  );

  await Clipboard.copy(JSON.stringify({ bar, events, items, failedItems }, null, 2));
}

export async function scheduleHiddenRestore(seconds: number, targetHiddenState: SketchyBarHiddenState): Promise<void> {
  const { sketchybarPath } = getResolvedPreferences();
  const restoreToken = randomUUID();
  await fs.writeFile(RESTORE_TOKEN_PATH, restoreToken, "utf8");

  const child = spawn(
    "/bin/sh",
    [
      "-c",
      'sleep "$1"; if [ "$(cat "$4" 2>/dev/null)" = "$5" ]; then "$2" --bar "hidden=$3"; rm -f "$4"; fi',
      "sketchybar",
      String(seconds),
      sketchybarPath,
      targetHiddenState,
      RESTORE_TOKEN_PATH,
      restoreToken,
    ],
    {
      detached: true,
      env: getCommandEnvironment(),
      stdio: "ignore",
    },
  );

  child.unref();
}

export async function peekNativeMenuBar(
  seconds: number,
): Promise<{ previousHidden: SketchyBarHiddenState; restoreTo: SketchyBarHiddenState }> {
  const preferences = getResolvedPreferences();
  const bar = await queryBar();
  const previousHidden = bar.hidden === "on" ? "on" : "off";
  const restoreTo = preferences.restorePreviousHiddenState ? previousHidden : "off";

  await setBarHidden(true);
  await scheduleHiddenRestore(seconds, restoreTo);

  return { previousHidden, restoreTo };
}

export async function getDiagnostics(): Promise<DiagnosticCheck[]> {
  const preferences = getResolvedPreferences();
  const checks: DiagnosticCheck[] = [];

  try {
    await fs.access(preferences.sketchybarPath, fsConstants.X_OK);
    checks.push({
      title: "SketchyBar Binary",
      status: "success",
      message: preferences.sketchybarPath,
    });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    checks.push({
      title: "SketchyBar Binary",
      status: "failure",
      message: "SketchyBar is missing or not executable.",
      detail: `${preferences.sketchybarPath}\n${nodeError.message}`,
    });
  }

  try {
    await fs.access(preferences.configPath, fsConstants.R_OK);
    checks.push({
      title: "Config File",
      status: "success",
      message: preferences.configPath,
    });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    checks.push({
      title: "Config File",
      status: "warning",
      message: "The configured SketchyBar file could not be read. Runtime controls can still work.",
      detail: `${preferences.configPath}\n${nodeError.message}`,
    });
  }

  try {
    const bar = await queryBar();
    checks.push({
      title: "Live Bar Query",
      status: "success",
      message: `SketchyBar is ${bar.hidden === "on" ? "hidden" : "visible"} with ${(bar.items ?? []).length} items.`,
      detail: JSON.stringify(bar, null, 2),
    });
  } catch (error) {
    checks.push({
      title: "Live Bar Query",
      status: "failure",
      message:
        error instanceof SketchyBarError
          ? (error.detail ?? error.title)
          : "Raycast could not query the running SketchyBar instance.",
      detail: error instanceof SketchyBarError ? error.detail : String(error),
    });
  }

  try {
    const events = await queryEvents();
    checks.push({
      title: "Events Query",
      status: "success",
      message: `${Object.keys(events).length} events available.`,
      detail: JSON.stringify(events, null, 2),
    });
  } catch (error) {
    checks.push({
      title: "Events Query",
      status: "failure",
      message:
        error instanceof SketchyBarError ? (error.detail ?? error.title) : "Raycast could not query SketchyBar events.",
      detail: error instanceof SketchyBarError ? error.detail : String(error),
    });
  }

  return checks;
}
