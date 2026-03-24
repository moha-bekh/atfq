import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';

export const listUsers = async (call: any, callback: any) => {
  try {
    const users = await prisma.user.findMany();
    callback(null, { users });
  } catch (err: any) {
    console.error("Database Error:", err);
    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
};
