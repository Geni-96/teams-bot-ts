import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply
} from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { CommunicationIdentityClient } from '@azure/communication-identity';
import dotenv from 'dotenv';
import { AudioProcessor, AudioChunk } from './audioProcessor';

dotenv.config();

export interface ServerDependencies {
  identityClient?: CommunicationIdentityClient;
  audioProcessor?: AudioProcessor;
}

export function buildServer(
  dependencies: ServerDependencies = {}
): FastifyInstance {
  const fastify = Fastify({
    logger: true
  });

  // Register plugins
  fastify.register(websocket);
  fastify.register(cors, {
    origin: true
  });

  const identityClient =
    dependencies.identityClient ??
    new CommunicationIdentityClient(process.env.ACS_CONNECTION_STRING || '');

  const audioProcessor = dependencies.audioProcessor ?? new AudioProcessor();

  // Health check endpoint
  fastify.get(
    '/health',
    async (request: FastifyRequest, reply: FastifyReply) => {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    }
  );

  // Get ACS token endpoint
  fastify.post(
    '/token',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = await identityClient.createUser();
        const tokenResponse = await identityClient.getToken(user, ['voip']);

        return {
          user: user.communicationUserId,
          token: tokenResponse.token,
          expiresOn: tokenResponse.expiresOn
        };
      } catch (error: unknown) {
        fastify.log.error('Error creating ACS token:');
        fastify.log.error(error);
        reply.status(500).send({ error: 'Failed to create token' });
      }
    }
  );

  // WebSocket endpoint for audio streaming
  fastify.register(async function (fastifyInstance) {
    fastifyInstance.get('/audio', { websocket: true }, (connection) => {
      fastifyInstance.log.info('WebSocket connection established');

      connection.on('message', async (message: Buffer | string) => {
        try {
          const messageStr =
            typeof message === 'string' ? message : message.toString();
          const audioData: AudioChunk = JSON.parse(messageStr);

          // Process audio data
          await audioProcessor.processAudio(audioData);

          // Send acknowledgment
          connection.send(
            JSON.stringify({
              status: 'received',
              timestamp: Date.now()
            })
          );
        } catch (error: unknown) {
          fastifyInstance.log.error('Error processing audio:');
          fastifyInstance.log.error(error);
          connection.send(
            JSON.stringify({
              status: 'error',
              message: 'Failed to process audio'
            })
          );
        }
      });

      connection.on('close', () => {
        fastifyInstance.log.info('WebSocket connection closed');
      });
    });
  });

  return fastify;
}

export const start = async (): Promise<void> => {
  const fastify = buildServer();
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    fastify.log.info('Server is running on http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== 'test') {
  void start();
}