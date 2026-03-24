import * as grpc from '@grpc/grpc-js';
import { prisma } from '../database.js';
import { mapUserToProto } from '../utils/mappers.js';

export const updateUser = async (call: any, callback: any) => {
  try {
    const { id, firstname, lastname, profile_picture, dark_theme, language } = call.request;

    // Prisma's 'undefined' value tells it to skip that field during the update
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        firstname: firstname ?? undefined,
        lastname: lastname ?? undefined,
        profile: {
          update: {
            profilePicture: profile_picture ?? undefined,
            darkTheme: dark_theme !== undefined ? dark_theme : undefined,
            language: language ?? undefined,
          }
        }
      },
      include: { 
        profile: true,
        roles: {
          include: {
            role: { include: { permissions: true } }
          }
        }
      }
    });

    callback(null, mapUserToProto(updatedUser));
  } catch (err: any) {
    if (err.code === 'P2025') {
      return callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
    }
    callback({ code: grpc.status.INTERNAL, details: err.message });
  }
};
