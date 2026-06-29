import { Detail, List } from "@raycast/api";
import { itemMarkdown } from "../lib/ui";
import type { SketchyBarItem } from "../lib/types";

export function ItemDetail({ item }: { item: SketchyBarItem }) {
  return <Detail markdown={itemMarkdown(item)} />;
}

export function ItemListDetail({ item }: { item: SketchyBarItem }) {
  return <List.Item.Detail markdown={itemMarkdown(item)} />;
}
