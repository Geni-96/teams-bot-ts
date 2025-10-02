import '@testing-library/jest-dom';
import { vi } from 'vitest';

const mockFetch = vi.fn(
  async (): Promise<{ ok: boolean; json: () => Promise<unknown> }> => ({
    ok: true,
    json: async () => ({
      user: 'stub-user',
      token: 'stub-token',
      expiresOn: new Date('2030-01-01T00:00:00.000Z').toISOString()
    })
  })
);

vi.stubGlobal('fetch', mockFetch);
vi.stubGlobal('alert', vi.fn());

vi.mock('@azure/communication-calling', () => {
  class MockCall {
    public hangUp = vi.fn();
  }

  class MockCallAgent {
    public join = vi.fn(() => new MockCall());
  }

  class MockCallClient {
    public async createCallAgent() {
      return new MockCallAgent();
    }

    public async getDeviceManager() {
      return {};
    }
  }

  return {
    CallClient: MockCallClient
  };
});

vi.mock('@azure/communication-common', () => {
  class MockAzureCommunicationTokenCredential {
    constructor(token: string) {
      void token;
    }
  }

  return {
    AzureCommunicationTokenCredential: MockAzureCommunicationTokenCredential
  };
});
