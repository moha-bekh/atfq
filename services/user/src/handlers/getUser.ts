import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, UserRequest, UserResponse } from '../types/grpc.js';

export const getUser = async (call: GrpcCall<UserRequest>, callback: GrpcCallback<UserResponse>) => {
  try {
    validateId(call.request.id);

    const user = await prisma.user.findUnique({
      where: { id: call.request.id },
      include: {
        profile: true,
        activeTheme: true,
        roles: { include: { role: { include: { permissions: true } } } }
      }
    });

    if (user) {
      callback(null, mapUserToProto(user));
    } else {
      callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
    }
  } catch (err: any) {
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
