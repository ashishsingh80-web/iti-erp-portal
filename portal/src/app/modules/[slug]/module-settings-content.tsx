import { AuditLogPanel } from "@/components/audit/audit-log-panel";
import { DashboardPreferencesPanel } from "@/components/settings/dashboard-preferences-panel";
import { AddressMasterPanel } from "@/components/settings/address-master-panel";
import { ClassificationMastersPanel } from "@/components/settings/classification-masters-panel";
import { ExpandableSettingsSection } from "@/components/settings/expandable-settings-section";
import { FinanceComplianceMastersPanel } from "@/components/settings/finance-compliance-masters-panel";
import { InstituteBrandingPanel } from "@/components/settings/institute-branding-panel";
import { InstituteMasterPanel } from "@/components/settings/institute-master-panel";
import { MasterControlPanel } from "@/components/settings/master-control-panel";
import { NumberingControlPanel } from "@/components/settings/numbering-control-panel";
import { RecycleBinPanel } from "@/components/settings/recycle-bin-panel";
import { SettingsQuickNav } from "@/components/settings/settings-quick-nav";
import { SessionControlPanel } from "@/components/settings/session-control-panel";
import { UndertakingTemplatePanel } from "@/components/settings/undertaking-template-panel";
import { UserManagementPanel } from "@/components/settings/user-management-panel";
import type { AuthUser } from "@/lib/auth";

export function ModuleSettingsContent({ user }: { user: AuthUser }) {
  if (!["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    return null;
  }

  return (
    <div className="grid gap-6">
      <SettingsQuickNav />

      <div id="settings-master-control">
        <ExpandableSettingsSection
          badges={[
            { label: "Master overview", tone: "success" },
            { label: "Expand master map", tone: "neutral" }
          ]}
          defaultOpen
          description="See the institute setup map, live masters, and remaining setup areas in one expandable control block."
          eyebrow="Master Control"
          title="Institute Setup Overview"
        >
          <MasterControlPanel />
          <DashboardPreferencesPanel />
        </ExpandableSettingsSection>
      </div>

      <div id="settings-institute-academic">
        <ExpandableSettingsSection
          badges={[
            { label: "Institute master live", tone: "success" },
            { label: "Session master live", tone: "success" },
            { label: "Unit / shift live", tone: "success" }
          ]}
          defaultOpen
          description="Institute identity, affiliation-linked codes, trade master, academic session, and working academic structure in one expandable section."
          eyebrow="Section 1"
          title="Institute & Academic Setup"
        >
          <div className="grid gap-6">
            <InstituteMasterPanel />
            <InstituteBrandingPanel />
            <SessionControlPanel />
            <ClassificationMastersPanel />
            <FinanceComplianceMastersPanel />
          </div>
        </ExpandableSettingsSection>
      </div>

      <div id="settings-geography-finance">
        <ExpandableSettingsSection
          badges={[
            { label: "Address master live", tone: "success" },
            { label: "Numbering live", tone: "success" },
            { label: "Template live", tone: "success" }
          ]}
          description="Location masters, numbering control, and print-template setup that support admissions, fees, and document generation."
          eyebrow="Section 2"
          title="Geography, Finance & Templates"
        >
          <div className="grid gap-6">
            <AddressMasterPanel />
            <NumberingControlPanel />
            <UndertakingTemplatePanel />
          </div>
        </ExpandableSettingsSection>
      </div>

      <div id="settings-security-admin">
        <ExpandableSettingsSection
          badges={[
            { label: "Users live", tone: "success" },
            { label: "Recycle bin live", tone: "success" },
            { label: "Audit live", tone: "success" }
          ]}
          description="User access, recovery, and audit controls for safe institute operations."
          eyebrow="Section 3"
          title="Security & Administration"
        >
          <div className="grid gap-6">
            <UserManagementPanel />
            <RecycleBinPanel />
            <AuditLogPanel />
          </div>
        </ExpandableSettingsSection>
      </div>
    </div>
  );
}
