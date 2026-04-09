import * as grpc from '@grpc/grpc-js';

const invalidArg = (message: string) => ({
  code: grpc.status.INVALID_ARGUMENT,
  details: message,
});

export const validateId = (id: string) => {
  if (!id?.trim()) throw invalidArg('id is required');
};

export const validateCreateUser = (username: string, firstname: string, lastname: string, email: string) => {
  if (!username?.trim()) throw invalidArg('username is required');
  if (username.length > 30) throw invalidArg('username must be at most 30 characters');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) throw invalidArg('username may only contain letters, numbers, and underscores');

  if (!firstname?.trim()) throw invalidArg('firstname is required');
  if (firstname.length > 50) throw invalidArg('firstname must be at most 50 characters');

  if (!lastname?.trim()) throw invalidArg('lastname is required');
  if (lastname.length > 50) throw invalidArg('lastname must be at most 50 characters');

  if (!email?.trim()) throw invalidArg('email is required');
  if (email.length > 100) throw invalidArg('email must be at most 100 characters');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw invalidArg('email format is invalid');
};

export const validateUpdateUser = (fields: {
  firstname?: string;
  lastname?: string;
  profile_picture?: string;
  language?: string;
}) => {
  if (fields.firstname !== undefined && fields.firstname.length > 50)
    throw invalidArg('firstname must be at most 50 characters');

  if (fields.lastname !== undefined && fields.lastname.length > 50)
    throw invalidArg('lastname must be at most 50 characters');

  if (fields.profile_picture !== undefined && fields.profile_picture.length > 500)
    throw invalidArg('profile_picture must be at most 500 characters');

  if (fields.language !== undefined && !/^[a-z]{2}$/.test(fields.language))
    throw invalidArg('language must be a 2-letter ISO code (e.g. "en")');
};

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const COLOR_FIELDS = [
  'color_bg', 'color_main', 'color_caret', 'color_text',
  'color_sub', 'color_sub_alt', 'color_error', 'color_extra_error',
] as const;

export const validateTheme = (
  fields: { name?: string } & Partial<Record<typeof COLOR_FIELDS[number], string>>,
  requireAll: boolean,
) => {
  if (requireAll && !fields.name?.trim()) throw invalidArg('name is required');
  if (fields.name !== undefined && fields.name.length > 100)
    throw invalidArg('name must be at most 100 characters');

  for (const field of COLOR_FIELDS) {
    const val = fields[field];
    if (requireAll && val === undefined) throw invalidArg(`${field} is required`);
    if (val !== undefined && !HEX_COLOR_RE.test(val))
      throw invalidArg(`${field} must be a valid hex color (e.g. #FF0000 or #F0F)`);
  }
};
