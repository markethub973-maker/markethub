"use client";

import { ProjectProvider } from "@/context/ProjectContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProjectProvider>{children}</ProjectProvider>;
}
