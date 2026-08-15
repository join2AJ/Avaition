import {
  LayoutDashboard, FileStack, CalendarClock, ShieldAlert,
  IdCard, Users, Map, ScrollText, ScanSearch, PlusCircle, Timer, ClipboardCheck, FileSignature, Gauge, Ban, Info, Bell, Database, TerminalSquare, Boxes, type LucideIcon,
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
  compliance: { to: "/app/compliance", label: "Compliance & insights", icon: Gauge },
  create: { to: "/app/create", label: "Create", icon: PlusCircle },
  applications: { to: "/app/applications", label: "Applications", icon: FileStack },
  material: { to: "/app/tot", label: "ToT", icon: Boxes },
  committees: { to: "/app/committees", label: "Committee agenda", icon: CalendarClock },
  contracts: { to: "/app/contracts", label: "Contracts", icon: FileSignature },
  zoneaccess: { to: "/app/zone-access", label: "Zone access DB", icon: Map },
  penalties: { to: "/app/penalties", label: "Surrenders · penalties", icon: ShieldAlert },
  stoplist: { to: "/app/stop-list", label: "Stop List", icon: Ban },
  profile: { to: "/app/profile", label: "Entity profile", icon: IdCard },
  users: { to: "/app/users", label: "Users & roles", icon: Users },
  validity: { to: "/app/validity", label: "Validity matrix", icon: Timer },
  status: { to: "/app/status", label: "Entity & individual status", icon: ClipboardCheck },
  notifications: { to: "/app/notifications", label: "Notifications", icon: Bell },
  information: { to: "/app/information", label: "Information", icon: Info },
  audit: { to: "/app/audit", label: "Audit log", icon: ScrollText },
  verify: { to: "/app/verify", label: "Verify pass", icon: ScanSearch },
  database: { to: "/app/database", label: "Database schema", icon: Database },
  sql: { to: "/app/sql", label: "SQL console", icon: TerminalSquare },
};

/** Every distinct navigable destination (for the Admin access-control matrix). */
export const NAV_CATALOG: NavItem[] = Object.values(ALL);

// ---- Grouped navigation (top-bar menus) -----------------------------------
// The flat list is bucketed into a handful of labelled menus so the top nav
// stays organised instead of showing 16 items at once.
export interface NavGroup { label: string; items: NavItem[]; }
const NAV_GROUPS: { label: string; keys: string[] }[] = [
  { label: "Overview", keys: ["dashboard", "compliance"] },
  { label: "Processing", keys: ["create", "applications", "material", "committees", "verify"] },
  { label: "Registry", keys: ["contracts", "status", "zoneaccess", "validity", "profile"] },
  { label: "Compliance", keys: ["penalties", "stoplist", "notifications", "information"] },
  { label: "Administration", keys: ["users", "database", "sql", "audit"] },
];
const PATH_GROUP_INDEX: Record<string, number> = {};
NAV_GROUPS.forEach((g, i) => g.keys.forEach((k) => { if (ALL[k]) PATH_GROUP_INDEX[ALL[k].to] = i; }));

/** Bucket a role's (already access-filtered) nav items into ordered menus,
 *  dropping empty menus. Anything unmapped falls into a trailing "More". */
export function groupNavItems(items: NavItem[]): NavGroup[] {
  const buckets: NavItem[][] = NAV_GROUPS.map(() => []);
  const extra: NavItem[] = [];
  for (const it of items) {
    const gi = PATH_GROUP_INDEX[it.to];
    if (gi === undefined) extra.push(it); else buckets[gi].push(it);
  }
  const groups: NavGroup[] = NAV_GROUPS
    .map((g, i) => ({ label: g.label, items: buckets[i] }))
    .filter((g) => g.items.length > 0);
  if (extra.length) groups.push({ label: "More", items: extra });
  return groups;
}

/** Sub-tabs inside a page, keyed by the parent nav path. The Admin access-control
 *  matrix can hide any of these per login for finer control. A hidden sub-tab is
 *  stored as `${parentPath}#${subKey}` in the same navHidden map. */
export const SUBTABS: Record<string, { key: string; label: string }[]> = {
  "/app/create": [
    { key: "pass", label: "Raise a Pass" },
    { key: "onboard", label: "Onboard entity" },
  ],
  "/app/information": [
    { key: "checklist", label: "Checklists" },
    { key: "zones", label: "Zones & escalation" },
  ],
  "/app/zone-access": [
    { key: "entity", label: "Entity-wise zones" },
    { key: "role", label: "Role-wise zones" },
    { key: "history", label: "History & escalations" },
  ],
  "/app/users": [
    { key: "roles", label: "Roles & permissions" },
    { key: "requirements", label: "Requirements basis" },
    { key: "access", label: "Access control" },
  ],
};

/** Composite key stored in navHidden for a hidden sub-tab. */
export const subTabKey = (parentPath: string, subKey: string) => `${parentPath}#${subKey}`;

/** Home path for a role (first nav item). */
export function homeFor(role: Role): string {
  return NAV_BY_ROLE[role]?.[0]?.to ?? "/app";
}

/** Route authorization: a role may only reach the pages in its nav (matched by
 *  prefix so detail routes like /app/applications/:id are covered). */
export function canAccess(role: Role, path: string): boolean {
  const allowed = NAV_BY_ROLE[role]?.map((i) => i.to) ?? [];
  return allowed.some((base) => (base === "/app" ? path === "/app" : path === base || path.startsWith(base + "/")));
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  admin: [ALL.dashboard, ALL.compliance, ALL.create, ALL.applications, ALL.material, ALL.committees, ALL.contracts, ALL.status, ALL.zoneaccess, ALL.validity, ALL.penalties, ALL.stoplist, ALL.notifications, ALL.information, ALL.users, ALL.database, ALL.sql, ALL.audit],
  bcas: [ALL.dashboard, ALL.compliance, ALL.applications, ALL.material, ALL.contracts, ALL.status, ALL.zoneaccess, ALL.validity, ALL.penalties, ALL.stoplist, ALL.notifications, ALL.information, ALL.users, ALL.audit],
  operator: [ALL.dashboard, ALL.compliance, ALL.create, ALL.applications, ALL.material, ALL.committees, ALL.contracts, ALL.status, ALL.zoneaccess, ALL.validity, ALL.penalties, ALL.stoplist, ALL.notifications, ALL.information, ALL.users],
  cisf: [ALL.verify],
  entity: [ALL.dashboard, ALL.create, ALL.applications, ALL.material, ALL.contracts, ALL.notifications, ALL.information, ALL.profile],
  others: [ALL.dashboard, ALL.create, ALL.applications, ALL.material, ALL.contracts, ALL.notifications, ALL.information, ALL.profile],
  individual: [ALL.dashboard, ALL.applications, ALL.notifications, ALL.information],
};
