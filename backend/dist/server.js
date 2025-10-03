"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.start = void 0;
exports.buildServer = buildServer;
const fastify_1 = __importDefault(require("fastify"));
const websocket_1 = __importDefault(require("@fastify/websocket"));
const cors_1 = __importDefault(require("@fastify/cors"));
const communication_identity_1 = require("@azure/communication-identity");
const dotenv_1 = __importDefault(require("dotenv"));
const audioProcessor_1 = require("./audioProcessor");
dotenv_1.default.config();
function buildServer(dependencies = {}) {
    const fastify = (0, fastify_1.default)({
        logger: true
    });
    // Register plugins
    fastify.register(websocket_1.default);
    fastify.register(cors_1.default, {
        origin: true
    });
    const identityClient = dependencies.identityClient ??
        new communication_identity_1.CommunicationIdentityClient(process.env.ACS_CONNECTION_STRING || '');
    const audioProcessor = dependencies.audioProcessor ?? new audioProcessor_1.AudioProcessor();
    // Health check endpoint
    fastify.get('/health', async (request, reply) => {
        return { status: 'healthy', timestamp: new Date().toISOString() };
    });
    // Get ACS token endpoint
    fastify.post('/token', async (request, reply) => {
        try {
            const user = await identityClient.createUser();
            const tokenResponse = await identityClient.getToken(user, ['voip']);
            return {
                user: user.communicationUserId,
                token: tokenResponse.token,
                expiresOn: tokenResponse.expiresOn
            };
        }
        catch (error) {
            fastify.log.error('Error creating ACS token:');
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Failed to create token' });
        }
    });
    // WebSocket endpoint for audio streaming
    fastify.register(async function (fastifyInstance) {
        fastifyInstance.get('/audio', { websocket: true }, (connection) => {
            fastifyInstance.log.info('WebSocket connection established');
            connection.on('message', async (message) => {
                try {
                    const messageStr = typeof message === 'string' ? message : message.toString();
                    const audioData = JSON.parse(messageStr);
                    // Process audio data
                    await audioProcessor.processAudio(audioData);
                    // Send acknowledgment
                    connection.send(JSON.stringify({
                        status: 'received',
                        timestamp: Date.now()
                    }));
                }
                catch (error) {
                    fastifyInstance.log.error('Error processing audio:');
                    fastifyInstance.log.error(error);
                    connection.send(JSON.stringify({
                        status: 'error',
                        message: 'Failed to process audio'
                    }));
                }
            });
            connection.on('close', () => {
                fastifyInstance.log.info('WebSocket connection closed');
            });
        });
    });
    return fastify;
}
const start = async () => {
    const fastify = buildServer();
    try {
        await fastify.listen({ port: 3001, host: '0.0.0.0' });
        fastify.log.info('Server is running on http://localhost:3001');
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
exports.start = start;
if (process.env.NODE_ENV !== 'test') {
    void (0, exports.start)();
}
//# sourceMappingURL=server.js.map