import React from 'react';
import RoleRoute from './RoleRoute';
import { RoleGroups } from '../utils/roleHelpers';

interface AdminRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard pro administrátory
 * Povoluje přístup pouze uživatelům s rolí ASB_ADMIN
 */
const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  return (
    <RoleRoute 
      allowedRoles={RoleGroups.ADMIN_ONLY}
      showMessage={false}
      redirectOnDenied="/dashboard"
    >
      {children}
    </RoleRoute>
  );
};

export default AdminRoute;
