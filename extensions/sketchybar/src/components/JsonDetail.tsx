import { Detail, List } from "@raycast/api";
import { barMarkdown } from "../lib/ui";

export function JsonDetail({ value }: { value: unknown }) {
  return <Detail markdown={barMarkdown(value)} />;
}

export function JsonListDetail({ value }: { value: unknown }) {
  return <List.Item.Detail markdown={barMarkdown(value)} />;
}
