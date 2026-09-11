import { LoadingBlock } from "@/components/ui/primitives";

/** Same spinner as the page — avoids a second, different loader after hydration. */
export default function DashboardLoading() {
  return <LoadingBlock label="Loading kits…" />;
}
