import { prisma } from "@/lib/prisma";

export const DASHBOARD_WIDGETS = [
  { id: "hero", label: "Institute Header Banner" },
  { id: "metrics", label: "Metrics Cards" },
  { id: "insights", label: "Insights Section" },
  { id: "caseMix", label: "Case Mix Section" },
  { id: "workflow", label: "Workflow Pulse Section" },
  { id: "moduleQueues", label: "Module Queue Grid" },
  { id: "operations", label: "Operations Boards" }
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGETS)[number]["id"];

export type DashboardPreferences = {
  visibleWidgets: DashboardWidgetId[];
  updatedAt: string | null;
};

function normalizeVisibleWidgets(input?: unknown): DashboardWidgetId[] {
  if (!Array.isArray(input)) return DASHBOARD_WIDGETS.map((item) => item.id);
  const allowed = new Set(DASHBOARD_WIDGETS.map((item) => item.id));
  const picked = input.filter((item): item is DashboardWidgetId => typeof item === "string" && allowed.has(item as DashboardWidgetId));
  return picked.length ? Array.from(new Set(picked)) : DASHBOARD_WIDGETS.map((item) => item.id);
}

export async function readDashboardPreferences(): Promise<DashboardPreferences> {
  try {
    const latest = await prisma.auditLog.findFirst({
      where: {
        module: "SETTINGS",
        action: "DASHBOARD_PREFERENCES_UPDATED"
      },
      orderBy: { createdAt: "desc" },
      select: { metadataJson: true, createdAt: true }
    });

    const parsed = latest?.metadataJson ? (JSON.parse(latest.metadataJson) as Partial<DashboardPreferences>) : null;
    return {
      visibleWidgets: normalizeVisibleWidgets(parsed?.visibleWidgets),
      updatedAt: typeof parsed?.updatedAt === "string" ? parsed.updatedAt : latest?.createdAt?.toISOString() || null
    };
  } catch {
    return {
      visibleWidgets: DASHBOARD_WIDGETS.map((item) => item.id),
      updatedAt: null
    };
  }
}

export async function saveDashboardPreferences(visibleWidgets: DashboardWidgetId[]) {
  const payload: DashboardPreferences = {
    visibleWidgets: normalizeVisibleWidgets(visibleWidgets),
    updatedAt: new Date().toISOString()
  };

  await prisma.auditLog.create({
    data: {
      module: "SETTINGS",
      action: "DASHBOARD_PREFERENCES_UPDATED",
      metadataJson: JSON.stringify(payload)
    }
  });

  return payload;
}
