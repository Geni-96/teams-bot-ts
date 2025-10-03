#!/usr/bin/env node

import { chromium, Browser, Page } from 'playwright';
import dotenv from 'dotenv';
import { program } from 'commander';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';

// Load environment variables
dotenv.config();

interface MeetingOptions {
  meetingUrl?: string;
  meetingId?: string;
  passcode?: string;
  duration: number;
}

class ACMeetingCLIHeadless {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private backendProcess: ChildProcess | null = null;
  private frontendProcess: ChildProcess | null = null;

  constructor() {
    // No-op constructor; environment is loaded via dotenv above
  }

  async startBackend(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🚀 Starting backend server...');
      
      const backendPath = path.join(__dirname, '..');
      this.backendProcess = spawn('npm', ['run', 'dev'], {
        cwd: backendPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let resolved = false;

      this.backendProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`[Backend] ${output.trim()}`);
        
        if (output.includes('Server is running') && !resolved) {
          resolved = true;
          setTimeout(resolve, 2000); // Give it a moment to fully start
        }
      });

      this.backendProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        if (!output.includes('ExperimentalWarning')) {
          console.error(`[Backend Error] ${output.trim()}`);
        }
      });

      this.backendProcess.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Failed to start backend: ${error.message}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Backend startup timeout'));
        }
      }, 30000);
    });
  }

  async startFrontend(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🌐 Starting frontend server...');
      
      const frontendPath = path.join(__dirname, '../../frontend');
      this.frontendProcess = spawn('npm', ['run', 'dev'], {
        cwd: frontendPath,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let resolved = false;

      this.frontendProcess.stdout?.on('data', (data: Buffer) => {
        const output = data.toString();
        console.log(`[Frontend] ${output.trim()}`);
        
        if (output.includes('Local:') && !resolved) {
          resolved = true;
          setTimeout(resolve, 3000); // Give it time to fully start
        }
      });

      this.frontendProcess.stderr?.on('data', (data: Buffer) => {
        const output = data.toString();
        if (!output.includes('ExperimentalWarning')) {
          console.error(`[Frontend Error] ${output.trim()}`);
        }
      });

      this.frontendProcess.on('error', (error) => {
        if (!resolved) {
          resolved = true;
          reject(new Error(`Failed to start frontend: ${error.message}`));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          reject(new Error('Frontend startup timeout'));
        }
      }, 30000);
    });
  }

  async initializeBrowser(): Promise<void> {
    console.log('🎭 Launching headless browser...');
    
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream']
    });
    
    this.page = await this.browser.newPage();
    
    // Grant microphone permissions
    await this.page.context().grantPermissions(['microphone']);
    
    console.log('✅ Browser initialized');
  }

  async joinMeeting(options: MeetingOptions): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    console.log('🔗 Navigating to frontend...');
    await this.page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Wait for the app to load
    await this.page.waitForSelector('input[placeholder*="meeting"]', { timeout: 10000 });

    if (options.meetingUrl) {
      console.log(`🎯 Joining meeting with URL: ${options.meetingUrl}`);
      
      // Select URL method
      await this.page.click('input[value="url"]');
      
      // Enter meeting URL
      await this.page.fill('input[placeholder*="meeting"]', options.meetingUrl);
      
    } else if (options.meetingId && options.passcode) {
      console.log(`🎯 Joining meeting with ID: ${options.meetingId}`);
      
      // Select ID method
      await this.page.click('input[value="id"]');
      
      // Enter meeting ID and passcode
      await this.page.fill('input[placeholder*="Meeting ID"]', options.meetingId);
      await this.page.fill('input[placeholder*="Passcode"]', options.passcode);
    } else {
      throw new Error('Either meetingUrl or both meetingId and passcode must be provided');
    }

    // Click join button
    console.log('📞 Clicking join button...');
    await this.page.click('button:has-text("Join Meeting")');

    // Wait for connection
    console.log('⏳ Waiting for connection...');
    try {
      await this.page.waitForSelector('text=Connected', { timeout: 30000 });
      console.log('✅ Successfully connected to meeting!');
    } catch (error) {
      console.log('⚠️  Connection status unclear, continuing anyway...');
    }

    // Stay in meeting for specified duration
    console.log(`⏰ Staying in meeting for ${options.duration} minutes...`);
    console.log('💡 Press Ctrl+C to leave early');
    
    await new Promise(resolve => {
      setTimeout(resolve, options.duration * 60 * 1000);
    });
  }

  async leaveMeeting(): Promise<void> {
    if (this.page) {
      console.log('📞 Leaving meeting...');
      try {
        await this.page.click('button:has-text("Leave")');
      } catch (error) {
        console.log('💡 Leave button not found, meeting may have ended');
      }
    }
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up...');
    
    if (this.page) {
      await this.page.close();
      this.page = null;
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
    
    if (this.frontendProcess) {
      this.frontendProcess.kill('SIGTERM');
      this.frontendProcess = null;
    }
    
    if (this.backendProcess) {
      this.backendProcess.kill('SIGTERM');
      this.backendProcess = null;
    }
    
    console.log('✅ Cleanup completed');
  }
}

// CLI Program setup
program
  .name('acs-meeting-headless')
  .description('Headless ACS meeting client using browser automation')
  .version('1.0.0');

program
  .command('join-url')
  .description('Join a meeting using a Teams meeting URL')
  .argument('<meeting-url>', 'Teams meeting URL')
  .option('-d, --duration <minutes>', 'Duration to stay in meeting (minutes)', '5')
  .action(async (meetingUrl: string, options: any) => {
    const cli = new ACMeetingCLIHeadless();
    
    try {
      const duration = parseInt(options.duration);
      
      // Setup graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Received interrupt signal, cleaning up...');
        await cli.cleanup();
        process.exit(0);
      });
      
      await cli.startBackend();
      await cli.startFrontend();
      await cli.initializeBrowser();
      
      await cli.joinMeeting({
        meetingUrl,
        duration
      });
      
      await cli.leaveMeeting();
      
    } catch (error: any) {
      console.error('❌ Headless CLI execution failed:', error.message);
      process.exit(1);
    } finally {
      await cli.cleanup();
    }
  });

program
  .command('join-id')
  .description('Join a meeting using meeting ID and passcode')
  .argument('<meeting-id>', 'Meeting ID')
  .argument('<passcode>', 'Meeting passcode')
  .option('-d, --duration <minutes>', 'Duration to stay in meeting (minutes)', '5')
  .action(async (meetingId: string, passcode: string, options: any) => {
    const cli = new ACMeetingCLIHeadless();
    
    try {
      const duration = parseInt(options.duration);
      
      // Setup graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n🛑 Received interrupt signal, cleaning up...');
        await cli.cleanup();
        process.exit(0);
      });
      
      await cli.startBackend();
      await cli.startFrontend();
      await cli.initializeBrowser();
      
      await cli.joinMeeting({
        meetingId,
        passcode,
        duration
      });
      
      await cli.leaveMeeting();
      
    } catch (error: any) {
      console.error('❌ Headless CLI execution failed:', error.message);
      process.exit(1);
    } finally {
      await cli.cleanup();
    }
  });

export { ACMeetingCLIHeadless };

// Run the program if this file is executed directly
if (require.main === module) {
  program.parseAsync().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}