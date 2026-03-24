import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';
import { checkIdentityAvailability, ensureDefaultRoleExists } from './helpers.js'; // Use the helper file

export const createUser = async (call: any, callback: any) => {
  try {
    const { username, firstname, lastname, email } = call.request;
    const DEFAULT_ROLE = 'user';

    await checkIdentityAvailability(username, email);
    await ensureDefaultRoleExists(DEFAULT_ROLE);

    const newUser = await prisma.$transaction(async (tx) => {
      return await tx.user.create({
        data: {
          username, firstname, lastname, email,
          profile: { create: { language: "en", darkTheme: false } },
          roles: { create: { roleId: DEFAULT_ROLE } }
        },
        include: {
          profile: true,
          roles: { include: { role: { include: { permissions: true } } } }
        }
      });
    });

    callback(null, mapUserToProto(newUser));
  } catch (err: any) {
    const code = err.code || grpc.status.INTERNAL;
    const details = err.details || err.message;
    callback({ code, details });
  }
};
