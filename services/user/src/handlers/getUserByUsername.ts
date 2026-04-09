import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';
import type { GrpcCall, GrpcCallback, UsernameRequest, UserResponse } from '../types/grpc.js';

export const getUserByUsername = async (call: GrpcCall<UsernameRequest>, callback: GrpcCallback<UserResponse>) => {
  try {
    const { username } = call.request;
    if (!username?.trim()) {
      return callback({ code: grpc.status.INVALID_ARGUMENT, details: 'username is required' });
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        profile: true,
        activeTheme: true,
        roles: { include: { role: { include: { permissions: true } } } }
      }
    });

    if (user) {
      callback(null, mapUserToProto(user));
    } else {
      callback({ code: grpc.status.NOT_FOUND, details: 'User not found' });
    }
  } catch (err: any) {
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
