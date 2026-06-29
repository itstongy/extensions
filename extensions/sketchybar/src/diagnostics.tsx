import { Action, ActionPanel, Clipboard, Icon, List, openExtensionPreferences } from "@raycast/api";
import { useEffect, useState } from "react";
import { DiagnosticsListDetail } from "./components/DiagnosticsDetail";
import { getDiagnostics } from "./lib/sketchybar";
import type { DiagnosticCheck } from "./lib/types";
import { showErrorToast, showSuccessHUD, statusIcon } from "./lib/ui";

type State = {
  isLoading: boolean;
  checks: DiagnosticCheck[];
};

export default function Command() {
  const [state, setState] = useState<State>({ isLoading: true, checks: [] });

  async function load() {
    setState((previous) => ({ ...previous, isLoading: true }));

    try {
      const checks = await getDiagnostics();
      setState({ isLoading: false, checks });
    } catch (error) {
      setState({ isLoading: false, checks: [] });
      await showErrorToast(error);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function copyReport() {
    await Clipboard.copy(JSON.stringify(state.checks, null, 2));
    await showSuccessHUD("Copied diagnostics report");
  }

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search diagnostic checks"
      isShowingDetail={state.checks.length > 0}
    >
      <List.Section title="Checks">
        {state.checks.map((check) => (
          <List.Item
            key={check.title}
            title={check.title}
            subtitle={check.message}
            icon={statusIcon(check.status)}
            accessories={[{ text: check.status }]}
            detail={<DiagnosticsListDetail check={check} />}
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.RotateClockwise} onAction={load} />
                <Action.CopyToClipboard title="Copy Check" content={JSON.stringify(check, null, 2)} />
                <Action title="Copy Report" icon={Icon.Clipboard} onAction={copyReport} />
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
