export enum UserRole {
  ASB_ADMIN = 'ASB_ADMIN',
  ASB_FUNKCIONAR = 'ASB_FUNKCIONAR',
  ASB_TRENER = 'ASB_TRENER',
  ASB_CLEN = 'ASB_CLEN',
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  roles: UserRole[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  displayName?: string;
  roles: UserRole[];
}

export interface UpdateUserData {
  displayName?: string;
  roles?: UserRole[];
}
