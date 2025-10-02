#!/bin/bash

# Demo script for the headless ACS Meeting CLI
# This script demonstrates the different ways to use the browser-automation CLI

echo "🎯 ACS Headless Meeting CLI Demo"
echo "======================="
echo ""

# Check if we have the required environment variable
if [ -z "$ACS_CONNECTION_STRING" ]; then
    echo "⚠️  Warning: ACS_CONNECTION_STRING environment variable not set"
    echo "   Please set it in your .env file or environment"
    echo ""
fi

echo "📋 Available Commands:"
echo ""

echo "1️⃣  Join meeting with URL (5 minutes):"
echo "   npm run cli --workspace=backend -- join-url \"https://teams.microsoft.com/l/meetup-join/YOUR_MEETING_URL\" --duration 5"
echo ""

echo "2️⃣  Join meeting with ID and passcode (10 minutes):"
echo "   npm run cli --workspace=backend -- join-id \"YOUR_MEETING_ID\" \"YOUR_PASSCODE\" --duration 10"
echo ""

echo "3️⃣  Show CLI help:"
echo "   npm run cli --workspace=backend -- --help"
echo ""

echo "4️⃣  Run example bot (automated headless run):"
echo "   npm run example --workspace=backend -- \"https://teams.microsoft.com/l/meetup-join/YOUR_MEETING_URL\""
echo ""

echo "📚 Quick Reference:"
echo "   --duration <min>  : How long to stay in meeting (default: 5)"
echo "   Ctrl+C           : Exit early"
echo ""

echo "🚀 Prerequisites:"
echo "   1. Valid ACS connection string in backend/.env"
echo "   2. Playwright browsers installed (npx playwright install)"
echo "   3. Valid Teams meeting URL or ID/passcode"
echo ""

echo "💡 Pro Tips:"
echo "   - Everything runs headlessly; use --duration 1 for smoke tests"
echo "   - Logs prefixed with [Backend] and [Frontend] identify which service is talking"
echo "   - Ports 3000/3001 must be free before launching"
echo ""

# If arguments provided, run the command
if [ "$#" -gt 0 ]; then
    echo "🎬 Running: npm run cli --workspace=backend -- $@"
    echo ""
    npm run cli --workspace=backend -- "$@"
fi