import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, UserRequest, ProfileResponse } from '../types/grpc.js';

export const getProfile = async (call: GrpcCall<UserRequest>, callback: GrpcCallback<ProfileResponse>) => {
  try {
    validateId(call.request.id);

    const profile = await prisma.profile.findUnique({
      where: { userId: call.request.id }
    });

    if (profile) {
      callback(null, {
        id: profile.id,
        profile_picture: profile.profilePicture ?? '',
        dark_theme: profile.darkTheme,
        language: profile.language,
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
