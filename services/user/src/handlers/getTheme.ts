import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapThemeToProto } from '../utils/mappers.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, ThemeRequest, ThemeResponse } from '../types/grpc.js';

export const getTheme = async (call: GrpcCall<ThemeRequest>, callback: GrpcCallback<ThemeResponse>) => {
  try {
    validateId(call.request.id);

    const theme = await prisma.theme.findUnique({ where: { id: call.request.id } });

    if (theme) {
      callback(null, mapThemeToProto(theme));
    } else {
      callback({ code: grpc.status.NOT_FOUND, details: 'Theme not found' });
    }
  } catch (err: any) {
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
