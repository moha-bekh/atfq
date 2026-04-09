import { Prisma } from '@prisma/client';
import type { UserResponse, ThemeResponse } from '../types/grpc.js';

type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    profile: true;
    theme: true;
    roles: { include: { role: { include: { permissions: true } } } };
  };
}>;

type ThemeModel = Prisma.ThemeGetPayload<{}>;

export const mapThemeToProto = (theme: ThemeModel): ThemeResponse => ({
  id: theme.id,
  user_id: theme.userId,
  name: theme.name,
  color_bg: theme.colorBg,
  color_main: theme.colorMain,
  color_caret: theme.colorCaret,
  color_text: theme.colorText,
  color_sub: theme.colorSub,
  color_sub_alt: theme.colorSubAlt,
  color_error: theme.colorError,
  color_extra_error: theme.colorExtraError,
});

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
          language: user.profile.language,
          theme: user.theme
            ? mapThemeToProto(user.theme)
            : null,
        }
      : null,
    roles,
    permissions: [...new Set(permissions)],
  };
};
