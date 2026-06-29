import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  Toast,
  launchCommand,
  LaunchType,
  openExtensionPreferences,
  showToast,
} from "@raycast/api";
import path from "node:path";
import { useEffect, useState } from "react";
import { ItemDetail, ItemListDetail } from "./components/ItemDetail";
import { JsonDetail, JsonListDetail } from "./components/JsonDetail";
import { getResolvedPreferences } from "./lib/preferences";
import { getOpenableScriptPath } from "./lib/scripts";
import {
  copyDebugSnapshot,
  peekNativeMenuBar,
  queryBar,
  queryEvents,
  queryItem,
  reloadSketchyBar,
  setBarHidden,
  setItemDrawing,
  triggerEvent,
} from "./lib/sketchybar";
import type { SketchyBarBar, SketchyBarEvents, SketchyBarItem } from "./lib/types";
import { drawingAccessory, getErrorMessage, itemSubtitle, showErrorToast, showSuccessHUD } from "./lib/ui";

type State = {
  isLoading: boolean;
  bar?: SketchyBarBar;
  events?: SketchyBarEvents;
  items: SketchyBarItem[];
  itemErrors: { name: string; message: string }[];
  error?: { title: string; message?: string };
};

const initialState: State = {
  isLoading: true,
  items: [],
  itemErrors: [],
};

export default function Command() {
  const [state, setState] = useState<State>(initialState);
  const preferences = getResolvedPreferences();
  const configDirectory = path.dirname(preferences.configPath);
  const pluginsDirectory = path.join(configDirectory, "plugins");

  async function load() {
    setState((previous) => ({ ...previous, isLoading: true, error: undefined }));

    try {
      const [bar, events] = await Promise.all([queryBar(), queryEvents()]);
      const itemResults = await Promise.allSettled((bar.items ?? []).map((itemName) => queryItem(itemName)));
      const items = itemResults.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
      const itemErrors = itemResults.flatMap((result, index) => {
        if (result.status === "fulfilled") {
          return [];
        }

        const parsedError = getErrorMessage(result.reason);
        return [{ name: bar.items?.[index] ?? "Unknown Item", message: parsedError.message ?? parsedError.title }];
      });

      setState({ isLoading: false, bar, events, items, itemErrors });
    } catch (error) {
      setState({ isLoading: false, items: [], itemErrors: [], error: getErrorMessage(error) });
      await showErrorToast(error);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function runAction(action: () => Promise<void>, successMessage: string) {
    try {
      await action();
      await showSuccessHUD(successMessage);
      await load();
    } catch (error) {
      await showErrorToast(error);
    }
  }

  const isHidden = state.bar?.hidden === "on";

  return (
    <List
      isLoading={state.isLoading}
      searchBarPlaceholder="Search SketchyBar configuration, items, and events"
      isShowingDetail={!state.error && state.items.length > 0}
    >
      {state.error ? (
        <List.EmptyView
          icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
          title={state.error.title}
          description={state.error.message}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.RotateClockwise} onAction={load} />
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      ) : null}

      {!state.error ? (
        <List.Section title="Configuration">
          <List.Item
            title={path.basename(preferences.configPath)}
            subtitle={preferences.configPath}
            icon={Icon.Document}
            accessories={[{ text: "Config File" }]}
            detail={
              <JsonListDetail
                value={{
                  configFile: preferences.configPath,
                  configDirectory,
                  pluginsDirectory,
                  sketchybarPath: preferences.sketchybarPath,
                }}
              />
            }
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenWith title="Open Config in Editor" icon={Icon.Pencil} path={preferences.configPath} />
                  <Action.ShowInFinder title="Show Config in Finder" path={preferences.configPath} />
                  <Action.Open title="Open Config Folder" icon={Icon.Folder} target={configDirectory} />
                  <Action.Open title="Open Plugins Folder" icon={Icon.Folder} target={pluginsDirectory} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Reload SketchyBar"
                    icon={Icon.RotateClockwise}
                    onAction={() => runAction(reloadSketchyBar, "SketchyBar reloaded")}
                  />
                  <Action.CopyToClipboard title="Copy Config Path" content={preferences.configPath} />
                  <Action.CopyToClipboard title="Copy Config Folder Path" content={configDirectory} />
                  <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {state.bar ? (
        <List.Section title="Bar">
          <List.Item
            title={isHidden ? "SketchyBar Hidden" : "SketchyBar Visible"}
            subtitle={`${state.items.length} loaded items · ${state.bar.position ?? "unknown"} · ${state.bar.height ?? 0}px`}
            icon={{
              source: isHidden ? Icon.EyeDisabled : Icon.Eye,
              tintColor: isHidden ? Color.SecondaryText : Color.Green,
            }}
            accessories={[
              { text: isHidden ? "Hidden" : "Visible" },
              { text: state.bar.topmost === "on" ? "Topmost" : "Not Topmost" },
            ]}
            detail={<JsonListDetail value={state.bar} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={isHidden ? "Show SketchyBar" : "Hide SketchyBar"}
                    icon={isHidden ? Icon.Eye : Icon.EyeDisabled}
                    onAction={() =>
                      runAction(() => setBarHidden(!isHidden), isHidden ? "SketchyBar shown" : "SketchyBar hidden")
                    }
                  />
                  <Action
                    title="Peek Menu Bar"
                    icon={Icon.Clock}
                    shortcut={Keyboard.Shortcut.Common.Open}
                    onAction={() =>
                      runAction(async () => {
                        await peekNativeMenuBar(preferences.defaultPeekSeconds);
                      }, `SketchyBar hidden for ${preferences.defaultPeekSeconds}s`)
                    }
                  />
                  <Action
                    title="Reload SketchyBar"
                    icon={Icon.RotateClockwise}
                    onAction={() => runAction(reloadSketchyBar, "SketchyBar reloaded")}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push title="View Bar JSON" icon={Icon.Document} target={<JsonDetail value={state.bar} />} />
                  <Action
                    title="Copy Debug Snapshot"
                    icon={Icon.Clipboard}
                    onAction={() => runAction(copyDebugSnapshot, "Copied SketchyBar debug snapshot")}
                  />
                  <Action.OpenWith title="Open Config File" icon={Icon.Document} path={preferences.configPath} />
                  <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                  <Action
                    title="Open Diagnostics"
                    icon={Icon.Terminal}
                    onAction={() => launchCommand({ name: "diagnostics", type: LaunchType.UserInitiated })}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      {state.itemErrors.length > 0 ? (
        <List.Section title="Item Query Warnings">
          <List.Item
            title={`${state.itemErrors.length} items could not be loaded`}
            subtitle="Refresh to query the latest SketchyBar state"
            icon={{ source: Icon.ExclamationMark, tintColor: Color.Yellow }}
            accessories={[{ text: "Warning" }]}
            detail={<JsonListDetail value={state.itemErrors} />}
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.RotateClockwise} onAction={load} />
                <Action.CopyToClipboard title="Copy Warnings" content={JSON.stringify(state.itemErrors, null, 2)} />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}

      <List.Section title="Items">
        {state.items.map((item) => {
          const isVisible = item.geometry?.drawing === "on";
          const scriptPath = getOpenableScriptPath(item.scripting?.script);
          return (
            <List.Item
              key={item.name}
              title={item.name}
              subtitle={itemSubtitle(item)}
              icon={{
                source: isVisible ? Icon.Circle : Icon.CircleDisabled,
                tintColor: isVisible ? Color.Green : Color.SecondaryText,
              }}
              accessories={[
                drawingAccessory(item.geometry?.drawing),
                ...(item.label?.value ? [{ text: item.label.value }] : []),
              ]}
              detail={<ItemListDetail item={item} />}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={isVisible ? "Hide Item" : "Show Item"}
                      icon={isVisible ? Icon.EyeDisabled : Icon.Eye}
                      onAction={() =>
                        runAction(
                          () => setItemDrawing(item.name, !isVisible),
                          isVisible ? `${item.name} hidden` : `${item.name} shown`,
                        )
                      }
                    />
                    <Action.Push title="View Item JSON" icon={Icon.Document} target={<ItemDetail item={item} />} />
                  </ActionPanel.Section>
                  <ActionPanel.Section>
                    {scriptPath ? <Action.OpenWith title="Open Script" icon={Icon.Terminal} path={scriptPath} /> : null}
                    <Action.CopyToClipboard title="Copy Item Name" content={item.name} />
                    <Action.CopyToClipboard
                      title="Copy Item JSON"
                      icon={Icon.Clipboard}
                      content={JSON.stringify(item, null, 2)}
                    />
                    <Action title="Refresh" icon={Icon.RotateClockwise} onAction={load} />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {state.events ? (
        <List.Section title="Events">
          {Object.entries(state.events).map(([eventName, event]) => (
            <List.Item
              key={eventName}
              title={eventName}
              subtitle={event.notification && event.notification !== "(null)" ? event.notification : "SketchyBar event"}
              icon={Icon.Bolt}
              accessories={[{ text: event.bit === undefined ? "" : String(event.bit) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Trigger Event"
                    icon={Icon.Bolt}
                    onAction={() => runAction(() => triggerEvent(eventName), `Triggered ${eventName}`)}
                  />
                  <Action.CopyToClipboard title="Copy Event Name" content={eventName} />
                  <Action.CopyToClipboard title="Copy Event JSON" content={JSON.stringify(event, null, 2)} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}

      {!state.isLoading && !state.error && !state.bar?.items?.length ? (
        <List.EmptyView
          title="No SketchyBar Items Found"
          description="SketchyBar responded, but the current bar has no items."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.RotateClockwise} onAction={load} />
            </ActionPanel>
          }
        />
      ) : null}

      {!state.error && state.items.length > 0 ? (
        <List.Section title="Extension">
          <List.Item
            title="Preferences"
            subtitle="Configure paths and peek behavior"
            icon={Icon.Gear}
            actions={
              <ActionPanel>
                <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
                <Action
                  title="Refresh"
                  icon={Icon.RotateClockwise}
                  onAction={async () => {
                    await showToast({ style: Toast.Style.Animated, title: "Refreshing SketchyBar state" });
                    await load();
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      ) : null}
    </List>
  );
}
