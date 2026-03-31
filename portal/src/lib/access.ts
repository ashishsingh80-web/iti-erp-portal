import type { UserRole } from "@prisma/client";
import type { AuthUser } from "@/lib/auth";

export type ModuleAction = "view" | "add" | "edit" | "delete" | "approve" | "print" | "download" | "export" | "reset_password";

export const moduleActionOptions = ["view", "add", "edit", "delete", "approve", "print", "download", "export", "reset_password"] as const;

type AccessUser = Pick<
  AuthUser,
  "role" | "hasCustomModuleAccess" | "allowedModuleSlugs" | "hasCustomActionAccess" | "allowedActionKeys"
>;

const accessMatrix: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  ADMISSION_STAFF: ["dashboard", "admissions", "enquiry", "students", "promote", "alumni", "student-archive", "exam-status", "no-dues", "attendance", "inventory", "library", "timetable", "documents", "undertaking", "certificates", "id-cards", "reports", "management", "agents", "communication", "grievance", "placement"],
  DOCUMENT_VERIFIER: ["dashboard", "students", "student-archive", "exam-status", "no-dues", "attendance", "inventory", "library", "timetable", "documents", "undertaking", "certificates", "id-cards", "reports", "management", "communication", "grievance", "placement"],
  SCHOLARSHIP_DESK: ["dashboard", "students", "student-archive", "exam-status", "no-dues", "attendance", "inventory", "library", "timetable", "scholarship", "certificates", "id-cards", "reports", "management", "communication", "grievance", "placement"],
  FINANCE_DESK: ["dashboard", "students", "student-archive", "exam-status", "no-dues", "attendance", "inventory", "library", "timetable", "fees", "accounts", "certificates", "id-cards", "reports", "management", "agents", "hr", "communication", "grievance", "placement"],
  PRN_SCVT_DESK: ["dashboard", "students", "promote", "alumni", "exam-status", "no-dues", "attendance", "inventory", "library", "timetable", "scvt", "prn", "certificates", "id-cards", "reports", "management", "communication", "grievance", "placement"],
  VIEWER: ["dashboard", "students", "promote", "alumni", "student-archive", "exam-status", "no-dues", "attendance", "inventory", "library", "timetable", "certificates", "id-cards", "reports", "management", "communication", "grievance", "placement"]
};

const actionAccessMatrix: Record<UserRole, string[]> = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  ADMISSION_STAFF: [
    "dashboard:view",
    "admissions:view",
    "admissions:add",
    "enquiry:view",
    "enquiry:add",
    "enquiry:edit",
    "students:view",
    "promote:view",
    "promote:edit",
    "alumni:view",
    "alumni:edit",
    "student-archive:view",
    "student-archive:edit",
    "exam-status:view",
    "exam-status:add",
    "exam-status:edit",
    "no-dues:view",
    "no-dues:add",
    "no-dues:edit",
    "attendance:view",
    "attendance:add",
    "attendance:edit",
    "inventory:view",
    "inventory:add",
    "inventory:edit",
    "library:view",
    "library:add",
    "library:edit",
    "communication:view",
    "communication:add",
    "communication:edit",
    "grievance:view",
    "grievance:add",
    "grievance:edit",
    "placement:view",
    "placement:add",
    "placement:edit",
    "timetable:view",
    "timetable:add",
    "timetable:edit",
    "timetable:delete",
    "documents:view",
    "documents:add",
    "documents:edit",
    "undertaking:view",
    "undertaking:edit",
    "certificates:view",
    "certificates:add",
    "id-cards:view",
    "reports:view",
    "management:view",
    "agents:view",
    "agents:add",
    "agents:edit"
  ],
  DOCUMENT_VERIFIER: [
    "dashboard:view",
    "students:view",
    "student-archive:view",
    "exam-status:view",
    "no-dues:view",
    "attendance:view",
    "attendance:add",
    "attendance:edit",
    "inventory:view",
    "library:view",
    "communication:view",
    "grievance:view",
    "placement:view",
    "timetable:view",
    "documents:view",
    "documents:add",
    "documents:edit",
    "documents:delete",
    "undertaking:view",
    "undertaking:edit",
    "certificates:view",
    "id-cards:view",
    "reports:view",
    "management:view"
  ],
  SCHOLARSHIP_DESK: ["dashboard:view", "students:view", "student-archive:view", "exam-status:view", "no-dues:view", "attendance:view", "attendance:add", "attendance:edit", "inventory:view", "library:view", "communication:view", "communication:add", "grievance:view", "grievance:add", "placement:view", "placement:add", "timetable:view", "scholarship:view", "scholarship:add", "scholarship:edit", "scholarship:approve", "certificates:view", "id-cards:view", "reports:view", "management:view"],
  FINANCE_DESK: [
    "dashboard:view",
    "students:view",
    "student-archive:view",
    "exam-status:view",
    "no-dues:view",
    "no-dues:add",
    "no-dues:edit",
    "attendance:view",
    "attendance:add",
    "attendance:edit",
    "inventory:view",
    "inventory:add",
    "inventory:edit",
    "library:view",
    "library:add",
    "library:edit",
    "communication:view",
    "communication:add",
    "communication:edit",
    "grievance:view",
    "grievance:add",
    "grievance:edit",
    "placement:view",
    "placement:add",
    "placement:edit",
    "timetable:view",
    "fees:view",
    "fees:add",
    "fees:edit",
    "fees:approve",
    "accounts:view",
    "accounts:add",
    "accounts:edit",
    "accounts:delete",
    "certificates:view",
    "id-cards:view",
    "hr:view",
    "hr:add",
    "hr:edit",
    "hr:delete",
    "reports:view",
    "management:view",
    "agents:view"
  ],
  PRN_SCVT_DESK: [
    "dashboard:view",
    "students:view",
    "promote:view",
    "promote:edit",
    "alumni:view",
    "alumni:edit",
    "exam-status:view",
    "exam-status:approve",
    "no-dues:view",
    "no-dues:add",
    "no-dues:edit",
    "attendance:view",
    "attendance:add",
    "attendance:edit",
    "inventory:view",
    "library:view",
    "communication:view",
    "grievance:view",
    "placement:view",
    "timetable:view",
    "scvt:view",
    "scvt:add",
    "scvt:edit",
    "prn:view",
    "prn:add",
    "prn:edit",
    "certificates:view",
    "id-cards:view",
    "reports:view",
    "management:view"
  ],
  VIEWER: ["dashboard:view", "students:view", "promote:view", "alumni:view", "student-archive:view", "exam-status:view", "no-dues:view", "attendance:view", "inventory:view", "library:view", "communication:view", "grievance:view", "placement:view", "timetable:view", "certificates:view", "id-cards:view", "reports:view", "management:view"]
};

export function buildActionKey(moduleSlug: string, action: ModuleAction) {
  return `${moduleSlug}:${action}`;
}

function buildActionKeys(moduleSlugs: string[], actions: ModuleAction[]) {
  return moduleSlugs.flatMap((slug) => actions.map((action) => buildActionKey(slug, action)));
}

export type RolePreset = {
  key: string;
  label: string;
  description: string;
  baseRole: UserRole;
  moduleSlugs: string[];
  actionKeys: string[];
};

export const rolePresets: RolePreset[] = [
  {
    key: "SUPER_ADMIN",
    label: "Super Admin",
    description: "Full institute system control including users, settings, backup, restore, and sensitive records.",
    baseRole: "SUPER_ADMIN",
    moduleSlugs: ["*"],
    actionKeys: ["*"]
  },
  {
    key: "MANAGEMENT",
    label: "Management",
    description: "Executive visibility with reports, management dashboard, prints, downloads, and controlled approvals.",
    baseRole: "ADMIN",
    moduleSlugs: ["dashboard", "reports", "management", "certificates", "id-cards", "communication", "grievance", "placement", "backup"],
    actionKeys: [
      ...buildActionKeys(["dashboard", "reports", "management", "certificates", "id-cards", "communication", "grievance", "placement", "backup"], ["view", "print", "download", "export"]),
      ...buildActionKeys(["exam-status", "no-dues"], ["view", "approve"])
    ]
  },
  {
    key: "PRINCIPAL",
    label: "Principal",
    description: "Academic and approval authority for admissions, exams, certificates, no dues, and management review.",
    baseRole: "ADMIN",
    moduleSlugs: ["dashboard", "admissions", "students", "exam-status", "no-dues", "attendance", "timetable", "certificates", "id-cards", "reports", "management", "grievance", "placement"],
    actionKeys: [
      ...buildActionKeys(["dashboard", "admissions", "students", "exam-status", "no-dues", "attendance", "timetable", "certificates", "id-cards", "reports", "management", "grievance", "placement"], ["view"]),
      ...buildActionKeys(["exam-status", "no-dues", "certificates"], ["approve", "print", "download"]),
      ...buildActionKeys(["reports", "management"], ["export"])
    ]
  },
  {
    key: "OFFICE_ADMIN",
    label: "Office Admin",
    description: "Broad office operations with admissions, students, documents, certificates, ID cards, and workflow updates.",
    baseRole: "ADMIN",
    moduleSlugs: ["dashboard", "admissions", "enquiry", "students", "promote", "alumni", "student-archive", "documents", "undertaking", "exam-status", "no-dues", "attendance", "certificates", "id-cards", "reports", "communication", "grievance"],
    actionKeys: [
      ...buildActionKeys(["dashboard", "admissions", "enquiry", "students", "promote", "alumni", "student-archive", "documents", "undertaking", "exam-status", "no-dues", "attendance", "certificates", "id-cards", "reports", "communication", "grievance"], ["view"]),
      ...buildActionKeys(["admissions", "enquiry", "documents", "undertaking", "exam-status", "no-dues", "attendance", "certificates"], ["add", "edit"]),
      ...buildActionKeys(["certificates", "id-cards"], ["print", "download"]),
      ...buildActionKeys(["reports"], ["export"])
    ]
  },
  {
    key: "ADMISSION_DESK",
    label: "Admission Desk",
    description: "Frontline admissions and counselling operations with enquiry, admission, and student workflow access.",
    baseRole: "ADMISSION_STAFF",
    moduleSlugs: accessMatrix.ADMISSION_STAFF,
    actionKeys: actionAccessMatrix.ADMISSION_STAFF
  },
  {
    key: "ACCOUNTANT",
    label: "Accountant",
    description: "Fee, receipt, account, finance, and salary-linked desk access.",
    baseRole: "FINANCE_DESK",
    moduleSlugs: accessMatrix.FINANCE_DESK,
    actionKeys: [
      ...actionAccessMatrix.FINANCE_DESK,
      ...buildActionKeys(["fees", "accounts", "certificates", "id-cards"], ["print", "download", "export"])
    ]
  },
  {
    key: "SCHOLARSHIP_OPERATOR",
    label: "Scholarship Operator",
    description: "Scholarship verification, document checks, and reporting access.",
    baseRole: "SCHOLARSHIP_DESK",
    moduleSlugs: accessMatrix.SCHOLARSHIP_DESK,
    actionKeys: [
      ...actionAccessMatrix.SCHOLARSHIP_DESK,
      ...buildActionKeys(["scholarship"], ["approve", "download", "export"]),
      ...buildActionKeys(["reports"], ["export"])
    ]
  },
  {
    key: "EXAM_INCHARGE",
    label: "Exam Incharge",
    description: "Exam readiness, hall ticket, practical permission, and result control.",
    baseRole: "PRN_SCVT_DESK",
    moduleSlugs: ["dashboard", "students", "exam-status", "attendance", "timetable", "certificates", "reports", "management"],
    actionKeys: [
      ...buildActionKeys(["dashboard", "students", "exam-status", "attendance", "timetable", "certificates", "reports", "management"], ["view"]),
      ...buildActionKeys(["exam-status"], ["add", "edit", "approve", "download", "export"]),
      ...buildActionKeys(["certificates"], ["add", "print", "download"])
    ]
  },
  {
    key: "TRADE_INSTRUCTOR",
    label: "Trade Instructor",
    description: "Attendance, timetable, and student/exam visibility for instructional staff.",
    baseRole: "VIEWER",
    moduleSlugs: ["dashboard", "students", "attendance", "timetable", "exam-status", "reports"],
    actionKeys: [
      ...buildActionKeys(["dashboard", "students", "attendance", "timetable", "exam-status", "reports"], ["view"]),
      ...buildActionKeys(["attendance"], ["add", "edit"]),
      ...buildActionKeys(["reports"], ["download"])
    ]
  },
  {
    key: "STORE_INVENTORY",
    label: "Store / Inventory Staff",
    description: "Inventory, library, and no-dues operational access.",
    baseRole: "VIEWER",
    moduleSlugs: ["dashboard", "inventory", "library", "no-dues", "reports"],
    actionKeys: [
      ...buildActionKeys(["dashboard", "inventory", "library", "no-dues", "reports"], ["view"]),
      ...buildActionKeys(["inventory", "library", "no-dues"], ["add", "edit"]),
      ...buildActionKeys(["reports"], ["download", "export"])
    ]
  },
  {
    key: "RECEPTION",
    label: "Reception / Front Desk",
    description: "Walk-in enquiry, follow-up, and limited admission pre-entry control.",
    baseRole: "VIEWER",
    moduleSlugs: ["dashboard", "enquiry", "admissions", "students", "communication"],
    actionKeys: [
      ...buildActionKeys(["dashboard", "enquiry", "admissions", "students", "communication"], ["view"]),
      ...buildActionKeys(["enquiry"], ["add", "edit"]),
      ...buildActionKeys(["admissions"], ["add"])
    ]
  }
];

export function getRolePresetByKey(key: string) {
  return rolePresets.find((preset) => preset.key === key) || null;
}

export function canAccessModule(role: UserRole, slug: string) {
  const modules = accessMatrix[role] || [];
  return modules.includes("*") || modules.includes(slug);
}

export function getAllowedModules<T extends { slug: string }>(role: UserRole, modules: T[]): T[] {
  return modules.filter((module) => canAccessModule(role, module.slug));
}

export function canUserAccessModule(user: Pick<AuthUser, "role" | "hasCustomModuleAccess" | "allowedModuleSlugs">, slug: string) {
  if (user.hasCustomModuleAccess) {
    return user.allowedModuleSlugs.includes(slug);
  }

  return canAccessModule(user.role, slug);
}

export function getUserAllowedModules<T extends { slug: string }>(
  user: Pick<AuthUser, "role" | "hasCustomModuleAccess" | "allowedModuleSlugs">,
  modules: T[]
): T[] {
  return modules.filter((module) => canUserAccessModule(user, module.slug));
}

export function assertUserModuleAccess(
  user: Pick<AuthUser, "role" | "hasCustomModuleAccess" | "allowedModuleSlugs">,
  slug: string
) {
  if (!canUserAccessModule(user, slug)) {
    throw new Error(`Access denied for module: ${slug}`);
  }
}

export function canUserPerformAction(user: AccessUser, moduleSlug: string, action: ModuleAction) {
  const key = buildActionKey(moduleSlug, action);
  if (user.hasCustomActionAccess) {
    return user.allowedActionKeys.includes(key);
  }

  const allowedActions = actionAccessMatrix[user.role] || [];
  return allowedActions.includes("*") || allowedActions.includes(key);
}

export function assertUserActionAccess(user: AccessUser, moduleSlug: string, action: ModuleAction) {
  if (!canUserPerformAction(user, moduleSlug, action)) {
    throw new Error(`Access denied for action: ${moduleSlug}:${action}`);
  }
}
