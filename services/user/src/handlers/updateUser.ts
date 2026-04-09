import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';
import { validateId, validateUpdateUser } from '../utils/validate.js';
import type { GrpcCall, GrpcCallback, UpdateUserRequest, UserResponse } from '../types/grpc.js';

export const updateUser = async (call: GrpcCall<UpdateUserRequest>, callback: GrpcCallback<UserResponse>) => {
  try {
    const { id, firstname, lastname, profile_picture, language } = call.request;

    validateId(id);
    validateUpdateUser({ firstname, lastname, profile_picture, language });

    const updatedUser = await prisma.$transaction(async (tx) => {
      return tx.user.update({
        where: { id },
        data: {
          firstname: firstname ?? undefined,
          lastname: lastname ?? undefined,
          profile: {
            update: {
              profilePicture: profile_picture ?? undefined,
              language: language ?? undefined,
            }
          }
        },
        include: {
          profile: true,
          theme: true,
          roles: { include: { role: { include: { permissions: true } } } }
        }
      });
    });

    callback(null, mapUserToProto(updatedUser));
  } catch (err: any) {
    if (err.code === 'P2025') {
      return callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
    }
    const code = err.code ?? grpc.status.INTERNAL;
    const details = err.details ?? err.message;
    callback({ code, details });
  }
};
