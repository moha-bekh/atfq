import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';

/**
 * Checks if essential identifiers are already in use.
 */
export const checkIdentityAvailability = async (username: string, email: string) => {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }]
    }
  });

  if (existing) {
    const field = existing.username === username ? 'username' : 'email';
    const value = existing.username === username ? username : email;
    throw {
      code: grpc.status.ALREADY_EXISTS,
      details: `The ${field} '${value}' is already taken.`
    };
  }
};

/**
 * Verifies that the default 'user' role exists in the database.
 */
export const ensureDefaultRoleExists = async (roleId: string = 'user') => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) {
    throw {
      code: grpc.status.FAILED_PRECONDITION,
      details: `Default role '${roleId}' not found. Please seed the database.`
    };
  }
};
