import { getDashboardData } from "@/lib/academic-data";
import { DashboardDataProvider } from "@/components/dashboard/DashboardDataProvider";
import { InstallPrompt } from "@/components/InstallPrompt";

export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Kick off the fetch on the server but do NOT await it here — awaiting would
  // block navigation (loading.tsx cannot cover a layout that reads cookies).
  // Passing the promise down lets the page read it via `use()` inside the
  // Suspense boundary, so app/dashboard/loading.tsx shows instantly on first
  // load and tab switches reuse the already-resolved promise.
  const dataPromise = getDashboardData();

  return (
    <DashboardDataProvider dataPromise={dataPromise}>
      {children}
      <InstallPrompt />
    </DashboardDataProvider>
  );
}
