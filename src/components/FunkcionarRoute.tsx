import React from 'react';
import RoleRoute from './RoleRoute';
import { RoleGroups } from '../utils/roleHelpers';

interface FunkcionarRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard pro funkcionáře
 * Povoluje přístup uživatelům s rolí ASB_ADMIN nebo ASB_FUNKCIONAR
 */
const FunkcionarRoute: React.FC<FunkcionarRouteProps> = ({ children }) => {
  return (
    <RoleRoute 
      allowedRoles={RoleGroups.ADMIN_FUNKCIONAR}
      showMessage={false}
      redirectOnDenied="/dashboard"
    >
      {children}
    </RoleRoute>
  );
};

export default FunkcionarRoute;
