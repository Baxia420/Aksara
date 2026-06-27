"use client";

import { createContext, useContext } from "react";
import type { DashboardData } from "@/lib/types";

/**
 * Holds the promise of the dashboard data created on the server in the dashboard
 * layout. The layout stays mounted while you navigate between the dashboard tabs,
 * so the data is fetched once and reused — switching tabs never refetches.
 * Client components read it with the React `use` API inside a Suspense boundary
 * (provided by app/dashboard/loading.tsx).
 */
const DashboardDataContext = createContext<Promise<DashboardData | null> | null>(
  null,
);

export function DashboardDataProvider({
  dataPromise,
  children,
}: {
  dataPromise: Promise<DashboardData | null>;
  children: React.ReactNode;
}) {
  return (
    <DashboardDataContext value={dataPromise}>{children}</DashboardDataContext>
  );
}

export function useDashboardDataPromise(): Promise<DashboardData | null> {
  const promise = useContext(DashboardDataContext);
  if (!promise) {
    throw new Error(
      "useDashboardDataPromise must be used within a DashboardDataProvider",
    );
  }
  return promise;
}
