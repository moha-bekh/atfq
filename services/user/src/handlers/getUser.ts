import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.ts'

export const getUser = async (call: any, callback: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: call.request.id }
    });

    if (user) {
      callback(null, user);
    } else {
      callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
    }
  } catch (err: any) {
    console.error("Database Error:", err);
    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
};
