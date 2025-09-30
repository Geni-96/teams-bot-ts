#!/usr/bin/env node

import { CommunicationIdentityClient } from '@azure/communication-identity';
import WebSocket from 'ws';
import dotenv from 'dotenv';
import { program } from 'commander';
import { JSDOM } from 'jsdom';

// Setup browser-like environment for ACS SDK
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Polyfill browser globals with proper property definitions
try {
  Object.defineProperty(global, 'window', { value: dom.window, writable: true });
  Object.defineProperty(global, 'document', { value: dom.window.document, writable: true });
  Object.defineProperty(global, 'HTMLElement', { value: dom.window.HTMLElement, writable: true });
  Object.defineProperty(global, 'HTMLVideoElement', { value: dom.window.HTMLVideoElement, writable: true });
  Object.defineProperty(global, 'HTMLAudioElement', { value: dom.window.HTMLAudioElement, writable: true });
  
  // Only set navigator if it doesn't exist or is undefined
  if (!(global as any).navigator) {
    Object.defineProperty(global, 'navigator', { 
      value: {
        userAgent: 'Node.js ACS CLI',
        mediaDevices: {
          getUserMedia: () => Promise.reject(new Error('getUserMedia not available in Node.js')),
          enumerateDevices: () => Promise.resolve([])
        }
      }, 
      writable: true 
    });
  }
  
  if (!(global as any).location) {
    Object.defineProperty(global, 'location', { value: dom.window.location, writable: true });
  }
} catch (error: any) {
  console.warn('⚠️  Some global polyfills could not be set:', error.message);
}

// MediaStream polyfill
(global as any).MediaStream = class MediaStream {
  constructor(tracks: any[] = []) {
    this.tracks = tracks;
    this.id = Math.random().toString(36).substr(2, 9);
  }
  tracks: any[];
  id: string;
  active: boolean = true;
  
  getTracks() { return this.tracks; }
  getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
  getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
  addTrack(track: any) { this.tracks.push(track); }
  removeTrack(track: any) { 
    this.tracks = this.tracks.filter(t => t !== track); 
  }
  clone() { return new MediaStream([...this.tracks]); }
};

// MediaStreamTrack polyfill
(global as any).MediaStreamTrack = class MediaStreamTrack {
  constructor(kind: string = 'audio') {
    this.kind = kind;
    this.id = Math.random().toString(36).substr(2, 9);
    this.label = `${kind}-track`;
  }
  kind: string;
  id: string;
  label: string;
  enabled: boolean = true;
  muted: boolean = false;
  readyState: string = 'live';
  
  stop() { this.readyState = 'ended'; }
  clone() { return new MediaStreamTrack(this.kind); }
};

// WebRTC polyfills
(global as any).RTCPeerConnection = class RTCPeerConnection {
  constructor(config?: any) {
    this.localDescription = null;
    this.remoteDescription = null;
    this.signalingState = 'stable';
    this.connectionState = 'new';
  }
  localDescription: any;
  remoteDescription: any;
  signalingState: string;
  connectionState: string;
  
  createOffer() { return Promise.resolve({ type: 'offer', sdp: 'mock-sdp' }); }
  createAnswer() { return Promise.resolve({ type: 'answer', sdp: 'mock-sdp' }); }
  setLocalDescription(desc: any) { 
    this.localDescription = desc; 
    return Promise.resolve(); 
  }
  setRemoteDescription(desc: any) { 
    this.remoteDescription = desc; 
    return Promise.resolve(); 
  }
  addIceCandidate() { return Promise.resolve(); }
  close() { this.connectionState = 'closed'; }
  addEventListener() {}
  removeEventListener() {}
};

// Screen API polyfills
(global as any).screen = {
  width: 1920,
  height: 1080,
  availWidth: 1920,
  availHeight: 1080,
  colorDepth: 24,
  pixelDepth: 24,
  orientation: {
    angle: 0,
    type: 'landscape-primary'
  }
};

// Additional browser APIs
(global as any).URL = class URL {
  constructor(url: string, base?: string) {
    this.href = url;
    this.protocol = 'https:';
    this.host = 'localhost';
    this.pathname = '/';
  }
  href: string;
  protocol: string;
  host: string;
  pathname: string;
};

(global as any).performance = {
  now: () => Date.now(),
  timing: {}
};

(global as any).requestAnimationFrame = (callback: any) => {
  return setTimeout(callback, 16);
};

(global as any).cancelAnimationFrame = (id: any) => {
  clearTimeout(id);
};

// Audio/Video element polyfills
(global as any).Audio = class Audio {
  constructor(src?: string) {
    this.src = src || '';
  }
  src: string;
  play() { return Promise.resolve(); }
  pause() {}
  load() {}
  addEventListener() {}
  removeEventListener() {}
};

// Load environment variables
dotenv.config();

// Check Node.js version
const nodeVersion = process.versions.node;
const majorVersion = parseInt(nodeVersion.split('.')[0]);
if (majorVersion < 18) {
  console.error('❌ Node.js 18 or higher is required');
  process.exit(1);
}

interface TokenResponse {
  user: string;
  token: string;
  expiresOn: Date;
}

class ACMeetingCLI {
  private callAgent: any = null;
  private call: any = null;
  private ws: WebSocket | null = null;
  private identityClient: CommunicationIdentityClient;

  constructor() {
    this.identityClient = new CommunicationIdentityClient(
      process.env.ACS_CONNECTION_STRING || ''
    );
  }

  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing ACS call client...');
      
      // Check if ACS connection string is set
      if (!process.env.ACS_CONNECTION_STRING) {
        throw new Error('ACS_CONNECTION_STRING environment variable is not set. Please check your .env file.');
      }
      
      // Lazy load the ACS calling SDK to avoid tsx conflicts
      console.log('📦 Loading Azure Communication Services SDK...');
      const { CallClient } = await import('@azure/communication-calling');
      const { AzureCommunicationTokenCredential } = await import('@azure/communication-common');
      
      // Create ACS user and get token
      console.log('🔑 Creating ACS user and token...');
      const user = await this.identityClient.createUser();
      const tokenResponse = await this.identityClient.getToken(user, ['voip']);
      
      console.log(`✅ ACS user created: ${user.communicationUserId}`);
      
      // Initialize call client
      console.log('📞 Initializing call client...');
      const client = new CallClient();
      const tokenCredential = new AzureCommunicationTokenCredential(tokenResponse.token);
      this.callAgent = await client.createCallAgent(tokenCredential);
      
      console.log('✅ Call agent initialized successfully');
    } catch (error: any) {
      if (error.message?.includes('Cannot redefine property')) {
        console.error('❌ ACS SDK conflict detected. This usually happens when running with tsx.');
        console.error('💡 Try running: npm run cli instead of npm run cli:dev');
        console.error('💡 Or build first: npm run build && node dist/cli.js');
      } else if (error.message?.includes('ACS_CONNECTION_STRING')) {
        console.error('❌ Configuration error:', error.message);
        console.error('💡 Make sure you have created a .env file in the backend directory');
        console.error('💡 Add: ACS_CONNECTION_STRING=your_connection_string_here');
      } else {
        console.error('❌ Failed to initialize call client:', error.message || error);
      }
      throw error;
    }
  }

  async joinMeetingByUrl(meetingUrl: string): Promise<void> {
    if (!this.callAgent) {
      throw new Error('Call agent not initialized');
    }

    try {
      console.log(`🔗 Joining meeting with URL: ${meetingUrl}`);
      
      const locator = { meetingLink: meetingUrl };
      this.call = this.callAgent.join(locator);
      
      console.log('✅ Successfully joined the meeting');
      this.setupAudioStreaming();
      this.setupCallEventHandlers();
      
    } catch (error) {
      console.error('❌ Failed to join meeting:', error);
      throw error;
    }
  }

  async joinMeetingById(meetingId: string, passcode: string): Promise<void> {
    if (!this.callAgent) {
      throw new Error('Call agent not initialized');
    }

    try {
      console.log(`🔗 Joining meeting with ID: ${meetingId}`);
      
      const locator = {
        meetingId: meetingId,
        passcode: passcode
      };
      this.call = this.callAgent.join(locator);
      
      console.log('✅ Successfully joined the meeting');
      this.setupAudioStreaming();
      this.setupCallEventHandlers();
      
    } catch (error) {
      console.error('❌ Failed to join meeting:', error);
      throw error;
    }
  }

  private setupAudioStreaming(): void {
    try {
      console.log('🎵 Setting up audio streaming...');
      
      // Connect to the backend WebSocket
      this.ws = new WebSocket('ws://localhost:3001/audio');
      
      this.ws.on('open', () => {
        console.log('✅ WebSocket connected to backend');
      });
      
      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          if (message.status === 'received') {
            console.log(`📨 Audio chunk processed at ${new Date(message.timestamp).toISOString()}`);
          } else if (message.status === 'error') {
            console.error('❌ Backend audio processing error:', message.message);
          }
        } catch (error) {
          console.error('❌ Failed to parse WebSocket message:', error);
        }
      });
      
      this.ws.on('error', (error: Error) => {
        console.error('❌ WebSocket error:', error);
      });
      
      this.ws.on('close', () => {
        console.log('🔌 WebSocket connection closed');
      });
      
    } catch (error) {
      console.error('❌ Failed to setup audio streaming:', error);
    }
  }

  private setupCallEventHandlers(): void {
    if (!this.call) return;

    this.call.on('stateChanged', () => {
      console.log(`📞 Call state: ${this.call?.state}`);
    });

    this.call.on('remoteParticipantsUpdated', (e: any) => {
      console.log(`👥 Remote participants updated: ${e.added.length} added, ${e.removed.length} removed`);
      
      e.added.forEach((participant: any) => {
        console.log(`👤 Participant joined: ${participant.identifier}`);
        
        // Handle audio streams from participants
        // Note: Audio stream handling requires more complex setup in a real implementation
        console.log('🎵 Participant audio available');
      });

      e.removed.forEach((participant: any) => {
        console.log(`👤 Participant left: ${participant.identifier}`);
      });
    });
  }

  async leaveMeeting(): Promise<void> {
    try {
      if (this.call) {
        console.log('📞 Leaving meeting...');
        await this.call.hangUp();
        this.call = null;
        console.log('✅ Left the meeting');
      }
      
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    } catch (error) {
      console.error('❌ Failed to leave meeting:', error);
    }
  }

  async cleanup(): Promise<void> {
    await this.leaveMeeting();
    console.log('🧹 Cleanup completed');
  }
}

async function main() {
  program
    .name('acs-meeting-cli')
    .description('CLI tool to join Azure Communication Services meetings')
    .version('1.0.0');

  program
    .command('join-url')
    .description('Join a meeting using a Teams meeting URL')
    .argument('<meeting-url>', 'Teams meeting URL')
    .option('-d, --duration <minutes>', 'Duration to stay in meeting (minutes)', '10')
    .action(async (meetingUrl: string, options: any) => {
      const cli = new ACMeetingCLI();
      
      try {
        await cli.initialize();
        await cli.joinMeetingByUrl(meetingUrl);
        
        const duration = parseInt(options.duration) * 60 * 1000; // Convert to milliseconds
        console.log(`⏰ Staying in meeting for ${options.duration} minutes...`);
        console.log('💡 Press Ctrl+C to leave early');
        
        // Setup graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n🛑 Received interrupt signal, leaving meeting...');
          await cli.cleanup();
          process.exit(0);
        });
        
        // Auto-leave after duration
        setTimeout(async () => {
          console.log('⏰ Duration reached, leaving meeting...');
          await cli.cleanup();
          process.exit(0);
        }, duration);
        
      } catch (error) {
        console.error('❌ CLI execution failed:', error);
        await cli.cleanup();
        process.exit(1);
      }
    });

  program
    .command('join-id')
    .description('Join a meeting using meeting ID and passcode')
    .argument('<meeting-id>', 'Meeting ID')
    .argument('<passcode>', 'Meeting passcode')
    .option('-d, --duration <minutes>', 'Duration to stay in meeting (minutes)', '10')
    .action(async (meetingId: string, passcode: string, options: any) => {
      const cli = new ACMeetingCLI();
      
      try {
        await cli.initialize();
        await cli.joinMeetingById(meetingId, passcode);
        
        const duration = parseInt(options.duration) * 60 * 1000; // Convert to milliseconds
        console.log(`⏰ Staying in meeting for ${options.duration} minutes...`);
        console.log('💡 Press Ctrl+C to leave early');
        
        // Setup graceful shutdown
        process.on('SIGINT', async () => {
          console.log('\n🛑 Received interrupt signal, leaving meeting...');
          await cli.cleanup();
          process.exit(0);
        });
        
        // Auto-leave after duration
        setTimeout(async () => {
          console.log('⏰ Duration reached, leaving meeting...');
          await cli.cleanup();
          process.exit(0);
        }, duration);
        
      } catch (error) {
        console.error('❌ CLI execution failed:', error);
        await cli.cleanup();
        process.exit(1);
      }
    });

  await program.parseAsync();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { ACMeetingCLI };