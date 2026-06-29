import { LaunchProps, closeMainWindow } from "@raycast/api";
import { MAX_PEEK_SECONDS, MIN_PEEK_SECONDS, getResolvedPreferences, parsePeekSeconds } from "./lib/preferences";
import { SketchyBarError, peekNativeMenuBar } from "./lib/sketchybar";
import { showErrorToast, showSuccessHUD } from "./lib/ui";

export default async function Command(props: LaunchProps<{ arguments: Arguments.PeekMenuBar }>) {
  const preferences = getResolvedPreferences();
  const secondsArgument = props.arguments.seconds?.trim();
  const seconds = secondsArgument ? parsePeekSeconds(secondsArgument) : preferences.defaultPeekSeconds;

  try {
    if (!seconds) {
      throw new SketchyBarError(
        "Invalid peek duration",
        `Enter a whole number from ${MIN_PEEK_SECONDS} to ${MAX_PEEK_SECONDS} seconds.`,
      );
    }

    await peekNativeMenuBar(seconds);
    await showSuccessHUD(`SketchyBar hidden for ${seconds}s`);
  } catch (error) {
    await showErrorToast(error);
  } finally {
    await closeMainWindow();
  }
}
