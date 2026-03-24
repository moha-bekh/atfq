import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';

export const listUsers = async (call: any, callback: any) => {
	try {
    const users = await prisma.user.findMany({
      include: { 
        profile: true, 
        roles: {
          include: {
            role: { include: { permissions: true } } // Fetch permissions for all users in list
          }
        }
      }
    });

    // Map each database user object to the UserResponse format defined in the proto
    const mappedUsers = users.map(mapUserToProto);

    callback(null, { users: mappedUsers });
  } catch (err: any) {
    console.error("Database Error:", err);
    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
};
