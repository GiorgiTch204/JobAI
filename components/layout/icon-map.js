"use client";

import {
  Activity,
  Bookmark,
  Briefcase,
  ChartColumn,
  FileText,
  LayoutDashboard,
  Send,
  Settings,
  Upload,
  Users,
} from "lucide-react";

/** Name -> component, resolved on the client side of the boundary. */
export const NAV_ICONS = {
  dashboard: LayoutDashboard,
  jobs: Briefcase,
  applications: Send,
  saved: Bookmark,
  cv: FileText,
  upload: Upload,
  settings: Settings,
  chart: ChartColumn,
  users: Users,
  activity: Activity,
};
