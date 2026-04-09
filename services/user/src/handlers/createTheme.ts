import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapThemeToProto } from '../utils/mappers.js';
import { validateId, validateTheme } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, CreateThemeRequest, ThemeResponse } from '../types/grpc.js';

export const createTheme = async (call: GrpcCall<CreateThemeRequest>, callback: GrpcCallback<ThemeResponse>) => {
  try {
    const { user_id, name, color_bg, color_main, color_caret, color_text, color_sub, color_sub_alt, color_error, color_extra_error } = call.request;

    validateId(user_id);
    validateTheme({ name, color_bg, color_main, color_caret, color_text, color_sub, color_sub_alt, color_error, color_extra_error }, true);

    const theme = await prisma.theme.create({
      data: {
        userId: user_id,
        name,
        colorBg: color_bg,
        colorMain: color_main,
        colorCaret: color_caret,
        colorText: color_text,
        colorSub: color_sub,
        colorSubAlt: color_sub_alt,
        colorError: color_error,
        colorExtraError: color_extra_error,
      },
    });

    callback(null, mapThemeToProto(theme));
  } catch (err: any) {
    if (err.code === 'P2003') {
      return callback({ code: grpc.status.NOT_FOUND, details: 'User not found' });
    }
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
