import { User } from 'firebase/auth';
import { UserRole, UserProfile } from './user';

export interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  userRoles: UserRole[];
  loading: boolean;
  isAdmin: boolean;
  isFunkcionar: boolean;
  isTrener: boolean;
  isClen: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, displayName?: string, roles?: UserRole[]) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
