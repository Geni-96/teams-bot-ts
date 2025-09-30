# CLI Troubleshooting Guide

## ❌ "screen is not defined" / "MediaStream is not defined" Errors

These errors occur because the Azure Communication Services Calling SDK requires browser APIs that don't exist in Node.js environments.

### ✅ **Complete Solution: Headless Browser CLI**

Instead of trying to polyfill browser APIs, use the **headless browser CLI** that runs a real browser behind the scenes:

**✅ Use the headless CLI for real functionality:**
```bash
npm run cli:headless --workspace=backend -- join-url "https://teams.microsoft.com/..." --duration 5
npm run cli:headless --workspace=backend -- join-id "meeting-id" "passcode" --duration 5
```

**✅ Or use the simplified CLI for testing:**
```bash
npm run cli:simple --workspace=backend -- test-auth
npm run cli:simple --workspace=backend -- simulate-join "url" --duration 2
```

### 🔧 **Why These Errors Happen**

The ACS Calling SDK needs many browser-only APIs:
- `MediaStream` for audio/video streams
- `screen` object for display information
- `RTCPeerConnection` for WebRTC
- `getUserMedia()` for microphone access
- Browser security context and permissions

These APIs simply don't exist in Node.js and can't be effectively polyfilled.

### 🚀 **Working Solutions**

#### 1. **Headless Browser CLI** (Full Functionality)
```bash
# Real meeting joining with automation
npm run cli:headless --workspace=backend -- join-url "meeting-url" --duration 5
```
- ✅ Uses real browser (Chromium)
- ✅ Full ACS functionality
- ✅ Actual audio processing
- ✅ Automated server management

#### 2. **Simplified CLI** (Testing & Integration)
```bash
# Authentication and backend testing
npm run cli:simple --workspace=backend -- test-auth
```
- ✅ Node.js compatible
- ✅ Fast and lightweight
- ✅ Perfect for CI/CD

#### 3. **Browser Frontend** (Development)
```bash
# Manual interface for development
npm run dev
```
- ✅ Visual debugging
- ✅ Full feature access
- ✅ Manual control

### 🚀 **Quick Commands**

```bash
# From project root - show help
npm run cli --workspace=backend -- --help

# Join meeting with URL
npm run cli --workspace=backend -- join-url "https://teams.microsoft.com/..." --duration 5

# Join with meeting ID and passcode
npm run cli --workspace=backend -- join-id "123456" "password" --duration 10

# From backend directory directly
cd backend
npm run cli join-url "meeting-url" --duration 5
```

### 🐛 **Other Common Issues**

1. **Missing ACS Connection String**
   ```
   Error: ACS_CONNECTION_STRING environment variable is not set
   ```
   **Fix**: Copy `backend/.env.example` to `backend/.env` and add your ACS connection string

2. **Backend Not Running**
   ```
   Error: WebSocket connection failed
   ```
   **Fix**: Start the backend server first: `npm run dev:backend`

3. **Invalid Meeting URL/ID**
   ```
   Error: Failed to join meeting
   ```
   **Fix**: Verify the meeting URL is correct and the meeting allows anonymous join

### 💡 **Pro Tips**

- Always start the backend server before using the CLI
- Use short durations for testing (e.g., `--duration 2`)
- Check the backend logs for detailed error information
- Press `Ctrl+C` to exit early if needed

### 🔍 **Development vs Production**

- **Development**: `npm run cli:dev` (uses tsx, may have conflicts)
- **Production**: `npm run cli` (uses compiled JS, recommended)

For the most reliable experience, always use the compiled version (`npm run cli`).