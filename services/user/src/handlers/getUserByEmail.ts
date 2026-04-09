import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';
import type { GrpcCall, GrpcCallback, EmailRequest, UserResponse } from '../types/grpc.js';

export const getUserByEmail = async (call: GrpcCall<EmailRequest>, callback: GrpcCallback<UserResponse>) => {
  try {
    const { email } = call.request;
    if (!email?.trim()) {
      return callback({ code: grpc.status.INVALID_ARGUMENT, details: 'email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
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
