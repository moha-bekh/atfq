import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapThemeToProto } from '../utils/mappers.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, DeleteThemeRequest, ThemeResponse } from '../types/grpc.js';

export const deleteTheme = async (call: GrpcCall<DeleteThemeRequest>, callback: GrpcCallback<ThemeResponse>) => {
  try {
    const { id, user_id } = call.request;

    validateId(id);
    validateId(user_id);

    const theme = await prisma.theme.findUnique({ where: { id } });
    if (!theme) {
      return callback({ code: grpc.status.NOT_FOUND, details: 'Theme not found' });
    }
    if (theme.userId !== user_id) {
      return callback({ code: grpc.status.PERMISSION_DENIED, details: 'Theme does not belong to this user' });
    }

    await prisma.theme.delete({ where: { id } });

    callback(null, mapThemeToProto(theme));
  } catch (err: any) {
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
