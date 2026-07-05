import {
  LayoutDashboard, FileStack, CalendarClock, Building2, ShieldAlert,
  IdCard, Users, Map, ScrollText, ScanSearch, SlidersHorizontal, PlusCircle, ListChecks, Timer, ClipboardCheck, type LucideIcon,
} from "lucide-react";
import type { Role } from "@/domain/types";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

// Role-scoped navigation. Shared destinations appear for each role at the
// depth that role reaches them (per the wireframe sitemap, §1).
const ALL: Record<string, NavItem> = {
  dashboard: { to: "/app", label: "Dashboard", icon: LayoutDashboard },
  create: { to: "/app/create", label: "Create", icon: PlusCircle },
  applications: { to: "/app/applications", label: "Applications", icon: FileStack },
  checklist: { to: "/app/checklist", label: "Checklists", icon: ListChecks },
  committees: { to: "/app/committees", label: "Committee agenda", icon: CalendarClock },
  entities: { to: "/app/entities", label: "Entity onboarding", icon: Building2 },
  zones: { to: "/app/zones", label: "Zones & escalation", icon: Map },
  zoneaccess: { to: "/app/zone-access", label: "Zone access DB", icon: Map },
  penalties: { to: "/app/penalties", label: "Surrenders · penalties", icon: ShieldAlert },
  profile: { to: "/app/profile", label: "Entity profile", icon: IdCard },
  users: { to: "/app/users", label: "Users & roles", icon: Users },
  access: { to: "/app/access", label: "Access control", icon: SlidersHorizontal },
  validity: { to: "/app/validity", label: "Validity matrix", icon: Timer },
  status: { to: "/app/status", label: "Entity & individual status", icon: ClipboardCheck },
  audit: { to: "/app/audit", label: "Audit log", icon: ScrollText },
  verify: { to: "/app/verify", label: "Verify pass", icon: ScanSearch },
};

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [ALL.dashboard, ALL.create, ALL.applications, ALL.checklist, ALL.committees, ALL.entities, ALL.status, ALL.zones, ALL.zoneaccess, ALL.validity, ALL.penalties, ALL.users, ALL.access, ALL.audit],
  bcas: [ALL.dashboard, ALL.applications, ALL.checklist, ALL.status, ALL.zones, ALL.zoneaccess, ALL.validity, ALL.penalties, ALL.users, ALL.audit],
  operator: [ALL.dashboard, ALL.create, ALL.applications, ALL.checklist, ALL.committees, ALL.entities, ALL.status, ALL.zoneaccess, ALL.validity, ALL.users, ALL.penalties],
  cisf: [ALL.verify],
  entity: [ALL.dashboard, ALL.create, ALL.applications, ALL.checklist, ALL.entities, ALL.zones, ALL.profile],
  others: [ALL.dashboard, ALL.create, ALL.applications, ALL.checklist, ALL.profile],
  individual: [ALL.dashboard, ALL.applications, ALL.checklist],
};
