import Fastify from 'fastify';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { PrismaClient } from '@prisma/client';
import path from 'path';

const prisma = new PrismaClient();
const fastify = Fastify({ logger: true });

// Load the protobuf
const PROTO_PATH = path.resolve('./src/proto/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const userProto = (grpc.loadPackageDefinition(packageDefinition) as any).user;

const getUser = async (call: any, callback: any) => {
  try {
    const user = await prisma.users.findUnique({
      where: { id: call.request.id }
    });
    user ? callback(null, user) : callback({ code: grpc.status.NOT_FOUND, details: "User not found" });
  } catch (err) {
    callback(err);
  }
};

const startGrpc = () => {
  const server = new grpc.Server();
  server.addService(userProto.UserService.service, { GetUser: getUser });
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
