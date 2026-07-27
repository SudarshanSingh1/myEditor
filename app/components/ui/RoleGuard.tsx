import React from 'react';
import { useUserStore } from '../../stores/useUserStore';

export interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermissions?: string[];
  fallback?: React.ReactNode;
}

/**
 * RoleGuard is a centralized component to handle Role-Based Access Control (RBAC) in the UI.
 * It will only render its children if the current user has the allowed role or required permissions.
 */
export function RoleGuard({ children, allowedRoles, requiredPermissions, fallback = null }: RoleGuardProps) {
  const { user, permissions } = useUserStore();

  if (!user) {
    return <>{fallback}</>;
  }

  const hasAllowedRole = allowedRoles ? allowedRoles.includes(user.role) : true;
  
  const hasRequiredPermissions = requiredPermissions 
    ? requiredPermissions.every(perm => permissions.includes(perm))
    : true;

  if (hasAllowedRole && hasRequiredPermissions) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
