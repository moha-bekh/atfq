import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.ts'

export const deleteUser = async (call: any, callback: any) => {
  try {
    const { id } = call.request;

    const deletedUser = await prisma.user.delete({
      where: { id }
    });

    callback(null, deletedUser);
  } catch (err: any) {
    console.error("Database Error:", err);
    
    // Prisma error for "Record to delete does not exist"
    if (err.code === 'P2025') {
      return callback({
        code: grpc.status.NOT_FOUND,
        details: `User with ID ${call.request.id} not found.`
      });
    }

    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
};
