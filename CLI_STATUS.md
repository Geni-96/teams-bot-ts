# ACS CLI Implementation Status

## ✅ Supported CLI

### Headless Automation (`backend/src/cli-headless.ts`)

The headless CLI is the single supported entry point. It launches the backend and frontend automatically, opens a headless Chromium instance with Playwright, joins the meeting through the standard UI, and keeps the session alive for the requested duration.

```bash
# Join a meeting via URL for the default 5 minutes
npm run cli --workspace=backend -- join-url "https://teams.microsoft.com/l/meetup-join/..."

# Join via meeting ID + passcode for 15 minutes
npm run cli --workspace=backend -- join-id "MEETING_ID" "PASSCODE" --duration 15
```

**Highlights:**
- ✅ Reuses the production browser workflow via automation
- ✅ Handles backend/frontend lifecycle automatically
- ✅ Works well for bots, regression tests, and unattended monitoring
- ✅ Gracefully cleans up processes and browser instances

## 🗑️ Removed Variants

The earlier attempts (`cli.ts` and `cli-simple.ts`) have been deleted. They relied on heavy polyfills or simulated behaviour and routinely broke in real scenarios. Keeping them caused confusion, so the repository now focuses solely on the reliable headless path.

## 🚀 Usage Checklist

1. Define `ACS_CONNECTION_STRING` in `backend/.env`.
2. Ensure Node.js ≥ 18 is installed.
3. Run one of the commands above with your Teams meeting details.
4. Watch the terminal output for backend/frontend readiness and connection status.

## � Troubleshooting Tips

- The CLI times out after 30 seconds if backend or frontend fails to boot; check their logs in the CLI output.
- Make sure no other process is already bound to ports 3000 or 3001.
- Playwright must be installed (it is pulled in via the backend workspace). If browsers were never installed locally, run `npx playwright install` once.

The project documentation and scripts now point exclusively to the headless CLI so every automation workflow shares the same proven implementation.