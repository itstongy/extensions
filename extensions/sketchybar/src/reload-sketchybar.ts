import { closeMainWindow } from "@raycast/api";
import { reloadSketchyBar } from "./lib/sketchybar";
import { showErrorToast, showSuccessHUD } from "./lib/ui";

export default async function Command() {
  try {
    await reloadSketchyBar();
    await showSuccessHUD("SketchyBar reloaded");
  } catch (error) {
    await showErrorToast(error);
  } finally {
    await closeMainWindow();
  }
}
