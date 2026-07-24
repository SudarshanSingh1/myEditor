import React from 'react';
import { useUserStore } from '../../stores/useUserStore';

interface PermissionGateProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
}) => {
  const { user, permissions: userPermissions } = useUserStore();

  if (!user) return <>{fallback}</>;
  
  const isOwner = user.role === 'OWNER';
  const hasWildcard = userPermissions.includes('*');

  if (isOwner || hasWildcard) {
    return <>{children}</>;
  }

  let hasAccess = false;

  if (permission) {
    hasAccess = userPermissions.includes(permission);
  } else if (permissions && permissions.length > 0) {
    if (requireAll) {
      hasAccess = permissions.every(p => userPermissions.includes(p));
    } else {
      hasAccess = permissions.some(p => userPermissions.includes(p));
    }
  } else {
    // If no permissions specified, just render
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};
