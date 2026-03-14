import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

const fastify: FastifyInstance = Fastify({
  logger: true // Provides structured JSON logs out of the box
});

const PORT: number = Number(process.env.PORT) || 8080;

// 1. Root route
fastify.get('/', async () => {
  return {
    service: "User Service",
    version: "1.0",
    runtime: "Node.js + TypeScript"
  };
});

// 2. Health check (Liveness)
fastify.get('/health', async (request, reply) => {
  reply.code(200).send('OK');
});

// 3. Readiness check (Ready)
fastify.get('/ready', async (request, reply) => {
  // TODO: Check DB connectivity here later
  reply.code(200).send('READY');
});

// 4. Start the server
const start = async () => {
  try {
    // Host 0.0.0.0 is mandatory for Docker containers
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
