export const mapUserToProto = (user: any) => {
  const roles = user.roles ? user.roles.map((ur: any) => ur.roleId) : [];

  const permissions = user.roles
    ? user.roles.flatMap((ur: any) =>
        ur.role?.permissions?.map((rp: any) => rp.permissionId) || []
      )
    : [];

  const uniquePermissions = [...new Set(permissions)];

  return {
    id: user.id,
    username: user.username,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    profile: user.profile ? {
      id: user.profile.id,
      profile_picture: user.profile.profilePicture,
      dark_theme: user.profile.darkTheme,
      language: user.profile.language
    } : null,
    roles,
    permissions: uniquePermissions
  };
};
