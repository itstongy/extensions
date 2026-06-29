import { closeMainWindow } from "@raycast/api";
import { queryBar, setBarHidden } from "./lib/sketchybar";
import { showErrorToast, showSuccessHUD } from "./lib/ui";

export default async function Command() {
  try {
    const bar = await queryBar();
    const shouldHide = bar.hidden !== "on";
    await setBarHidden(shouldHide);
    await showSuccessHUD(shouldHide ? "SketchyBar hidden" : "SketchyBar shown");
  } catch (error) {
    await showErrorToast(error);
  } finally {
    await closeMainWindow();
  }
}
