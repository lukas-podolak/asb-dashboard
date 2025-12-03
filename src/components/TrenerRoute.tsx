import React from 'react';
import RoleRoute from './RoleRoute';
import { RoleGroups } from '../utils/roleHelpers';

interface TrenerRouteProps {
  children: React.ReactNode;
}

/**
 * Route guard pro trenéry
 * Povoluje přístup uživatelům s rolí ASB_ADMIN, ASB_FUNKCIONAR nebo ASB_TRENER
 */
const TrenerRoute: React.FC<TrenerRouteProps> = ({ children }) => {
  return (
    <RoleRoute 
      allowedRoles={RoleGroups.ADMIN_FUNKCIONAR_TRENER}
      showMessage={true}
    >
      {children}
    </RoleRoute>
  );
};

export default TrenerRoute;
