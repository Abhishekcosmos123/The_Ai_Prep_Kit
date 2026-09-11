import { PageLoading, PageLoadingMark } from "@/components/ui/PageLoading";

export default function Loading() {
  return (
    <PageLoading
      label="Loading…"
      minHeightClass="min-h-[50vh]"
      icon={<PageLoadingMark />}
    />
  );
}
