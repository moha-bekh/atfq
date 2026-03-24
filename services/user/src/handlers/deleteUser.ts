import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js'

export const deleteUser = async (call: any, callback: any) => {
  try {
    const { id } = call.request;

    // Cascade delete handles linked Profile, UserRole, and Contribution automatically
    const deletedUser = await prisma.user.delete({
      where: { id }
    });

    // We return the basic user info; relations are now deleted 
    callback(null, {
      id: deletedUser.id,
      username: deletedUser.username,
      firstname: deletedUser.firstname,
      lastname: deletedUser.lastname,
      email: deletedUser.email
    });
  } catch (err: any) {
    if (err.code === 'P2025') {
      return callback({
        code: grpc.status.NOT_FOUND,
        details: `User with ID ${call.request.id} not found.`
      });
    }
    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
};
