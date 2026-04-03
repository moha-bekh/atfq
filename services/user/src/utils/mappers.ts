import { Prisma } from '@prisma/client';
import type { UserResponse } from '../types/grpc.js';

type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    profile: true;
    roles: { include: { role: { include: { permissions: true } } } };
  };
}>;

export const mapUserToProto = (user: UserWithRelations): UserResponse => {
  const roles = user.roles.map((ur) => ur.roleId);

  const permissions = user.roles.flatMap((ur) =>
    ur.role?.permissions?.map((rp) => rp.permissionId) ?? []
  );

  return {
    id: user.id,
    username: user.username,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    profile: user.profile
      ? {
          id: user.profile.id,
          profile_picture: user.profile.profilePicture ?? '',
          dark_theme: user.profile.darkTheme,
          language: user.profile.language,
        }
      : null,
    roles,
    permissions: [...new Set(permissions)],
  };
};
