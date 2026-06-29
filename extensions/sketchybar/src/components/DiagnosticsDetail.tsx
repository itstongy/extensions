import { Detail, List } from "@raycast/api";
import type { DiagnosticCheck } from "../lib/types";

function diagnosticsMarkdown(check: DiagnosticCheck): string {
  return [
    `# ${check.title}`,
    "",
    `**Status:** ${check.status}`,
    "",
    check.message,
    "",
    check.detail ? "```" : "",
    check.detail ?? "",
    check.detail ? "```" : "",
  ].join("\n");
}

export function DiagnosticsDetail({ check }: { check: DiagnosticCheck }) {
  return <Detail markdown={diagnosticsMarkdown(check)} />;
}

export function DiagnosticsListDetail({ check }: { check: DiagnosticCheck }) {
  return <List.Item.Detail markdown={diagnosticsMarkdown(check)} />;
}
