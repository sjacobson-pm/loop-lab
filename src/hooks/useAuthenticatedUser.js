import { useAuthenticatedStaffQuery } from 'apis/pm-apis/central-data-store/root/staff/queries';
import { getUser } from 'features/auth/microsoft/msalHelpers';

const useAuthenticatedUser = () => {
  // **********************************************************************
  // * constants / component vars

  const currentUser = getUser();
  const currentStaff = useAuthenticatedStaffQuery();

  // * note: if/when you need info about the user's roles, you can add that information here
  // *       and then return the different user roles you're interested in within the return value
  // const userRoles = getUserRoles();
  // const isAppAdmin = userRoles.isAppAdmin;
  // * then, below: return { currentUser, isAppAdmin, isReportsViewer, ... };

  // **********************************************************************
  // * return value

  return { currentUser, currentStaff };
};

export { useAuthenticatedUser };
