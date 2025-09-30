# ACS Meeting CLI

A command-line interface tool for joining Azure Communication Services meetings without a graphical frontend.

## Prerequisites

1. Ensure you have the ACS connection string set in your environment variables or `.env` file:
   ```
   ACS_CONNECTION_STRING=your_acs_connection_string_here
   ```

2. Make sure the backend server is running:
   ```bash
   npm run dev:backend
   ```

## Installation

The CLI tool is part of the backend workspace. All dependencies are installed when you run:

```bash
npm install
```

## Usage

The CLI tool supports two methods of joining meetings. **Important**: The CLI uses compiled JavaScript to avoid conflicts with the ACS SDK.

### Method 1: Join using Teams Meeting URL

```bash
npm run cli --workspace=backend -- join-url "https://teams.microsoft.com/l/meetup-join/your-meeting-url"
```

With custom duration (default is 10 minutes):
```bash
npm run cli --workspace=backend -- join-url "https://teams.microsoft.com/l/meetup-join/your-meeting-url" --duration 30
```

### Method 2: Join using Meeting ID and Passcode

```bash
npm run cli --workspace=backend -- join-id "meeting-id" "passcode"
```

With custom duration:
```bash
npm run cli --workspace=backend -- join-id "meeting-id" "passcode" --duration 15
```

### Quick Commands (from root directory)

```bash
# Show help
npm run cli --workspace=backend -- --help

# Join with URL
npm run cli --workspace=backend -- join-url "meeting-url" --duration 5

# Join with ID and passcode  
npm run cli --workspace=backend -- join-id "123456" "abc123" --duration 10
```

## Options

- `--duration <minutes>` or `-d <minutes>`: Specify how long to stay in the meeting (default: 10 minutes)

## Examples

1. **Join a Teams meeting for 5 minutes:**
   ```bash
   npm run cli --workspace=backend -- join-url "https://teams.microsoft.com/l/meetup-join/19%3ameeting_example" --duration 5
   ```

2. **Join using meeting ID and stay for 20 minutes:**
   ```bash
   npm run cli --workspace=backend -- join-id "123456789" "abc123" --duration 20
   ```

3. **Exit early:** Press `Ctrl+C` to leave the meeting before the duration expires

### Alternative: Direct backend commands

If you're working in the backend directory:
```bash
cd backend
npm run cli join-url "meeting-url" --duration 5
npm run cli join-id "meeting-id" "passcode" --duration 10
```

## Features

- ✅ Headless meeting joining (no GUI required)
- ✅ Support for both Teams meeting URLs and meeting ID/passcode
- ✅ Audio streaming to backend for processing
- ✅ Graceful shutdown with Ctrl+C
- ✅ Configurable meeting duration
- ✅ Real-time participant tracking
- ✅ WebSocket integration with backend

## How it Works

1. **Initialization**: Creates an ACS user and generates an access token
2. **Meeting Join**: Connects to the specified Teams meeting
3. **Audio Streaming**: Sets up WebSocket connection to backend for audio processing
4. **Event Handling**: Monitors call state and participant changes
5. **Cleanup**: Gracefully leaves the meeting and closes connections

## Troubleshooting

### Common Issues

1. **"Cannot redefine property: name" error**
   - This happens when using tsx with the ACS SDK
   - **Solution**: Use the compiled version: `npm run cli` (not `npm run cli:dev`)
   - The CLI automatically builds before running to avoid this issue

2. **"Call agent not initialized"**
   - Ensure your ACS connection string is valid
   - Check that the ACS service is properly configured
   - Verify the connection string format in .env file

3. **"ACS_CONNECTION_STRING environment variable is not set"**
   - Copy `.env.example` to `.env` in the backend directory
   - Add your ACS connection string to the .env file
   - Format: `ACS_CONNECTION_STRING=endpoint=https://...;accesskey=...`

4. **"Failed to join meeting"**
   - Verify the meeting URL/ID and passcode are correct
   - Ensure the meeting is active and joinable
   - Check that anonymous join is enabled for the meeting

### Logs

The CLI provides detailed logging with emojis for easy identification:
- 🔧 Initialization steps
- ✅ Successful operations
- ❌ Errors and failures
- 📞 Call state changes
- 👥 Participant updates
- 🎵 Audio-related events
- ⏰ Timing information

## Development

To modify the CLI tool, edit the file:
```
backend/src/cli.ts
```

Build the project:
```bash
npm run build:backend
```

For development with hot-reload:
```bash
# Terminal 1: Start backend server
npm run dev:backend

# Terminal 2: Run CLI commands
npm run cli join-url "your-meeting-url"
```

### Example Bot Usage

An example bot script is provided to demonstrate programmatic usage:

```bash
# Run the example bot with a meeting URL
npm run example "https://teams.microsoft.com/l/meetup-join/your-meeting-url"
```

The example bot (`backend/src/example-bot.ts`) shows how to:
- Automatically start the backend server
- Join meetings programmatically
- Handle process lifecycle
- Implement automated testing scenarios

You can use this as a starting point for building your own automated meeting bots.

## Architecture

The CLI tool integrates with the existing architecture:

```
CLI Tool (cli.ts)
    ↓
ACS SDK (Call Client)
    ↓
Teams Meeting
    ↓
Audio Stream → WebSocket → Backend Server (server.ts)
    ↓
Audio Processing (audioProcessor.ts)
```

## Security Notes

- Connection strings and tokens are handled securely
- All communications use HTTPS/WSS protocols
- No meeting data is stored locally
- Automatic cleanup of resources on exit