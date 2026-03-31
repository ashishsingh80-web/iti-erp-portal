"use client";

import { useEffect, useState } from "react";
import { buildActionKey, getRolePresetByKey, moduleActionOptions, rolePresets, type RolePreset } from "@/lib/access";
import { formatEnumLabel } from "@/lib/display";
import { portalModules } from "@/lib/module-config";
import { showToast } from "@/lib/toast";
import { SkeletonBlock } from "@/components/ui/skeleton-block";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { UserLoginHistoryDialog } from "@/components/settings/user-login-history-dialog";

type ManagedUser = {
  id: string;
  name: string;
  email: string;
  rolePreset?: string;
  role: string;
  isActive: boolean;
  hasCustomModuleAccess: boolean;
  allowedModuleSlugs: string[];
  hasCustomActionAccess: boolean;
  allowedActionKeys: string[];
};

type LoginHistoryRow = {
  id: string;
  eventType: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  deviceLabel: string;
  createdAt: string;
};

type LoginLockState = {
  failedAttempts: number;
  lockedUntil: string | null;
  lockType?: "AUTO" | "MANUAL";
  reason?: string | null;
  updatedAt: string;
};

type UserAuditRow = {
  id: string;
  createdAt: string;
  module: string;
  action: string;
  userName: string;
  userEmail: string;
  metadata: {
    targetUserId?: string;
    targetUserEmail?: string;
    createdUserId?: string;
    createdUserEmail?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    passwordChanged?: boolean;
    reason?: string | null;
    removedCount?: number;
    unlocked?: boolean;
    locked?: boolean;
  } | null;
};

const actionOptions = moduleActionOptions;

function SettingsDisclosure({
  title,
  description,
  defaultOpen = false,
  children
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details className="mt-8 rounded-3xl border border-slate-100 bg-white p-5" open={defaultOpen}>
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">{title}</h4>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
          <span className="chip-neutral">Click to expand</span>
        </div>
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

export function UserManagementPanel() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryRow[]>([]);
  const [loginLockouts, setLoginLockouts] = useState<Record<string, LoginLockState>>({});
  const [userAuditRows, setUserAuditRows] = useState<UserAuditRow[]>([]);
  const [customRolePresets, setCustomRolePresets] = useState<RolePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loginHistorySearch, setLoginHistorySearch] = useState("");
  const [loginEventFilter, setLoginEventFilter] = useState("");
  const [form, setForm] = useState({
    rolePreset: "ADMISSION_DESK",
    name: "",
    email: "",
    password: "",
    role: "ADMISSION_STAFF",
    hasCustomModuleAccess: false,
    allowedModuleSlugs: [] as string[],
    hasCustomActionAccess: false,
    allowedActionKeys: [] as string[]
  });
  const [customRoleForm, setCustomRoleForm] = useState({
    key: "",
    label: "",
    description: "",
    baseRole: "ADMISSION_STAFF",
    moduleSlugs: [] as string[],
    actionKeys: [] as string[]
  });

  const availableRolePresets = [...rolePresets, ...customRolePresets];

  function matchesPreset(user: ManagedUser, preset: RolePreset) {
    const presetModules = preset.moduleSlugs[0] === "*" ? [] : [...preset.moduleSlugs].sort();
    const presetActions = preset.actionKeys[0] === "*" ? [] : [...preset.actionKeys].sort();
    const userModules = [...user.allowedModuleSlugs].sort();
    const userActions = [...user.allowedActionKeys].sort();

    return (
      user.role === preset.baseRole &&
      user.hasCustomModuleAccess === (preset.moduleSlugs[0] !== "*") &&
      user.hasCustomActionAccess === (preset.actionKeys[0] !== "*") &&
      JSON.stringify(userModules) === JSON.stringify(presetModules) &&
      JSON.stringify(userActions) === JSON.stringify(presetActions)
    );
  }

  function applyPreset(presetKey: string) {
    const preset = availableRolePresets.find((item) => item.key === presetKey) || getRolePresetByKey(presetKey);
    if (!preset) return;
    setForm((current) => ({
      ...current,
      rolePreset: preset.key,
      role: preset.baseRole,
      hasCustomModuleAccess: preset.moduleSlugs[0] !== "*",
      allowedModuleSlugs: preset.moduleSlugs[0] === "*" ? [] : [...preset.moduleSlugs],
      hasCustomActionAccess: preset.actionKeys[0] !== "*",
      allowedActionKeys: preset.actionKeys[0] === "*" ? [] : [...preset.actionKeys]
    }));
  }

  async function loadUsers() {
    setLoading(true);
    const [usersResponse, historyResponse, auditResponse, customPresetsResponse] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/users/login-history"),
      fetch("/api/audit?module=USER_MANAGEMENT"),
      fetch("/api/users/role-presets")
    ]);
    const result = await usersResponse.json();
    const historyResult = await historyResponse.json().catch(() => ({ rows: [], lockouts: {} }));
    const auditResult = await auditResponse.json().catch(() => ({ rows: [] }));
    const customPresetsResult = await customPresetsResponse.json().catch(() => ({ presets: [] }));

    if (!usersResponse.ok) {
      setError(result?.message || "Unable to load users");
      setLoading(false);
      return;
    }

    setUsers(
      Array.isArray(result.users)
        ? result.users.map((user: Record<string, unknown>) => ({
            id: String(user.id || ""),
            name: String(user.name || ""),
            email: String(user.email || ""),
            rolePreset: "",
            role: String(user.role || "VIEWER"),
            isActive: Boolean(user.isActive),
            hasCustomModuleAccess: Boolean(user.hasCustomModuleAccess),
            allowedModuleSlugs: Array.isArray(user.allowedModuleSlugs)
              ? user.allowedModuleSlugs.map((item: unknown) => String(item))
              : [],
            hasCustomActionAccess: Boolean(user.hasCustomActionAccess),
            allowedActionKeys: Array.isArray(user.allowedActionKeys)
              ? user.allowedActionKeys.map((item: unknown) => String(item))
              : []
          }))
        : []
    );
    setLoginHistory(Array.isArray(historyResult.rows) ? (historyResult.rows as LoginHistoryRow[]) : []);
    setLoginLockouts(
      historyResult.lockouts && typeof historyResult.lockouts === "object"
        ? (historyResult.lockouts as Record<string, LoginLockState>)
        : {}
    );
    setUserAuditRows(Array.isArray(auditResult.rows) ? (auditResult.rows as UserAuditRow[]) : []);
    setCustomRolePresets(
      Array.isArray(customPresetsResult.presets)
        ? (customPresetsResult.presets as RolePreset[]).map((item) => ({
            ...item,
            moduleSlugs: Array.isArray(item.moduleSlugs) ? item.moduleSlugs : [],
            actionKeys: Array.isArray(item.actionKeys) ? item.actionKeys : []
          }))
        : []
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const search = userSearch.trim().toLowerCase();
    const matchesSearch =
      !search ||
      user.name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.role.toLowerCase().includes(search);
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus =
      !statusFilter || (statusFilter === "ACTIVE" ? user.isActive : statusFilter === "INACTIVE" ? !user.isActive : true);
    return matchesSearch && matchesRole && matchesStatus;
  });

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId("");
      return;
    }

    if (!selectedUserId || !filteredUsers.some((user) => user.id === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) || null;
  const selectedUserLoginInsight = selectedUser ? getUserLoginInsights(selectedUser) : null;

  const summary = {
    total: users.length,
    active: users.filter((user) => user.isActive).length,
    inactive: users.filter((user) => !user.isActive).length,
    customAccess: users.filter((user) => user.hasCustomModuleAccess || user.hasCustomActionAccess).length,
    failedLogins: loginHistory.filter((item) => item.eventType === "LOGIN_FAILED").length
  };

  function getUserLoginInsights(user: ManagedUser) {
    const lockState = loginLockouts[user.email.toLowerCase()] || null;
    const rows = loginHistory.filter((item) => item.userEmail.toLowerCase() === user.email.toLowerCase());
    const lastSuccess = rows.find((item) => item.eventType === "LOGIN_SUCCESS") || null;
    const failedAttempts = rows.filter((item) => item.eventType === "LOGIN_FAILED").length;
    return {
      lastSuccess,
      failedAttempts,
      lockState,
      isLocked: Boolean(lockState?.lockedUntil && new Date(lockState.lockedUntil).getTime() > Date.now())
    };
  }

  const securityWatchlist = users
    .map((user) => {
      const insight = getUserLoginInsights(user);
      return {
        user,
        lastSuccess: insight.lastSuccess,
        failedAttempts: insight.failedAttempts,
        neverLoggedIn: !insight.lastSuccess,
        lockState: insight.lockState,
        isLocked: insight.isLocked
      };
    })
    .filter((item) => item.failedAttempts >= 3 || item.neverLoggedIn || item.isLocked)
    .sort((left, right) => Number(right.isLocked) - Number(left.isLocked) || right.failedAttempts - left.failedAttempts)
    .slice(0, 12);

  const lockedAccounts = users
    .map((user) => {
      const insight = getUserLoginInsights(user);
      return {
        user,
        failedAttempts: insight.failedAttempts,
        lastSuccess: insight.lastSuccess,
        lockState: insight.lockState,
        isLocked: insight.isLocked
      };
    })
    .filter((item) => item.isLocked)
    .sort((left, right) => {
      const leftExpiry = left.lockState?.lockedUntil ? new Date(left.lockState.lockedUntil).getTime() : 0;
      const rightExpiry = right.lockState?.lockedUntil ? new Date(right.lockState.lockedUntil).getTime() : 0;
      return rightExpiry - leftExpiry;
    });

  const dormantAccounts = users
    .map((user) => {
      const insight = getUserLoginInsights(user);
      const lastLoginAt = insight.lastSuccess ? new Date(insight.lastSuccess.createdAt).getTime() : 0;
      const dormantDays = lastLoginAt ? Math.floor((Date.now() - lastLoginAt) / (1000 * 60 * 60 * 24)) : null;
      return {
        user,
        lastSuccess: insight.lastSuccess,
        failedAttempts: insight.failedAttempts,
        isLocked: insight.isLocked,
        dormantDays,
        neverLoggedIn: !insight.lastSuccess
      };
    })
    .filter((item) => item.user.isActive && (item.neverLoggedIn || (item.dormantDays !== null && item.dormantDays >= 30)))
    .sort((left, right) => {
      const leftDormancy = left.neverLoggedIn ? Number.MAX_SAFE_INTEGER : left.dormantDays || 0;
      const rightDormancy = right.neverLoggedIn ? Number.MAX_SAFE_INTEGER : right.dormantDays || 0;
      return rightDormancy - leftDormancy;
    });

  const customRoleUsage = customRolePresets.map((preset) => ({
    presetKey: preset.key,
    count: users.filter((user) => matchesPreset(user, preset)).length
  }));

  const filteredLoginHistory = loginHistory.filter((item) => {
    const search = loginHistorySearch.trim().toLowerCase();
    const matchesSearch =
      !search ||
      item.userName.toLowerCase().includes(search) ||
      item.userEmail.toLowerCase().includes(search) ||
      item.userRole.toLowerCase().includes(search) ||
      item.ipAddress.toLowerCase().includes(search) ||
      item.deviceLabel.toLowerCase().includes(search) ||
      item.userAgent.toLowerCase().includes(search);
    const matchesEvent = !loginEventFilter || item.eventType === loginEventFilter;
    return matchesSearch && matchesEvent;
  });

  const lockActivityRows = userAuditRows.filter((row) =>
    ["LOCK_USER_LOGIN", "UNLOCK_USER_LOGIN", "CLEAR_FAILED_LOGIN_ATTEMPTS"].includes(row.action)
  );

  function exportUsersCsv() {
    const csv = [
      ["Name", "Email", "Role", "Status", "Custom Module Access", "Custom Action Access", "Allowed Modules", "Allowed Actions"],
      ...filteredUsers.map((user) => [
        user.name,
        user.email,
        user.role,
        user.isActive ? "ACTIVE" : "INACTIVE",
        user.hasCustomModuleAccess ? "YES" : "NO",
        user.hasCustomActionAccess ? "YES" : "NO",
        user.allowedModuleSlugs.join(" | "),
        user.allowedActionKeys.join(" | ")
      ])
    ]
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "user-management-register.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportLockActivityCsv() {
    const csv = [
      ["When", "Actor", "Action", "Target Email", "Reason", "Removed Count", "Unlocked", "Locked"],
      ...lockActivityRows.map((row) => [
        row.createdAt,
        row.userName || row.userEmail || "System",
        row.action,
        String(row.metadata?.targetUserEmail || ""),
        String(row.metadata?.reason || ""),
        String(row.metadata?.removedCount || 0),
        String(Boolean(row.metadata?.unlocked)),
        String(Boolean(row.metadata?.locked))
      ])
    ]
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "login-lock-activity.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportCustomRolesCsv() {
    const csv = [
      ["Role", "Base Role", "Users", "Modules", "Actions", "Updated", "Description"],
      ...customRolePresets.map((preset) => [
        preset.label,
        preset.baseRole,
        String(customRoleUsage.find((item) => item.presetKey === preset.key)?.count || 0),
        String(preset.moduleSlugs.length),
        String(preset.actionKeys.length),
        String(("updatedAt" in preset && (preset as { updatedAt?: string }).updatedAt) || ""),
        preset.description
      ])
    ]
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "custom-role-register.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportDormantAccountsCsv() {
    const csv = [
      ["Name", "Email", "Role", "Last Login", "Dormant Days", "Failed Attempts", "Locked", "Status"],
      ...dormantAccounts.map((item) => [
        item.user.name,
        item.user.email,
        item.user.role,
        item.lastSuccess?.createdAt || "Never",
        item.neverLoggedIn ? "Never Logged In" : String(item.dormantDays || 0),
        String(item.failedAttempts),
        item.isLocked ? "YES" : "NO",
        item.user.isActive ? "ACTIVE" : "INACTIVE"
      ])
    ]
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "dormant-accounts-register.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function toggleCustomRoleModule(slug: string) {
    setCustomRoleForm((current) => ({
      ...current,
      moduleSlugs: current.moduleSlugs.includes(slug)
        ? current.moduleSlugs.filter((item) => item !== slug)
        : [...current.moduleSlugs, slug]
    }));
  }

  function selectAllFormModules() {
    setForm((current) => ({ ...current, allowedModuleSlugs: portalModules.map((module) => module.slug) }));
  }

  function clearAllFormModules() {
    setForm((current) => ({ ...current, allowedModuleSlugs: [] }));
  }

  function selectAllFormActions() {
    setForm((current) => ({
      ...current,
      allowedActionKeys: portalModules.flatMap((module) => actionOptions.map((action) => buildActionKey(module.slug, action)))
    }));
  }

  function clearAllFormActions() {
    setForm((current) => ({ ...current, allowedActionKeys: [] }));
  }

  function selectAllFormActionsForModule(moduleSlug: string) {
    setForm((current) => ({
      ...current,
      allowedActionKeys: Array.from(new Set([...current.allowedActionKeys, ...actionOptions.map((action) => buildActionKey(moduleSlug, action))]))
    }));
  }

  function clearAllFormActionsForModule(moduleSlug: string) {
    setForm((current) => ({
      ...current,
      allowedActionKeys: current.allowedActionKeys.filter((key) => !key.startsWith(`${moduleSlug}:`))
    }));
  }

  function toggleCustomRoleAction(moduleSlug: string, action: (typeof actionOptions)[number]) {
    const key = buildActionKey(moduleSlug, action);
    setCustomRoleForm((current) => ({
      ...current,
      actionKeys: current.actionKeys.includes(key)
        ? current.actionKeys.filter((item) => item !== key)
        : [...current.actionKeys, key]
    }));
  }

  async function createCustomRolePreset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const isEditing = Boolean(customRoleForm.key);
    const response = await fetch("/api/users/role-presets", {
      method: isEditing ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(customRoleForm)
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({
        kind: "error",
        title: isEditing ? "Custom role not updated" : "Custom role not created",
        message: result?.message || `Unable to ${isEditing ? "update" : "create"} custom role preset.`
      });
      return;
    }

    showToast({
      kind: "success",
      title: isEditing ? "Custom role updated" : "Custom role created",
      message: `${result.preset?.label || "Role preset"} is ready to use.`
    });
    setCustomRoleForm({
      key: "",
      label: "",
      description: "",
      baseRole: "ADMISSION_STAFF",
      moduleSlugs: [],
      actionKeys: []
    });
    await loadUsers();
  }

  function startEditingCustomRole(preset: RolePreset) {
    setCustomRoleForm({
      key: preset.key,
      label: preset.label,
      description: preset.description,
      baseRole: preset.baseRole,
      moduleSlugs: [...preset.moduleSlugs],
      actionKeys: [...preset.actionKeys]
    });
  }

  function cancelEditingCustomRole() {
    setCustomRoleForm({
      key: "",
      label: "",
      description: "",
      baseRole: "ADMISSION_STAFF",
      moduleSlugs: [],
      actionKeys: []
    });
  }

  async function deleteCustomRolePreset(preset: RolePreset) {
    const usageCount = customRoleUsage.find((item) => item.presetKey === preset.key)?.count || 0;
    if (usageCount > 0) {
      showToast({
        kind: "error",
        title: "Role still in use",
        message: `${preset.label} currently matches ${usageCount} user account(s). Update those users before deleting the role.`
      });
      return;
    }

    const confirmDelete = window.confirm(`Delete custom role "${preset.label}"?`);
    if (!confirmDelete) return;

    const response = await fetch("/api/users/role-presets", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ key: preset.key })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({
        kind: "error",
        title: "Custom role not deleted",
        message: result?.message || "Unable to delete custom role preset."
      });
      return;
    }

    showToast({
      kind: "success",
      title: "Custom role deleted",
      message: `${preset.label} was removed.`
    });
    await loadUsers();
  }

  function exportLockedAccountsCsv() {
    const csv = [
      ["Name", "Email", "Role", "Lock Type", "Reason", "Failed Attempts", "Locked Until", "Last Login", "Status"],
      ...lockedAccounts.map((item) => [
        item.user.name,
        item.user.email,
        item.user.role,
        item.lockState?.lockType === "MANUAL" ? "MANUAL" : "AUTO",
        item.lockState?.reason || "",
        item.failedAttempts,
        item.lockState?.lockedUntil || "",
        item.lastSuccess?.createdAt || "",
        item.user.isActive ? "ACTIVE" : "INACTIVE"
      ])
    ]
      .map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "locked-accounts-register.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleCreateUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const response = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(form)
    });

    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to create user";
      setError(nextError);
      showToast({ kind: "error", title: "User not created", message: nextError });
      return;
    }

    setUsers((current) => [
      {
        id: String(result.user.id || ""),
        name: String(result.user.name || ""),
        email: String(result.user.email || ""),
        rolePreset: "",
        role: String(result.user.role || "VIEWER"),
        isActive: Boolean(result.user.isActive),
        hasCustomModuleAccess: Boolean(result.user.hasCustomModuleAccess),
        allowedModuleSlugs: Array.isArray(result.user.allowedModuleSlugs)
          ? result.user.allowedModuleSlugs.map((item: unknown) => String(item))
          : [],
        hasCustomActionAccess: Boolean(result.user.hasCustomActionAccess),
        allowedActionKeys: Array.isArray(result.user.allowedActionKeys)
          ? result.user.allowedActionKeys.map((item: unknown) => String(item))
          : []
      },
      ...current
    ]);
    setForm({
      rolePreset: "ADMISSION_DESK",
      name: "",
      email: "",
      password: "",
      role: "ADMISSION_STAFF",
      hasCustomModuleAccess: false,
      allowedModuleSlugs: [],
      hasCustomActionAccess: false,
      allowedActionKeys: []
    });
    setMessage("User created successfully");
    showToast({ kind: "success", title: "User created", message: String(result.user.name || "") });
  }

  function toggleFormModule(slug: string) {
    setForm((current) => ({
      ...current,
      allowedModuleSlugs: current.allowedModuleSlugs.includes(slug)
        ? current.allowedModuleSlugs.filter((item) => item !== slug)
        : [...current.allowedModuleSlugs, slug]
    }));
  }

  function selectAllCustomRoleModules() {
    setCustomRoleForm((current) => ({ ...current, moduleSlugs: portalModules.map((module) => module.slug) }));
  }

  function clearAllCustomRoleModules() {
    setCustomRoleForm((current) => ({ ...current, moduleSlugs: [] }));
  }

  function selectAllCustomRoleActions() {
    setCustomRoleForm((current) => ({
      ...current,
      actionKeys: portalModules.flatMap((module) => actionOptions.map((action) => buildActionKey(module.slug, action)))
    }));
  }

  function clearAllCustomRoleActions() {
    setCustomRoleForm((current) => ({ ...current, actionKeys: [] }));
  }

  function selectAllCustomRoleActionsForModule(moduleSlug: string) {
    setCustomRoleForm((current) => ({
      ...current,
      actionKeys: Array.from(new Set([...current.actionKeys, ...actionOptions.map((action) => buildActionKey(moduleSlug, action))]))
    }));
  }

  function clearAllCustomRoleActionsForModule(moduleSlug: string) {
    setCustomRoleForm((current) => ({
      ...current,
      actionKeys: current.actionKeys.filter((key) => !key.startsWith(`${moduleSlug}:`))
    }));
  }

  function toggleUserModule(userId: string, slug: string) {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              allowedModuleSlugs: user.allowedModuleSlugs.includes(slug)
                ? user.allowedModuleSlugs.filter((item) => item !== slug)
                : [...user.allowedModuleSlugs, slug]
            }
          : user
      )
    );
  }

  function selectAllUserModules(userId: string) {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              allowedModuleSlugs: portalModules.map((module) => module.slug)
            }
          : user
      )
    );
  }

  function clearAllUserModules(userId: string) {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, allowedModuleSlugs: [] } : user)));
  }

  function toggleFormAction(moduleSlug: string, action: (typeof actionOptions)[number]) {
    const key = buildActionKey(moduleSlug, action);
    setForm((current) => ({
      ...current,
      allowedActionKeys: current.allowedActionKeys.includes(key)
        ? current.allowedActionKeys.filter((item) => item !== key)
        : [...current.allowedActionKeys, key]
    }));
  }

  function toggleUserAction(userId: string, moduleSlug: string, action: (typeof actionOptions)[number]) {
    const key = buildActionKey(moduleSlug, action);
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              allowedActionKeys: user.allowedActionKeys.includes(key)
                ? user.allowedActionKeys.filter((item) => item !== key)
                : [...user.allowedActionKeys, key]
            }
          : user
      )
    );
  }

  function selectAllUserActions(userId: string) {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              allowedActionKeys: portalModules.flatMap((module) => actionOptions.map((action) => buildActionKey(module.slug, action)))
            }
          : user
      )
    );
  }

  function clearAllUserActions(userId: string) {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, allowedActionKeys: [] } : user)));
  }

  function selectAllUserActionsForModule(userId: string, moduleSlug: string) {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              allowedActionKeys: Array.from(new Set([...user.allowedActionKeys, ...actionOptions.map((action) => buildActionKey(moduleSlug, action))]))
            }
          : user
      )
    );
  }

  function clearAllUserActionsForModule(userId: string, moduleSlug: string) {
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              allowedActionKeys: user.allowedActionKeys.filter((key) => !key.startsWith(`${moduleSlug}:`))
            }
          : user
      )
    );
  }

  function updateUserFlag(
    userId: string,
    key: "hasCustomModuleAccess" | "hasCustomActionAccess" | "isActive",
    value: boolean
  ) {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, [key]: value } : user)));
  }

  function updateUserRole(userId: string, role: string) {
    setUsers((current) => current.map((user) => (user.id === userId ? { ...user, role } : user)));
  }

  function applyPresetToUser(userId: string, presetKey: string) {
    const preset = availableRolePresets.find((item) => item.key === presetKey) || getRolePresetByKey(presetKey);
    if (!preset) return;
    setUsers((current) =>
      current.map((user) =>
        user.id === userId
          ? {
              ...user,
              rolePreset: preset.key,
              role: preset.baseRole,
              hasCustomModuleAccess: preset.moduleSlugs[0] !== "*",
              allowedModuleSlugs: preset.moduleSlugs[0] === "*" ? [] : [...preset.moduleSlugs],
              hasCustomActionAccess: preset.actionKeys[0] !== "*",
              allowedActionKeys: preset.actionKeys[0] === "*" ? [] : [...preset.actionKeys]
            }
          : user
      )
    );
  }

  async function saveUserAccess(user: ManagedUser) {
    setError("");
    setMessage("");

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hasCustomModuleAccess: user.hasCustomModuleAccess,
        allowedModuleSlugs: user.allowedModuleSlugs,
        hasCustomActionAccess: user.hasCustomActionAccess,
        allowedActionKeys: user.allowedActionKeys,
        isActive: user.isActive,
        role: user.role
      })
    });

    const result = await response.json();

    if (!response.ok) {
      const nextError = result?.message || "Unable to update user access";
      setError(nextError);
      showToast({ kind: "error", title: "Access not updated", message: nextError });
      return;
    }

    setUsers((current) =>
      current.map((item) =>
        item.id === user.id
          ? {
              id: String(result.user.id || ""),
              name: String(result.user.name || ""),
              email: String(result.user.email || ""),
              rolePreset: item.rolePreset || "",
              role: String(result.user.role || "VIEWER"),
              isActive: Boolean(result.user.isActive),
              hasCustomModuleAccess: Boolean(result.user.hasCustomModuleAccess),
              allowedModuleSlugs: Array.isArray(result.user.allowedModuleSlugs)
                ? result.user.allowedModuleSlugs.map((entry: unknown) => String(entry))
                : [],
              hasCustomActionAccess: Boolean(result.user.hasCustomActionAccess),
              allowedActionKeys: Array.isArray(result.user.allowedActionKeys)
                ? result.user.allowedActionKeys.map((entry: unknown) => String(entry))
                : []
            }
          : item
      )
    );
    setMessage(`Updated access for ${result.user.name}`);
    showToast({ kind: "success", title: "Access updated", message: String(result.user.name || "") });
  }

  async function runQuickUserAction(user: ManagedUser, mode: "toggle_active" | "force_logout") {
    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        hasCustomModuleAccess: user.hasCustomModuleAccess,
        allowedModuleSlugs: user.allowedModuleSlugs,
        hasCustomActionAccess: user.hasCustomActionAccess,
        allowedActionKeys: user.allowedActionKeys,
        isActive: mode === "toggle_active" ? !user.isActive : user.isActive,
        role: user.role,
        forceLogout: mode === "force_logout"
      })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({
        kind: "error",
        title: mode === "force_logout" ? "Force logout failed" : "Status update failed",
        message: result?.message || "Unable to update user security state."
      });
      return;
    }

    showToast({
      kind: "success",
      title: mode === "force_logout" ? "Session invalidated" : user.isActive ? "User deactivated" : "User activated",
      message:
        mode === "force_logout"
          ? `Forced logout for ${user.name}.`
          : user.isActive
            ? `${user.name} is now inactive.`
            : `${user.name} is now active.`
    });
    await loadUsers();
  }

  async function clearFailedAttempts(user: ManagedUser) {
    const confirmClear = window.confirm(`Clear failed login attempts for ${user.name}?`);
    if (!confirmClear) return;

    const response = await fetch("/api/users/login-history", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "clear_failed_attempts",
        userId: user.id,
        userEmail: user.email
      })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({
        kind: "error",
        title: "Reset failed attempts failed",
        message: result?.message || "Unable to clear failed login attempts."
      });
      return;
    }

    showToast({
      kind: "success",
      title: "Failed attempts cleared",
      message: `Cleared ${Number(result?.removedCount || 0)} failed attempt(s) for ${user.name}.`
    });
    await loadUsers();
  }

  async function unlockUserLogin(user: ManagedUser) {
    const confirmUnlock = window.confirm(`Unlock login access for ${user.name}?`);
    if (!confirmUnlock) return;

    const response = await fetch("/api/users/login-history", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "unlock_account",
        userId: user.id,
        userEmail: user.email
      })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({
        kind: "error",
        title: "Unlock failed",
        message: result?.message || "Unable to unlock user login."
      });
      return;
    }

    showToast({
      kind: "success",
      title: "User unlocked",
      message: `Login access restored for ${user.name}.`
    });
    await loadUsers();
  }

  async function lockUserLogin(user: ManagedUser) {
    const reason = window.prompt(`Lock login for ${user.name}. Enter reason:`, "Suspicious activity");
    if (!reason?.trim()) return;

    const response = await fetch("/api/users/login-history", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: "lock_account",
        userId: user.id,
        userEmail: user.email,
        reason: reason.trim()
      })
    });

    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({
        kind: "error",
        title: "Lock failed",
        message: result?.message || "Unable to lock user login."
      });
      return;
    }

    showToast({
      kind: "success",
      title: "User locked",
      message: `Login access blocked for ${user.name}.`
    });
    await loadUsers();
  }

  async function resetPasswordForUser(user: ManagedUser) {
    const nextPassword = window.prompt(`Reset password for ${user.name}`, "");
    if (!nextPassword?.trim()) return;

    const response = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: nextPassword.trim() })
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      showToast({ kind: "error", title: "Password not reset", message: result?.message || "Unable to reset password." });
      return;
    }
    showToast({ kind: "success", title: "Password reset", message: `Updated password for ${user.name}.` });
  }

  return (
    <section className="surface p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Settings</p>
        <h3 className="mt-2 font-serif text-3xl font-semibold tracking-tight">User Management</h3>
        <p className="mt-2 text-sm text-slate-600">Create desk-wise users and assign role-based access.</p>
      </div>

      <SettingsDisclosure
        title="Create User"
        description="Create a staff account with a preset role, then refine access only when needed."
        defaultOpen
      >
      <form className="grid gap-4 xl:grid-cols-4" onSubmit={handleCreateUser}>
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Full name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Password" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form.rolePreset} onChange={(event) => applyPreset(event.target.value)}>
          {availableRolePresets.map((preset) => (
            <option key={preset.key} value={preset.key}>
              {preset.label}
            </option>
          ))}
        </select>
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="ADMISSION_STAFF">Admission Staff</option>
          <option value="DOCUMENT_VERIFIER">Document Verifier</option>
          <option value="FINANCE_DESK">Finance Desk</option>
          <option value="SCHOLARSHIP_DESK">Scholarship Desk</option>
          <option value="PRN_SCVT_DESK">PRN / SCVT Desk</option>
          <option value="VIEWER">Viewer</option>
        </select>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 xl:col-span-4">
            {(availableRolePresets.find((item) => item.key === form.rolePreset) || getRolePresetByKey(form.rolePreset))?.description ||
            "Choose a role preset, then refine module and action overrides if needed."}
        </div>
        <div className="rounded-2xl border border-slate-200 px-4 py-3 xl:col-span-4">
          <ToggleSwitch checked={form.hasCustomModuleAccess} label="Use custom module access for this new user" onChange={(nextValue) => setForm((current) => ({ ...current, hasCustomModuleAccess: nextValue }))} variant="warning" />
        </div>
        {form.hasCustomModuleAccess ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Allowed modules</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={selectAllFormModules} type="button">
                  Select All
                </button>
                <button className="btn-secondary" onClick={clearAllFormModules} type="button">
                  Clear All
                </button>
              </div>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {portalModules.map((module) => (
                <ToggleSwitch key={module.slug} checked={form.allowedModuleSlugs.includes(module.slug)} label={module.title} onChange={() => toggleFormModule(module.slug)} variant="neutral" />
              ))}
            </div>
          </div>
        ) : null}
        <div className="rounded-2xl border border-slate-200 px-4 py-3 xl:col-span-4">
          <ToggleSwitch checked={form.hasCustomActionAccess} label="Use custom action permissions for this new user" onChange={(nextValue) => setForm((current) => ({ ...current, hasCustomActionAccess: nextValue }))} variant="warning" />
        </div>
        {form.hasCustomActionAccess ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 xl:col-span-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Allowed actions by module</p>
              <div className="flex flex-wrap gap-2">
                <button className="btn-secondary" onClick={selectAllFormActions} type="button">
                  Select All
                </button>
                <button className="btn-secondary" onClick={clearAllFormActions} type="button">
                  Clear All
                </button>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {portalModules.map((module) => (
                <div key={module.slug} className="rounded-2xl border border-slate-100 bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">{module.title}</p>
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-secondary" onClick={() => selectAllFormActionsForModule(module.slug)} type="button">
                        Select All
                      </button>
                      <button className="btn-secondary" onClick={() => clearAllFormActionsForModule(module.slug)} type="button">
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-4">
                    {actionOptions.map((action) => {
                      const key = buildActionKey(module.slug, action);
                      return (
                        <ToggleSwitch key={key} checked={form.allowedActionKeys.includes(key)} label={action} onChange={() => toggleFormAction(module.slug, action)} variant="neutral" />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <button className="rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white xl:col-span-4" type="submit">
          Create User
        </button>
      </form>
      </SettingsDisclosure>

      <SettingsDisclosure
        title={customRoleForm.key ? "Edit Custom Role" : "Custom Roles"}
        description={
          customRoleForm.key
            ? "Update the selected custom role preset and save the revised access rules."
            : "Create reusable role presets and manage the custom role register."
        }
      >
      <form className="rounded-3xl border border-slate-100 bg-white p-5" onSubmit={createCustomRolePreset}>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Role label" value={customRoleForm.label} onChange={(event) => setCustomRoleForm((current) => ({ ...current, label: event.target.value }))} />
          <input className="rounded-2xl border border-slate-200 px-4 py-3 text-sm xl:col-span-2" placeholder="Description" value={customRoleForm.description} onChange={(event) => setCustomRoleForm((current) => ({ ...current, description: event.target.value }))} />
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={customRoleForm.baseRole} onChange={(event) => setCustomRoleForm((current) => ({ ...current, baseRole: event.target.value }))}>
            <option value="SUPER_ADMIN">Super Admin</option>
            <option value="ADMIN">Admin</option>
            <option value="ADMISSION_STAFF">Admission Staff</option>
            <option value="DOCUMENT_VERIFIER">Document Verifier</option>
            <option value="FINANCE_DESK">Finance Desk</option>
            <option value="SCHOLARSHIP_DESK">Scholarship Desk</option>
            <option value="PRN_SCVT_DESK">PRN / SCVT Desk</option>
            <option value="VIEWER">Viewer</option>
          </select>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Allowed modules</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={selectAllCustomRoleModules} type="button">
                Select All
              </button>
              <button className="btn-secondary" onClick={clearAllCustomRoleModules} type="button">
                Clear All
              </button>
            </div>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {portalModules.map((module) => (
              <ToggleSwitch key={module.slug} checked={customRoleForm.moduleSlugs.includes(module.slug)} label={module.title} onChange={() => toggleCustomRoleModule(module.slug)} variant="neutral" />
            ))}
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">Allowed actions by module</p>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={selectAllCustomRoleActions} type="button">
                Select All
              </button>
              <button className="btn-secondary" onClick={clearAllCustomRoleActions} type="button">
                Clear All
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-3">
            {portalModules.map((module) => (
              <div key={module.slug} className="rounded-2xl border border-slate-100 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{module.title}</p>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => selectAllCustomRoleActionsForModule(module.slug)} type="button">
                      Select All
                    </button>
                    <button className="btn-secondary" onClick={() => clearAllCustomRoleActionsForModule(module.slug)} type="button">
                      Clear
                    </button>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-4">
                  {actionOptions.map((action) => {
                    const key = buildActionKey(module.slug, action);
                    return (
                      <ToggleSwitch key={key} checked={customRoleForm.actionKeys.includes(key)} label={action} onChange={() => toggleCustomRoleAction(module.slug, action)} variant="neutral" />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white" type="submit">
            {customRoleForm.key ? "Update Custom Role" : "Save Custom Role"}
          </button>
          {customRoleForm.key ? (
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" onClick={cancelEditingCustomRole} type="button">
              Cancel Edit
            </button>
          ) : null}
        </div>
      </form>

      <div className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Custom Role Register</h4>
            <p className="mt-1 text-sm text-slate-600">Review and manage the reusable custom role presets created for your institute.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={customRolePresets.length ? "chip-warning" : "chip-success"}>{customRolePresets.length} custom roles</span>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" onClick={exportCustomRolesCsv} type="button">
              Export Custom Roles
            </button>
          </div>
        </div>

        <div className="mt-4 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Base Role</th>
                <th>Users</th>
                <th>Modules</th>
                <th>Actions</th>
                <th>Updated</th>
                <th>Controls</th>
              </tr>
            </thead>
            <tbody>
              {customRolePresets.length ? (
                customRolePresets.map((preset) => (
                  <tr key={preset.key}>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{preset.label}</p>
                        <p className="text-xs text-slate-500">{preset.description}</p>
                      </div>
                    </td>
                    <td>{formatEnumLabel(preset.baseRole)}</td>
                    <td>{customRoleUsage.find((item) => item.presetKey === preset.key)?.count || 0}</td>
                    <td>{preset.moduleSlugs.length}</td>
                    <td>{preset.actionKeys.length}</td>
                    <td>{("updatedAt" in preset && (preset as { updatedAt?: string }).updatedAt) ? new Date((preset as { updatedAt?: string }).updatedAt || "").toLocaleString("en-IN") : "-"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800"
                          onClick={() => startEditingCustomRole(preset)}
                          type="button"
                        >
                          Edit
                        </button>
                        <button
                          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                            (customRoleUsage.find((item) => item.presetKey === preset.key)?.count || 0) > 0
                              ? "border border-slate-200 bg-slate-100 text-slate-400"
                              : "border border-rose-200 bg-rose-50 text-rose-800"
                          }`}
                          onClick={() => void deleteCustomRolePreset(preset)}
                          disabled={(customRoleUsage.find((item) => item.presetKey === preset.key)?.count || 0) > 0}
                          type="button"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                    No custom roles created yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </SettingsDisclosure>

      {(message || error) ? (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-100 bg-white p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total Users</p>
          <p className="mt-3 text-3xl font-semibold text-slate-900">{summary.total}</p>
        </div>
        <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Active</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-900">{summary.active}</p>
        </div>
        <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-amber-700">Inactive</p>
          <p className="mt-3 text-3xl font-semibold text-amber-900">{summary.inactive}</p>
        </div>
        <div className="rounded-3xl border border-sky-100 bg-sky-50 p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-sky-700">Custom Access</p>
          <p className="mt-3 text-3xl font-semibold text-sky-900">{summary.customAccess}</p>
        </div>
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 md:col-span-2 xl:col-span-4">
          <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Failed Logins Logged</p>
          <p className="mt-3 text-3xl font-semibold text-rose-900">{summary.failedLogins}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 rounded-3xl border border-slate-100 bg-white p-5 md:grid-cols-3">
        <input
          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
          placeholder="Search user by name, email, or role"
          value={userSearch}
          onChange={(event) => setUserSearch(event.target.value)}
        />
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="ADMIN">Admin</option>
          <option value="ADMISSION_STAFF">Admission Staff</option>
          <option value="DOCUMENT_VERIFIER">Document Verifier</option>
          <option value="FINANCE_DESK">Finance Desk</option>
          <option value="SCHOLARSHIP_DESK">Scholarship Desk</option>
          <option value="PRN_SCVT_DESK">PRN / SCVT Desk</option>
          <option value="VIEWER">Viewer</option>
        </select>
        <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <div className="md:col-span-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{filteredUsers.length} user(s) in current view</p>
          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" onClick={exportUsersCsv} type="button">
            Export Filtered Users
          </button>
        </div>
      </div>

      <SettingsDisclosure
        title="User Directory And Access"
        description="Choose one user from the directory, then open and save access for that account only."
        defaultOpen
      >
      <div className="mt-6 grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((item) => (
              <div key={item} className="rounded-3xl border border-slate-100 bg-white p-5">
                <SkeletonBlock className="h-6 w-48" />
                <SkeletonBlock className="mt-3 h-4 w-64" />
                <SkeletonBlock className="mt-6 h-10 w-full" />
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <SkeletonBlock className="h-8 w-full" />
                  <SkeletonBlock className="h-8 w-full" />
                  <SkeletonBlock className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && !filteredUsers.length ? <div className="rounded-3xl border border-slate-100 px-4 py-8 text-center text-slate-500 xl:col-span-2">No users found for the current filters</div> : null}
        {!loading && filteredUsers.length ? (
          <>
            <div className="space-y-3">
              {filteredUsers.map((user) => {
                const insight = getUserLoginInsights(user);
                const isSelected = user.id === selectedUserId;
                return (
                  <button
                    key={user.id}
                    className={`w-full rounded-3xl border p-4 text-left transition ${
                      isSelected ? "border-emerald-300 bg-emerald-50 shadow-sm" : "border-slate-100 bg-white hover:border-slate-200"
                    }`}
                    onClick={() => setSelectedUserId(user.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-slate-900">{user.name}</h4>
                        <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-slate-500">{formatEnumLabel(user.role)}</p>
                      </div>
                      <span className={user.isActive ? "chip-success" : "chip-warning"}>{user.isActive ? "Active" : "Inactive"}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="chip-neutral">
                        Last Login: {insight.lastSuccess ? new Date(insight.lastSuccess.createdAt).toLocaleString("en-IN") : "Never"}
                      </span>
                      <span className={insight.failedAttempts ? "chip-warning" : "chip-success"}>Failed: {insight.failedAttempts}</span>
                      {insight.isLocked ? <span className="chip-danger">{insight.lockState?.lockType === "MANUAL" ? "Manual Lock" : "Auto Lock"}</span> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedUser && selectedUserLoginInsight ? (
              <article className="rounded-3xl border border-slate-100 bg-white p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Managing Access</p>
                    <h4 className="mt-1 text-xl font-semibold text-slate-900">{selectedUser.name}</h4>
                    <p className="mt-1 text-sm text-slate-600">{selectedUser.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="chip-neutral">
                        Last Login: {selectedUserLoginInsight.lastSuccess ? new Date(selectedUserLoginInsight.lastSuccess.createdAt).toLocaleString("en-IN") : "Never"}
                      </span>
                      <span className={selectedUserLoginInsight.failedAttempts ? "chip-warning" : "chip-success"}>
                        Failed Attempts: {selectedUserLoginInsight.failedAttempts}
                      </span>
                      {selectedUserLoginInsight.isLocked ? (
                        <span className="chip-danger">
                          {selectedUserLoginInsight.lockState?.lockType === "MANUAL" ? "Manual Lock" : "Auto Lock"} Until:{" "}
                          {selectedUserLoginInsight.lockState?.lockedUntil
                            ? new Date(selectedUserLoginInsight.lockState.lockedUntil).toLocaleString("en-IN")
                            : "-"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <UserLoginHistoryDialog
                      userEmail={selectedUser.email}
                      userName={selectedUser.name}
                      rows={loginHistory.filter((item) => item.userEmail.toLowerCase() === selectedUser.email.toLowerCase())}
                    />
                    {!selectedUserLoginInsight.isLocked ? (
                      <button className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800" onClick={() => void lockUserLogin(selectedUser)} type="button">
                        Lock Account
                      </button>
                    ) : (
                      <button className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" onClick={() => void unlockUserLogin(selectedUser)} type="button">
                        Unlock Account
                      </button>
                    )}
                    <button className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800" onClick={() => void clearFailedAttempts(selectedUser)} type="button">
                      Clear Failed
                    </button>
                    <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" onClick={() => void resetPasswordForUser(selectedUser)} type="button">
                      Reset Password
                    </button>
                    <button className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800" onClick={() => void runQuickUserAction(selectedUser, "force_logout")} type="button">
                      Force Logout
                    </button>
                    <button className="rounded-2xl bg-emerald-800 px-4 py-3 text-sm font-semibold text-white" onClick={() => void saveUserAccess(selectedUser)} type="button">
                      Save Access
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-700">
                  <ToggleSwitch checked={selectedUser.isActive} label="Active user" onChange={(nextValue) => updateUserFlag(selectedUser.id, "isActive", nextValue)} variant="success" />
                  <ToggleSwitch checked={selectedUser.hasCustomModuleAccess} label="Override role with custom module access" onChange={(nextValue) => updateUserFlag(selectedUser.id, "hasCustomModuleAccess", nextValue)} variant="warning" />
                  <ToggleSwitch checked={selectedUser.hasCustomActionAccess} label="Override role with custom action permissions" onChange={(nextValue) => updateUserFlag(selectedUser.id, "hasCustomActionAccess", nextValue)} variant="warning" />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Apply Role Preset
                    <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={selectedUser.rolePreset || ""} onChange={(event) => applyPresetToUser(selectedUser.id, event.target.value)}>
                      <option value="">Select preset</option>
                      {availableRolePresets.map((preset) => (
                        <option key={preset.key} value={preset.key}>
                          {preset.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    Base Role
                    <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={selectedUser.role} onChange={(event) => updateUserRole(selectedUser.id, event.target.value)}>
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="ADMIN">Admin</option>
                      <option value="ADMISSION_STAFF">Admission Staff</option>
                      <option value="DOCUMENT_VERIFIER">Document Verifier</option>
                      <option value="FINANCE_DESK">Finance Desk</option>
                      <option value="SCHOLARSHIP_DESK">Scholarship Desk</option>
                      <option value="PRN_SCVT_DESK">PRN / SCVT Desk</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedUser.hasCustomModuleAccess ? "Allowed modules for this user" : "Role default access is currently active"}
                    </p>
                    {selectedUser.hasCustomModuleAccess ? (
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary" onClick={() => selectAllUserModules(selectedUser.id)} type="button">
                          Select All
                        </button>
                        <button className="btn-secondary" onClick={() => clearAllUserModules(selectedUser.id)} type="button">
                          Clear All
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {portalModules.map((module) => (
                      <ToggleSwitch
                        key={module.slug}
                        checked={selectedUser.allowedModuleSlugs.includes(module.slug)}
                        disabled={!selectedUser.hasCustomModuleAccess}
                        label={module.title}
                        onChange={() => toggleUserModule(selectedUser.id, module.slug)}
                        variant="neutral"
                        className={selectedUser.hasCustomModuleAccess ? "" : "opacity-60"}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedUser.hasCustomActionAccess ? "Allowed actions for this user" : "Role default actions are currently active"}
                    </p>
                    {selectedUser.hasCustomActionAccess ? (
                      <div className="flex flex-wrap gap-2">
                        <button className="btn-secondary" onClick={() => selectAllUserActions(selectedUser.id)} type="button">
                          Select All
                        </button>
                        <button className="btn-secondary" onClick={() => clearAllUserActions(selectedUser.id)} type="button">
                          Clear All
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className="mt-3 space-y-3">
                    {portalModules.map((module) => (
                      <div key={module.slug} className="rounded-2xl border border-slate-100 bg-white p-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-900">{module.title}</p>
                          {selectedUser.hasCustomActionAccess ? (
                            <div className="flex flex-wrap gap-2">
                              <button className="btn-secondary" onClick={() => selectAllUserActionsForModule(selectedUser.id, module.slug)} type="button">
                                Select All
                              </button>
                              <button className="btn-secondary" onClick={() => clearAllUserActionsForModule(selectedUser.id, module.slug)} type="button">
                                Clear
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-4">
                          {actionOptions.map((action) => {
                            const key = buildActionKey(module.slug, action);
                            return (
                              <ToggleSwitch
                                key={key}
                                checked={selectedUser.allowedActionKeys.includes(key)}
                                disabled={!selectedUser.hasCustomActionAccess}
                                label={action}
                                onChange={() => toggleUserAction(selectedUser.id, module.slug, action)}
                                variant="neutral"
                                className={selectedUser.hasCustomActionAccess ? "" : "opacity-60"}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ) : null}
          </>
        ) : null}
      </div>
      </SettingsDisclosure>

      <SettingsDisclosure
        title="Role Permission Matrix"
        description="Compare role presets, base roles, module reach, and sensitive approval-style rights in one place."
      >
      <div className="rounded-3xl border border-slate-100 bg-white p-5">
        <div className="mt-4 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Preset</th>
                <th>Base Role</th>
                <th>Modules</th>
                <th>Sensitive Rights</th>
              </tr>
            </thead>
            <tbody>
              {availableRolePresets.map((preset) => {
                const sensitiveRights = preset.actionKeys.filter((key) =>
                  key.endsWith(":approve") || key.endsWith(":delete") || key.endsWith(":reset_password") || key.endsWith(":export")
                );

                return (
                  <tr key={preset.key}>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{preset.label}</p>
                        <p className="text-xs text-slate-500">{preset.description}</p>
                      </div>
                    </td>
                    <td>{formatEnumLabel(preset.baseRole)}</td>
                    <td>
                      {preset.moduleSlugs[0] === "*" ? (
                        <span className="chip-success">All Modules</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {preset.moduleSlugs.slice(0, 8).map((slug) => (
                            <span key={slug} className="chip-neutral">
                              {portalModules.find((item) => item.slug === slug)?.shortTitle || slug}
                            </span>
                          ))}
                          {preset.moduleSlugs.length > 8 ? <span className="chip-warning">+{preset.moduleSlugs.length - 8} more</span> : null}
                        </div>
                      )}
                    </td>
                    <td>
                      {preset.actionKeys[0] === "*" ? (
                        <span className="chip-success">Full Rights</span>
                      ) : sensitiveRights.length ? (
                        <div className="flex flex-wrap gap-2">
                          {sensitiveRights.slice(0, 6).map((key) => (
                            <span key={key} className="chip-warning">
                              {key}
                            </span>
                          ))}
                          {sensitiveRights.length > 6 ? <span className="chip-neutral">+{sensitiveRights.length - 6} more</span> : null}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">No elevated rights in preset</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </SettingsDisclosure>

      <SettingsDisclosure
        title="Security Watchlist"
        description="Quick watch for users with repeated failed sign-ins or accounts that have never logged in."
      >
      <div className="rounded-3xl border border-amber-100 bg-amber-50/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Security Watchlist</h4>
            <p className="mt-1 text-sm text-slate-600">Quick watch for users with repeated failed sign-ins or accounts that have never logged in.</p>
          </div>
          <span className="chip-warning">{securityWatchlist.length} flagged</span>
        </div>

        <div className="mt-4 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Failed Attempts</th>
                <th>Last Success</th>
                <th>Risk Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {securityWatchlist.length ? (
                securityWatchlist.map((item) => (
                  <tr key={item.user.id}>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{item.user.name}</p>
                        <p className="text-xs text-slate-500">{item.user.email}</p>
                      </div>
                    </td>
                    <td>{item.user.isActive ? "ACTIVE" : "INACTIVE"}</td>
                    <td>{item.failedAttempts}</td>
                    <td>{item.lastSuccess ? new Date(item.lastSuccess.createdAt).toLocaleString("en-IN") : "Never"}</td>
                    <td>
                      {item.isLocked
                        ? `${item.lockState?.lockType === "MANUAL" ? "Manual lock" : "Auto lock"} until ${item.lockState?.lockedUntil ? new Date(item.lockState.lockedUntil).toLocaleString("en-IN") : "-"}${item.lockState?.reason ? ` (${item.lockState.reason})` : ""}`
                        : item.failedAttempts >= 3 && item.neverLoggedIn
                        ? "Repeated failed attempts and no successful login yet"
                        : item.failedAttempts >= 3
                          ? "Repeated failed sign-in attempts"
                          : "Account created but not used yet"}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <UserLoginHistoryDialog
                          userEmail={item.user.email}
                          userName={item.user.name}
                          rows={loginHistory.filter((row) => row.userEmail.toLowerCase() === item.user.email.toLowerCase())}
                        />
                        {!item.isLocked ? (
                          <button
                            className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
                            onClick={() => void lockUserLogin(item.user)}
                            type="button"
                          >
                            Lock
                          </button>
                        ) : null}
                        {item.isLocked ? (
                          <button
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
                            onClick={() => void unlockUserLogin(item.user)}
                            type="button"
                          >
                            Unlock
                          </button>
                        ) : null}
                        <button
                          className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800"
                          onClick={() => void clearFailedAttempts(item.user)}
                          type="button"
                        >
                          Clear Failed
                        </button>
                        <button
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
                          onClick={() => void runQuickUserAction(item.user, "force_logout")}
                          type="button"
                        >
                          Force Logout
                        </button>
                        <button
                          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                            item.user.isActive
                              ? "border border-rose-200 bg-rose-50 text-rose-800"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                          onClick={() => void runQuickUserAction(item.user, "toggle_active")}
                          type="button"
                        >
                          {item.user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                    No high-risk login patterns detected right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </SettingsDisclosure>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Locked Accounts</h4>
            <p className="mt-1 text-sm text-slate-600">Review all currently locked logins with lock type, reason, and expiry time.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={lockedAccounts.length ? "chip-danger" : "chip-success"}>{lockedAccounts.length} locked</span>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" onClick={exportLockedAccountsCsv} type="button">
              Export Locked Accounts
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="chip-neutral">Manual Locks: {lockedAccounts.filter((item) => item.lockState?.lockType === "MANUAL").length}</span>
          <span className="chip-warning">Auto Locks: {lockedAccounts.filter((item) => item.lockState?.lockType !== "MANUAL").length}</span>
        </div>

        <div className="mt-4 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Lock Type</th>
                <th>Reason</th>
                <th>Failed Attempts</th>
                <th>Locked Until</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lockedAccounts.length ? (
                lockedAccounts.map((item) => (
                  <tr key={item.user.id}>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{item.user.name}</p>
                        <p className="text-xs text-slate-500">{item.user.email}</p>
                      </div>
                    </td>
                    <td>{formatEnumLabel(item.user.role)}</td>
                    <td>{item.lockState?.lockType === "MANUAL" ? "Manual" : "Auto"}</td>
                    <td>{item.lockState?.reason || "-"}</td>
                    <td>{item.failedAttempts}</td>
                    <td>{item.lockState?.lockedUntil ? new Date(item.lockState.lockedUntil).toLocaleString("en-IN") : "-"}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <UserLoginHistoryDialog
                          userEmail={item.user.email}
                          userName={item.user.name}
                          rows={loginHistory.filter((row) => row.userEmail.toLowerCase() === item.user.email.toLowerCase())}
                        />
                        <button
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800"
                          onClick={() => void unlockUserLogin(item.user)}
                          type="button"
                        >
                          Unlock
                        </button>
                        <button
                          className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800"
                          onClick={() => void clearFailedAttempts(item.user)}
                          type="button"
                        >
                          Clear Failed
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                    No locked accounts right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Lock Activity</h4>
            <p className="mt-1 text-sm text-slate-600">Audit trail for manual locks, unlocks, and failed-attempt resets.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip-neutral">{lockActivityRows.length} entries</span>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" onClick={exportLockActivityCsv} type="button">
              Export Lock Activity
            </button>
          </div>
        </div>

        <div className="mt-4 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Reason</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {lockActivityRows.length ? (
                lockActivityRows.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{row.userName || "System"}</p>
                        <p className="text-xs text-slate-500">{row.userEmail || "-"}</p>
                      </div>
                    </td>
                    <td>{formatEnumLabel(row.action)}</td>
                    <td>{String(row.metadata?.targetUserEmail || "-")}</td>
                    <td>{String(row.metadata?.reason || "-")}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {row.metadata?.removedCount ? <span className="chip-warning">Removed: {String(row.metadata.removedCount)}</span> : null}
                        {row.metadata?.unlocked ? <span className="chip-success">Unlocked</span> : null}
                        {row.metadata?.locked ? <span className="chip-danger">Locked</span> : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                    No lock-activity entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Dormant Accounts</h4>
            <p className="mt-1 text-sm text-slate-600">Active users who have never logged in or have been inactive for 30+ days.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={dormantAccounts.length ? "chip-warning" : "chip-success"}>{dormantAccounts.length} dormant</span>
            <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" onClick={exportDormantAccountsCsv} type="button">
              Export Dormant Accounts
            </button>
          </div>
        </div>

        <div className="mt-4 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Dormant Days</th>
                <th>Failed Attempts</th>
                <th>Lock State</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dormantAccounts.length ? (
                dormantAccounts.map((item) => (
                  <tr key={item.user.id}>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{item.user.name}</p>
                        <p className="text-xs text-slate-500">{item.user.email}</p>
                      </div>
                    </td>
                    <td>{formatEnumLabel(item.user.role)}</td>
                    <td>{item.lastSuccess ? new Date(item.lastSuccess.createdAt).toLocaleString("en-IN") : "Never"}</td>
                    <td>{item.neverLoggedIn ? "Never Logged In" : item.dormantDays}</td>
                    <td>{item.failedAttempts}</td>
                    <td>{item.isLocked ? <span className="chip-danger">Locked</span> : <span className="chip-neutral">Open</span>}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <UserLoginHistoryDialog
                          userEmail={item.user.email}
                          userName={item.user.name}
                          rows={loginHistory.filter((row) => row.userEmail.toLowerCase() === item.user.email.toLowerCase())}
                        />
                        <button
                          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800"
                          onClick={() => void runQuickUserAction(item.user, "force_logout")}
                          type="button"
                        >
                          Force Logout
                        </button>
                        <button
                          className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                            item.user.isActive
                              ? "border border-rose-200 bg-rose-50 text-rose-800"
                              : "border border-emerald-200 bg-emerald-50 text-emerald-800"
                          }`}
                          onClick={() => void runQuickUserAction(item.user, "toggle_active")}
                          type="button"
                        >
                          {item.user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={7}>
                    No dormant accounts right now.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">Login History</h4>
            <p className="mt-1 text-sm text-slate-600">Recent login success, failed attempts, and logout events with IP and device hints.</p>
          </div>
          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" onClick={() => void loadUsers()} type="button">
            Refresh
          </button>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="Search user, role, device, IP, or user-agent"
            value={loginHistorySearch}
            onChange={(event) => setLoginHistorySearch(event.target.value)}
          />
          <select className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" value={loginEventFilter} onChange={(event) => setLoginEventFilter(event.target.value)}>
            <option value="">All Events</option>
            <option value="LOGIN_SUCCESS">Login Success</option>
            <option value="LOGIN_FAILED">Login Failed</option>
            <option value="LOGOUT">Logout</option>
          </select>
        </div>

        <div className="mt-4 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>User</th>
                <th>Role</th>
                <th>Device</th>
                <th>IP</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {filteredLoginHistory.length ? (
                filteredLoginHistory.map((item) => (
                  <tr key={item.id}>
                    <td>{item.eventType}</td>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{item.userName || item.userEmail || "Unknown user"}</p>
                        <p className="text-xs text-slate-500">{item.userEmail || "-"}</p>
                      </div>
                    </td>
                    <td>{item.userRole || "-"}</td>
                    <td>
                      <div className="space-y-1">
                        <p>{item.deviceLabel || "-"}</p>
                        <p className="text-xs text-slate-500">{item.userAgent || "-"}</p>
                      </div>
                    </td>
                    <td>{item.ipAddress || "-"}</td>
                    <td>{new Date(item.createdAt).toLocaleString("en-IN")}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={6}>
                    No login history found for the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-100 bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-lg font-semibold text-slate-900">User Management Audit</h4>
            <p className="mt-1 text-sm text-slate-600">Track who created users, changed access, or reset passwords, with old vs new values.</p>
          </div>
          <button className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800" onClick={() => void loadUsers()} type="button">
            Refresh
          </button>
        </div>

        <div className="mt-4 data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
                <th>Changes</th>
              </tr>
            </thead>
            <tbody>
              {userAuditRows.length ? (
                userAuditRows.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleString("en-IN")}</td>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{row.userName || "System"}</p>
                        <p className="text-xs text-slate-500">{row.userEmail || "-"}</p>
                      </div>
                    </td>
                    <td>{row.action}</td>
                    <td>
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">{row.metadata?.targetUserEmail || row.metadata?.createdUserEmail || "-"}</p>
                        <p className="text-xs text-slate-500">{row.metadata?.targetUserId || row.metadata?.createdUserId || "-"}</p>
                      </div>
                    </td>
                    <td>
                      <div className="max-w-[420px] space-y-2 text-xs text-slate-600">
                        {row.metadata?.before ? (
                          <div>
                            <p className="font-semibold text-slate-700">Before</p>
                            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(row.metadata.before, null, 2)}</pre>
                          </div>
                        ) : null}
                        {row.metadata?.after ? (
                          <div>
                            <p className="font-semibold text-slate-700">After</p>
                            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(row.metadata.after, null, 2)}</pre>
                          </div>
                        ) : null}
                        {row.metadata?.passwordChanged ? <p className="font-semibold text-amber-700">Password changed</p> : null}
                        {!row.metadata?.before && !row.metadata?.after && !row.metadata?.passwordChanged ? <p>-</p> : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={5}>
                    No user-management audit entries yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
