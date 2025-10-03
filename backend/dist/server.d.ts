import { FastifyInstance } from 'fastify';
import { CommunicationIdentityClient } from '@azure/communication-identity';
import { AudioProcessor } from './audioProcessor';
export interface ServerDependencies {
    identityClient?: CommunicationIdentityClient;
    audioProcessor?: AudioProcessor;
}
export declare function buildServer(dependencies?: ServerDependencies): FastifyInstance;
export declare const start: () => Promise<void>;
//# sourceMappingURL=server.d.ts.map