import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';

export const getUser = async (call: any, callback: any) => {
try {
    const user = await prisma.user.findUnique({
      where: { id: call.request.id },
      include: { 
        profile: true, 
        roles: {
          include: {
            role: { include: { permissions: true } }
          }
        }
      } 
    });
    if (user) {
      // Maps the combined data to the UserResponse proto format
      callback(null, mapUserToProto(user));
    } else {
      callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
    }
  } catch (err: any) {
    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
};
