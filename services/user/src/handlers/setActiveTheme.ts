import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapThemeToProto } from '../utils/mappers.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, SetActiveThemeRequest, ThemeResponse } from '../types/grpc.js';

export const setActiveTheme = async (call: GrpcCall<SetActiveThemeRequest>, callback: GrpcCallback<ThemeResponse>) => {
  try {
    const { user_id, theme_id } = call.request;

    validateId(user_id);
    validateId(theme_id);

    const theme = await prisma.theme.findUnique({ where: { id: theme_id } });
    if (!theme) {
      return callback({ code: grpc.status.NOT_FOUND, details: 'Theme not found' });
    }
    if (theme.userId !== user_id) {
      return callback({ code: grpc.status.PERMISSION_DENIED, details: 'Theme does not belong to this user' });
    }

    await prisma.user.update({
      where: { id: user_id },
      data: { activeThemeId: theme_id },
    });

    callback(null, mapThemeToProto(theme));
  } catch (err: any) {
    if (err.code === 'P2025') {
      return callback({ code: grpc.status.NOT_FOUND, details: 'User not found' });
    }
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
