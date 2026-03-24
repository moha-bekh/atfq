import Fastify from 'fastify';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

import { prisma } from './database.ts'
import * as handlers from './handlers/index.js'

const fastify = Fastify({ logger: true });
const PROTO_PATH = path.resolve('./src/proto/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const userProto = (grpc.loadPackageDefinition(packageDefinition) as any).user;

const startGrpc = () => {
  const server = new grpc.Server();
  // Import handlers
  server.addService(userProto.UserService.service, {
	  GetUser:		handlers.getUser,
	  CreateUser:	handlers.createUser,
	  ListUsers:	handlers.listUsers,
	  DeleteUser:	handlers.deleteUser,
	  UpdateUser: handlers.updateUser

  });
  server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (error, port) => {
    if (error) console.error(error);
    else console.log(`gRPC User Service running on port ${port}`);
  });
};

fastify.get('/health', async (request, reply) => {
  return { status: 'OK', service: 'user-service' };
});

const start = async () => {
  try {
    await prisma.$connect();
    
    // Start Servers
    startGrpc();
    await fastify.listen({ port: 8080, host: '0.0.0.0' });
    
    console.log('User Service: REST on 8080, gRPC on 50051');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
