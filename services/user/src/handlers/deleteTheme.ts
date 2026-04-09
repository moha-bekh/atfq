import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapThemeToProto } from '../utils/mappers.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, UserRequest, ThemeResponse } from '../types/grpc.js';

export const deleteTheme = async (call: GrpcCall<UserRequest>, callback: GrpcCallback<ThemeResponse>) => {
  try {
    validateId(call.request.id);

    const theme = await prisma.theme.delete({ where: { userId: call.request.id } });

    callback(null, mapThemeToProto(theme));
  } catch (err: any) {
    if (err.code === 'P2025') {
      return callback({ code: grpc.status.NOT_FOUND, details: 'Theme not found' });
    }
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
