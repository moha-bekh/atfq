import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapThemeToProto } from '../utils/mappers.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, UserRequest, ThemeListResponse } from '../types/grpc.js';

export const listThemes = async (call: GrpcCall<UserRequest>, callback: GrpcCallback<ThemeListResponse>) => {
  try {
    validateId(call.request.id);

    const themes = await prisma.theme.findMany({ where: { userId: call.request.id } });

    callback(null, { themes: themes.map(mapThemeToProto) });
  } catch (err: any) {
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
