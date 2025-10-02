import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { CommunicationIdentityClient } from '@azure/communication-identity';
import { buildServer } from '../server';
import type { AudioProcessor } from '../audioProcessor';

type IdentityClientLike = Pick<
  CommunicationIdentityClient,
  'createUser' | 'getToken'
>;

class MockIdentityClient implements IdentityClientLike {
  public usersCreated: number = 0;

  async createUser(): Promise<{ communicationUserId: string }> {
    this.usersCreated += 1;
    return { communicationUserId: `user-${this.usersCreated}` };
  }

  async getToken(): Promise<{ token: string; expiresOn: Date }> {
    return {
      token: 'token-123',
      expiresOn: new Date('2030-01-01T00:00:00.000Z')
    };
  }
}

class ErrorIdentityClient implements IdentityClientLike {
  async createUser(): Promise<{ communicationUserId: string }> {
    throw new Error('identity failure');
  }

  async getToken(): Promise<never> {
    throw new Error('unreachable');
  }
}

describe('Fastify server', () => {
  let audioProcessor: AudioProcessor;

  beforeEach(() => {
    audioProcessor = {
      processAudio: jest.fn()
    } as unknown as AudioProcessor;
  });

  it('responds with health information', async () => {
    const server = buildServer({
      identityClient: new MockIdentityClient() as unknown as CommunicationIdentityClient,
      audioProcessor
    });

    const response = await server.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.status).toBe('healthy');
    expect(typeof body.timestamp).toBe('string');

    await server.close();
  });

  it('creates an ACS token successfully', async () => {
    const server = buildServer({
      identityClient: new MockIdentityClient() as unknown as CommunicationIdentityClient,
      audioProcessor
    });

    const response = await server.inject({ method: 'POST', url: '/token' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      user: 'user-1',
      token: 'token-123'
    });

    await server.close();
  });

  it('handles identity client errors gracefully', async () => {
    const server = buildServer({
      identityClient: new ErrorIdentityClient() as unknown as CommunicationIdentityClient,
      audioProcessor
    });

    const response = await server.inject({ method: 'POST', url: '/token' });

    expect(response.statusCode).toBe(500);
    expect(response.json()).toMatchObject({ error: 'Failed to create token' });

    await server.close();
  });
});
