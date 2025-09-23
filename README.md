# Azure Communication Services Calling Web App

This is a TypeScript project with a Fastify backend and React frontend for Azure Communication Services calling with audio transcription capabilities.

## Architecture

The application consists of two main parts:

### Backend (Fastify + TypeScript)
- **Location**: `backend/`
- **Port**: 3001
- **Features**:
  - Azure Communication Services token generation
  - WebSocket connection for real-time audio streaming
  - Audio processing and buffering (30-second chunks)
  - Whisper transcription integration
  - RESTful API endpoints

### Frontend (React + TypeScript)
- **Location**: `frontend/`
- **Port**: 3000
- **Features**:
  - Teams meeting join interface
  - Azure Communication Services calling SDK integration
  - Real-time audio streaming to backend
  - WebSocket communication

## Sequence Diagram

![ACS Sequence Diagram](../docs/images/acs-sequence.svg)

## Prerequisites

- Node.js 18+
- Azure subscription with Communication Services resource
- Teams meeting with anonymous join enabled

## Setup

1. **Clone and install dependencies**:
   ```bash
   npm install
   npm install --workspace=backend
   npm install --workspace=frontend
   ```

2. **Configure environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your ACS connection string
   ```

3. **Build the project**:
   ```bash
   npm run build
   ```

## Development

**Start both backend and frontend in development mode**:
```bash
npm run dev
```

**Or start them separately**:
```bash
# Backend (Terminal 1)
npm run dev:backend

# Frontend (Terminal 2)
npm run dev:frontend
```

## Available Scripts

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both backend and frontend
- `npm run start` - Start production backend server
- `npm run test` - Run tests for both projects

## Environment Variables

### Backend (.env)
```
ACS_CONNECTION_STRING=your_azure_communication_services_connection_string
PORT=3001
NODE_ENV=development
```

## API Endpoints

- `GET /health` - Health check
- `POST /token` - Get ACS token for authentication
- `WebSocket /audio` - Real-time audio streaming

## Usage

1. Start the development servers
2. Open http://localhost:3000 in your browser
3. Enter a Teams meeting URL
4. Click "Join Meeting"
5. The app will connect to the meeting and start streaming audio for transcription

## Technical Details

### Audio Processing Flow
1. Client joins Teams meeting via ACS SDK
2. Raw audio streams are captured from the meeting
3. Audio data is sent to backend via WebSocket
4. Backend buffers audio into 30-second chunks
5. Audio is normalized to 16kHz mono PCM
6. Whisper processes the audio for transcription
7. Transcripts are returned with timestamps

### Dependencies

**Backend**:
- `fastify` - Web framework
- `@azure/communication-*` - Azure Communication Services SDKs
- `typescript` - TypeScript support

**Frontend**:
- `react` - UI framework
- `@azure/communication-calling` - ACS Calling SDK
- `vite` - Build tool and dev server

## Contributing

1. Follow the code quality principles in `.github/copilot-instructions.md`
2. Ensure TypeScript compilation passes
3. Test both backend and frontend functionality

## License

MIT