import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, RoleRequest, UserResponse } from '../types/grpc.js';

export const assignRole = async (call: GrpcCall<RoleRequest>, callback: GrpcCallback<UserResponse>) => {
  try {
    const { user_id, role_id } = call.request;

    validateId(user_id);
    if (!role_id?.trim()) {
      return callback({ code: grpc.status.INVALID_ARGUMENT, details: 'role_id is required' });
    }

    const role = await prisma.role.findUnique({ where: { id: role_id } });
    if (!role) {
      return callback({ code: grpc.status.NOT_FOUND, details: `Role '${role_id}' not found` });
    }

    const existing = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user_id, roleId: role_id } }
    });
    if (existing) {
      return callback({ code: grpc.status.ALREADY_EXISTS, details: `User already has role '${role_id}'` });
    }

    await prisma.userRole.create({ data: { userId: user_id, roleId: role_id } });

    const user = await prisma.user.findUnique({
      where: { id: user_id },
      include: {
        profile: true,
        theme: true,
        roles: { include: { role: { include: { permissions: true } } } }
      }
    });

    if (!user) {
      return callback({ code: grpc.status.NOT_FOUND, details: 'User not found' });
    }

    callback(null, mapUserToProto(user));
  } catch (err: any) {
    if (err.code === 'P2003') {
      return callback({ code: grpc.status.NOT_FOUND, details: 'User not found' });
    }
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
