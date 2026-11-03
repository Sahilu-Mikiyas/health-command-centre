import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/hip/app-shell";

export const Route = createFileRoute("/_authenticated/oncology")({
  component: Page,
});

function Page() {
  return <AppShell title="oncology">{null}</AppShell>;
}
