import React from 'react';
import RoleRoute from './RoleRoute';
import { RoleGroups } from '../utils/roleHelpers';

interface ClenRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard pro členy
 * Povoluje přístup uživatelům s jakoukoli ASB rolí (přihlášení uživatelé)
 */
const ClenRoute: React.FC<ClenRouteProps> = ({ children }) => {
  return (
    <RoleRoute 
      allowedRoles={RoleGroups.ALL_ROLES}
      showMessage={true}
    >
      {children}
    </RoleRoute>
  );
};

export default ClenRoute;
