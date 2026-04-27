import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapThemeToProto } from '../utils/mappers.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, UserRequest, ProfileResponse } from '../types/grpc.js';

export const getProfile = async (call: GrpcCall<UserRequest>, callback: GrpcCallback<ProfileResponse>) => {
  try {
    validateId(call.request.id);

    const user = await prisma.user.findUnique({
      where: { id: call.request.id },
      include: { profile: true, theme: true },
    });

    if (user?.profile) {
      callback(null, {
        id: user.profile.id,
        profile_picture: user.profile.profilePicture ?? '',
        language: user.profile.language,
        theme: user.theme ? mapThemeToProto(user.theme) : null,
      });
    } else {
      callback({ code: grpc.status.NOT_FOUND, details: 'Profile not found' });
    }
  } catch (err: any) {
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
