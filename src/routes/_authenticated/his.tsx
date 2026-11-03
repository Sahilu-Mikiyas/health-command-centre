import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/hip/app-shell";

export const Route = createFileRoute("/_authenticated/his")({
  component: Page,
});

function Page() {
  return <AppShell title="his">{null}</AppShell>;
}
