import { useUserStore } from '../stores/useUserStore';

export const hasPermission = (requiredPermission: string): boolean => {
  const { user, permissions } = useUserStore.getState();

  if (!user) return false;
  if (user.role === 'OWNER') return true;
  if (permissions.includes('*')) return true;

  return permissions.includes(requiredPermission);
};

export const hasAnyPermission = (requiredPermissions: string[]): boolean => {
  return requiredPermissions.some(hasPermission);
};

export const hasAllPermissions = (requiredPermissions: string[]): boolean => {
  return requiredPermissions.every(hasPermission);
};
