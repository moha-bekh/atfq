import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.ts'

// 1. Database Helper Function
const isUsernameTaken = async (username: string): Promise<boolean> => {
  const existingUser = await prisma.user.findUnique({
    where: { username }
  });
  return existingUser !== null;
};

// 2. Main gRPC Handler
export const createUser = async (call: any, callback: any) => {
  try {
    const { username, firstname, lastname } = call.request;

    if (await isUsernameTaken(username)) {
      return callback({
        code: grpc.status.ALREADY_EXISTS,
        details: `The username '${username}' is already taken.`
      });
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        firstname,
        lastname
      }
    });

    callback(null, newUser);
  } catch (err: any) {
    console.error("Database Error:", err);
    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
};
