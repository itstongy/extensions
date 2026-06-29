# SketchyBar

Control and troubleshoot [SketchyBar](https://github.com/FelixKratz/SketchyBar) from Raycast.

This extension uses SketchyBar's public command-line interface. It does not depend on any user-specific shell scripts or configuration layout beyond the configured SketchyBar executable and optional config file path.

## Requirements

- macOS
- SketchyBar installed and running
- SketchyBar executable available at `/opt/homebrew/bin/sketchybar`, or configured in extension preferences

## Commands

| Command | Description |
| --- | --- |
| Configure | Open the configured SketchyBar file in an editor, reveal config folders, reload SketchyBar, and inspect live items/events. |
| Peek Menu Bar | Temporarily hides SketchyBar so the native macOS menu bar is accessible, then restores SketchyBar after the configured duration. Use this when SketchyBar covers menu bar items you need to click. |
| Toggle Visibility | Shows or hides SketchyBar. |
| Reload | Reloads SketchyBar. If a config path is set in preferences, that file is passed to `sketchybar --reload`; otherwise SketchyBar resolves its own config. |
| Diagnostics | Checks the SketchyBar binary, config file, live bar query, and event query. |

## Preferences

| Preference | Default | Description |
| --- | --- | --- |
| SketchyBar Path | `/opt/homebrew/bin/sketchybar` | Full path to the SketchyBar executable. |
| Config File | `~/.config/sketchybar/sketchybarrc` | Optional config file used for opening from Raycast and, when explicitly set, reloads. |
| Default Peek Duration | `30` | How long SketchyBar stays hidden during a menu bar peek. |
| Restore Previous Hidden State | Enabled | Restores SketchyBar to whatever hidden or visible state it had before the peek started. |

## Notes

- Runtime actions such as hiding the bar or hiding an item are immediate SketchyBar CLI changes.
- **Peek Menu Bar** schedules the restore in the background, so SketchyBar is restored even after Raycast closes. If the restore preference is disabled, peeking always shows SketchyBar afterwards.
- The **Configure** command can open the configured SketchyBar file in your editor, reveal it in Finder, open the config and plugins folders, and reload SketchyBar after edits.
- If your SketchyBar config sets different values, reloading SketchyBar will apply your config again.
- The extension only offers to open an item script when the script command contains an absolute file path. SketchyBar scripts can be shell snippets, environment-variable paths, or command strings, and those are intentionally not opened as files.

## Troubleshooting

Open **Diagnostics** first. It reports the most common setup issues:

- SketchyBar binary missing or not executable
- Config file path not readable
- SketchyBar not responding to `--query bar`
- Event query failures

If SketchyBar is installed somewhere else, update **SketchyBar Path** in Raycast preferences.
