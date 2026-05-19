import { SetMetadata } from '@nestjs/common';

type AppRole = 'USER' | 'ADMIN';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
