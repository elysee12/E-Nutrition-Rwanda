import { useEffect, useState } from "react";

export type Role = "nutritionist" | "data-manager" | "admin" | "chw";

export const ROLE_LABEL: Record<Role, string> = {
  nutritionist: "Nurse / Nutritionist",
  "data-manager": "Data Manager",
  admin: "Administrator",
  chw: "Community Health Worker",
};

export const ROLE_PROFILE: Record<Role, { name: string; initials: string; facility: string }> = {
  nutritionist: { name: "Dr. Esther Mukamana", initials: "EM", facility: "Remera HC" },
  "data-manager": { name: "Ingabire Claire", initials: "IC", facility: "Remera HC" },
  admin: { name: "Eric Kagame", initials: "EK", facility: "MoH HQ" },
  chw: { name: "Jeanne Uwase", initials: "JU", facility: "Remera Sector" },
};

export function getDashboardName(role: Role): string {
  const dashboardNames: Record<Role, string> = {
    nutritionist: "Nurse Dashboard",
    "data-manager": "Data Manager Dashboard",
    admin: "Admin Dashboard",
    chw: "CHW Dashboard",
  };
  return dashboardNames[role];
}

const ROLE_KEY = "enr-role";
const USER_KEY = "user";

export function setRole(r: Role) {
  if (typeof window !== "undefined") localStorage.setItem(ROLE_KEY, r);
}

/** Read role synchronously — safe to call outside components */
export function getRole(): Role {
  if (typeof window === "undefined") return "nutritionist";
  return (localStorage.getItem(ROLE_KEY) as Role) ?? "nutritionist";
}

export function getStoredUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("auth_token");
}

/**
 * Hook that returns the current role.
 * Reads once on mount via lazy initializer — does NOT re-read on every render.
 * Updates only when another tab writes to localStorage.
 */
export function useRole(): Role {
  const [role, setRoleState] = useState<Role>("nutritionist");

  useEffect(() => {
    setRoleState(getRole());

    const onStorage = (e: StorageEvent) => {
      if (e.key === ROLE_KEY && e.newValue) {
        setRoleState(e.newValue as Role);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return role;
}
