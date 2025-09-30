#!/usr/bin/env node

import { CommunicationIdentityClient } from '@azure/communication-identity';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { program } from 'commander';

// Load environment variables
dotenv.config();

interface TokenResponse {
  user: string;
  token: string;
  expiresOn: Date;
}

class ACMeetingCLISimplified {
  private identityClient: CommunicationIdentityClient;
  private ws: WebSocket | null = null;

  constructor() {
    this.identityClient = new CommunicationIdentityClient(
      process.env.ACS_CONNECTION_STRING || ''
    );
  }

  async createUser(): Promise<TokenResponse> {
    try {
      console.log('🔑 Creating ACS user and token...');
      
      // Check if ACS connection string is set
      if (!process.env.ACS_CONNECTION_STRING) {
        throw new Error('ACS_CONNECTION_STRING environment variable is not set. Please check your .env file.');
      }
      
      // Create ACS user and get token
      const user = await this.identityClient.createUser();
      const tokenResponse = await this.identityClient.getToken(user, ['voip']);
      
      console.log(`✅ ACS user created: ${user.communicationUserId}`);
      console.log(`🔑 Token expires: ${tokenResponse.expiresOn}`);
      
      return {
        user: user.communicationUserId,
        token: tokenResponse.token,
        expiresOn: tokenResponse.expiresOn
      };
      
    } catch (error: any) {
      if (error.message?.includes('ACS_CONNECTION_STRING')) {
        console.error('❌ Configuration error:', error.message);
        console.error('💡 Make sure you have created a .env file in the backend directory');
        console.error('💡 Add: ACS_CONNECTION_STRING=your_connection_string_here');
      } else {
        console.error('❌ Failed to create ACS user:', error.message || error);
      }
      throw error;
    }
  }

  async connectToBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log('🔌 Connecting to backend WebSocket...');
        
        this.ws = new WebSocket('ws://localhost:3001/audio');
        
        this.ws.on('open', () => {
          console.log('✅ WebSocket connected to backend');
          resolve();
        });
        
        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            if (message.status === 'received') {
              console.log(`📨 Backend acknowledged message at ${new Date(message.timestamp).toISOString()}`);
            } else if (message.status === 'error') {
              console.error('❌ Backend error:', message.message);
            }
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        });
        
        this.ws.on('error', (error: Error) => {
          console.error('❌ WebSocket error:', error.message);
          reject(error);
        });
        
        this.ws.on('close', () => {
          console.log('🔌 WebSocket connection closed');
        });
        
      } catch (error) {
        console.error('❌ Failed to connect to backend:', error);
        reject(error);
      }
    });
  }

  async simulateMeetingSession(duration: number): Promise<void> {
    console.log(`🎬 Simulating meeting session for ${duration} minutes...`);
    console.log('💡 Note: This is a simulation since ACS calling SDK requires a browser environment');
    console.log('📞 In a real implementation, this would:');
    console.log('   - Connect to the Teams meeting');
    console.log('   - Stream audio to the backend');
    console.log('   - Process participant events');
    
    // Simulate sending periodic audio data
    const interval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        const audioData = {
          timestamp: Date.now(),
          sampleRate: 16000,
          channels: 1,
          data: new Array(1600).fill(0) // Simulated 100ms of silence
        };
        
        this.ws.send(JSON.stringify(audioData));
        console.log('🎵 Sent simulated audio data to backend');
      }
    }, 5000); // Send every 5 seconds
    
    // Wait for specified duration
    await new Promise(resolve => {
      setTimeout(() => {
        clearInterval(interval);
        resolve(void 0);
      }, duration * 60 * 1000);
    });
  }

  async cleanup(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    console.log('🧹 Cleanup completed');
  }
}

async function joinMeeting(meetingUrl: string, duration: number): Promise<void> {
  const cli = new ACMeetingCLISimplified();
  
  try {
    // Create ACS user and token
    const tokenInfo = await cli.createUser();
    
    console.log(`🔗 Meeting URL: ${meetingUrl}`);
    console.log('⚠️  Note: Browser-based ACS calling is not available in Node.js');
    console.log('💡 This demo shows the authentication and backend integration parts');
    
    // Connect to backend
    await cli.connectToBackend();
    
    // Simulate meeting session
    await cli.simulateMeetingSession(duration);
    
  } catch (error: any) {
    console.error('❌ CLI execution failed:', error.message || error);
    throw error;
  } finally {
    await cli.cleanup();
  }
}

async function joinMeetingById(meetingId: string, passcode: string, duration: number): Promise<void> {
  console.log(`🔗 Meeting ID: ${meetingId}, Passcode: ${passcode}`);
  // Use the same simulation as URL-based joining
  await joinMeeting(`meeting-id:${meetingId}`, duration);
}

// CLI Program setup
program
  .name('acs-meeting-cli-simple')
  .description('Simplified CLI for ACS meeting integration (Node.js compatible)')
  .version('1.0.0');

program
  .command('test-auth')
  .description('Test ACS authentication and backend connection')
  .action(async () => {
    const cli = new ACMeetingCLISimplified();
    
    try {
      console.log('🧪 Testing ACS authentication...');
      const tokenInfo = await cli.createUser();
      console.log('✅ Authentication successful');
      
      console.log('🧪 Testing backend connection...');
      await cli.connectToBackend();
      console.log('✅ Backend connection successful');
      
      await cli.cleanup();
      console.log('🎉 All tests passed!');
    } catch (error: any) {
      console.error('❌ Test failed:', error.message);
      await cli.cleanup();
      process.exit(1);
    }
  });

program
  .command('simulate-join')
  .description('Simulate joining a meeting (for testing integration)')
  .argument('<meeting-url>', 'Teams meeting URL')
  .option('-d, --duration <minutes>', 'Duration to simulate (minutes)', '2')
  .action(async (meetingUrl: string, options: any) => {
    const duration = parseInt(options.duration);
    
    console.log('🎭 Starting meeting simulation...');
    console.log('💡 This simulates the integration without actually joining a meeting');
    
    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received interrupt signal, stopping simulation...');
      process.exit(0);
    });
    
    try {
      await joinMeeting(meetingUrl, duration);
      console.log('✅ Simulation completed successfully');
    } catch (error) {
      console.error('❌ Simulation failed');
      process.exit(1);
    }
  });

// Export for potential programmatic use
export { ACMeetingCLISimplified };

// Run the program if this file is executed directly
if (require.main === module) {
  program.parseAsync().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}