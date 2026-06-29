import { Color, Icon, Toast, showHUD, showToast } from "@raycast/api";
import { SketchyBarError } from "./sketchybar";
import type { DiagnosticStatus, SketchyBarItem } from "./types";

export function getErrorMessage(error: unknown): { title: string; message?: string } {
  if (error instanceof SketchyBarError) {
    return { title: error.title, message: error.detail };
  }

  if (error instanceof Error) {
    return { title: error.message };
  }

  return { title: String(error) };
}

export async function showErrorToast(error: unknown, fallbackTitle = "SketchyBar command failed") {
  const parsed = getErrorMessage(error);
  await showToast({
    style: Toast.Style.Failure,
    title: parsed.title || fallbackTitle,
    message: parsed.message,
  });
}

export async function showSuccessHUD(message: string) {
  await showHUD(message);
}

export function statusIcon(status: DiagnosticStatus) {
  switch (status) {
    case "success":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "warning":
      return { source: Icon.ExclamationMark, tintColor: Color.Yellow };
    case "failure":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
  }
}

export function drawingAccessory(value: string | undefined) {
  if (value === "on") {
    return { text: "Visible", icon: { source: Icon.Eye, tintColor: Color.Green } };
  }

  if (value === "off") {
    return { text: "Hidden", icon: { source: Icon.EyeDisabled, tintColor: Color.SecondaryText } };
  }

  return { text: "Unknown", icon: { source: Icon.QuestionMarkCircle, tintColor: Color.SecondaryText } };
}

export function itemSubtitle(item: SketchyBarItem): string {
  const parts = [item.type, item.geometry?.position, item.scripting?.updates].filter(Boolean);
  return parts.join(" · ");
}

export function itemMarkdown(item: SketchyBarItem): string {
  const lines = [
    `# ${item.name}`,
    "",
    `**Type:** ${item.type}`,
    `**Position:** ${item.geometry?.position ?? "Unknown"}`,
    `**Drawing:** ${item.geometry?.drawing ?? "Unknown"}`,
    `**Icon:** ${item.icon?.value || "None"}`,
    `**Label:** ${item.label?.value || "None"}`,
    `**Script:** ${item.scripting?.script || "None"}`,
    `**Click Script:** ${item.scripting?.click_script || "None"}`,
    `**Update Frequency:** ${item.scripting?.update_freq ?? 0}s`,
    `**Updates:** ${item.scripting?.updates || "Unknown"}`,
    "",
    "```json",
    JSON.stringify(item, null, 2),
    "```",
  ];

  return lines.join("\n");
}

export function barMarkdown(raw: unknown): string {
  return ["# SketchyBar", "", "```json", JSON.stringify(raw, null, 2), "```"].join("\n");
}
