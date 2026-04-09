import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapThemeToProto } from '../utils/mappers.js';
import { validateId, validateTheme } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, UpdateThemeRequest, ThemeResponse } from '../types/grpc.js';

export const updateTheme = async (call: GrpcCall<UpdateThemeRequest>, callback: GrpcCallback<ThemeResponse>) => {
  try {
    const { id, name, color_bg, color_main, color_caret, color_text, color_sub, color_sub_alt, color_error, color_extra_error } = call.request;

    validateId(id);
    validateId(call.request.user_id);
    validateTheme({ name, color_bg, color_main, color_caret, color_text, color_sub, color_sub_alt, color_error, color_extra_error }, false);

    const existing = await prisma.theme.findUnique({ where: { id } });
    if (!existing) {
      return callback({ code: grpc.status.NOT_FOUND, details: 'Theme not found' });
    }
    if (existing.userId !== call.request.user_id) {
      return callback({ code: grpc.status.PERMISSION_DENIED, details: 'Theme does not belong to this user' });
    }

    const theme = await prisma.theme.update({
      where: { id },
      data: {
        name: name ?? undefined,
        colorBg: color_bg ?? undefined,
        colorMain: color_main ?? undefined,
        colorCaret: color_caret ?? undefined,
        colorText: color_text ?? undefined,
        colorSub: color_sub ?? undefined,
        colorSubAlt: color_sub_alt ?? undefined,
        colorError: color_error ?? undefined,
        colorExtraError: color_extra_error ?? undefined,
      },
    });

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
