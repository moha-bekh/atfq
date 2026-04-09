import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';
import type { GrpcCall, GrpcCallback, Empty, UserListResponse } from '../types/grpc.js';

export const listUsers = async (_call: GrpcCall<Empty>, callback: GrpcCallback<UserListResponse>) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        profile: true,
        theme: true,
        roles: { include: { role: { include: { permissions: true } } } }
      }
    });

    callback(null, { users: users.map(mapUserToProto) });
  } catch (err: any) {
    console.error("Database Error:", err);
    callback({ code: grpc.status.INTERNAL, details: "Internal server error" });
  }
};
