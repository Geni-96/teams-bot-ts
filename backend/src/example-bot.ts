#!/usr/bin/env node

/**
 * Example script showing how to use the ACS Meeting CLI programmatically
 * This demonstrates automated meeting joining for testing or bot scenarios
 */

import { spawn } from 'child_process';
import path from 'path';

interface MeetingConfig {
  type: 'url' | 'id';
  meetingUrl?: string;
  meetingId?: string;
  passcode?: string;
  duration?: number;
}

class MeetingBot {
  private backendProcess: any = null;
  private cliProcess: any = null;

  async startBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting backend server...');
      
      this.backendProcess = spawn('npm', ['run', 'dev:backend'], {
        cwd: path.join(__dirname, '..', '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.backendProcess.stdout.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`Backend: ${output.trim()}`);
        
        // Check if server is ready
        if (output.includes('Server is running')) {
          console.log('✅ Backend server is ready');
          resolve();
        }
      });

      this.backendProcess.stderr.on('data', (data: Buffer) => {
        console.error(`Backend Error: ${data.toString()}`);
      });

      this.backendProcess.on('error', (error: Error) => {
        console.error('❌ Failed to start backend:', error);
        reject(error);
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Backend startup timeout'));
      }, 30000);
    });
  }

  async joinMeeting(config: MeetingConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔗 Joining meeting...');
      
      let args: string[] = ['run', 'cli'];
      
      if (config.type === 'url' && config.meetingUrl) {
        args.push('join-url', config.meetingUrl);
      } else if (config.type === 'id' && config.meetingId && config.passcode) {
        args.push('join-id', config.meetingId, config.passcode);
      } else {
        reject(new Error('Invalid meeting configuration'));
        return;
      }

      if (config.duration) {
        args.push('--duration', config.duration.toString());
      }

      this.cliProcess = spawn('npm', args, {
        cwd: path.join(__dirname, '..', '..'),
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.cliProcess.stdout.on('data', (data: Buffer) => {
        console.log(`CLI: ${data.toString().trim()}`);
      });

      this.cliProcess.stderr.on('data', (data: Buffer) => {
        console.error(`CLI Error: ${data.toString().trim()}`);
      });

      this.cliProcess.on('close', (code: number) => {
        if (code === 0) {
          console.log('✅ Meeting session completed successfully');
          resolve();
        } else {
          console.error(`❌ CLI process exited with code ${code}`);
          reject(new Error(`CLI process failed with code ${code}`));
        }
      });

      this.cliProcess.on('error', (error: Error) => {
        console.error('❌ Failed to start CLI:', error);
        reject(error);
      });
    });
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up processes...');
    
    if (this.cliProcess) {
      this.cliProcess.kill('SIGTERM');
      this.cliProcess = null;
    }

    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      this.backendProcess = null;
    }

    console.log('✅ Cleanup completed');
  }
}

// Example usage
async function runExample() {
  const bot = new MeetingBot();

  try {
    // Start the backend server
    await bot.startBackend();
    
    // Wait a bit for the server to fully initialize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Example meeting configuration
    const meetingConfig: MeetingConfig = {
      type: 'url',
      meetingUrl: process.argv[2] || 'https://teams.microsoft.com/l/meetup-join/example',
      duration: 2 // Stay for 2 minutes
    };

    console.log('📋 Meeting Configuration:', meetingConfig);

    // Join the meeting
    await bot.joinMeeting(meetingConfig);

  } catch (error) {
    console.error('❌ Example failed:', error);
  } finally {
    await bot.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received interrupt signal');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received terminate signal');
  process.exit(0);
});

// Run the example if this file is executed directly
if (require.main === module) {
  console.log('🤖 ACS Meeting Bot Example');
  console.log('Usage: npm run example [meeting-url]');
  console.log('');
  
  runExample().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { MeetingBot, MeetingConfig };