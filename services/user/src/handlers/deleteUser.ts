import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { validateId } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, UserRequest, UserResponse } from '../types/grpc.js';

export const deleteUser = async (call: GrpcCall<UserRequest>, callback: GrpcCallback<UserResponse>) => {
  try {
    const { id } = call.request;
    validateId(id);

    const deletedUser = await prisma.user.delete({ where: { id } });

    callback(null, {
      id: deletedUser.id,
      username: deletedUser.username,
      firstname: deletedUser.firstname,
      lastname: deletedUser.lastname,
      email: deletedUser.email,
      profile: null,
      roles: [],
      permissions: []
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return callback({ code: grpc.status.NOT_FOUND, details: `User with ID ${call.request.id} not found.` });
    }
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
