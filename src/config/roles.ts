import type { UserRole } from '@/types';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  admin: 100,
  operations_chief: 80,
  supervisor: 60,
  guard: 40,
};

export function hasMinRole(userRole: UserRole, minRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0);
}
