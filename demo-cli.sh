#!/bin/bash

# Demo script for ACS Meeting CLI
# This script demonstrates the different ways to use the CLI tool

echo "🎯 ACS Meeting CLI Demo"
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

echo "4️⃣  Run example bot (automated):"
echo "   npm run example --workspace=backend -- \"https://teams.microsoft.com/l/meetup-join/YOUR_MEETING_URL\""
echo ""

echo "📚 Quick Reference:"
echo "   --duration <min>  : How long to stay in meeting (default: 10)"
echo "   Ctrl+C           : Exit early"
echo ""

echo "🚀 Prerequisites:"
echo "   1. Backend server must be running: npm run dev:backend"
echo "   2. Valid ACS connection string in .env"
echo "   3. Valid Teams meeting URL or ID/passcode"
echo ""

echo "💡 Pro Tips:"
echo "   - Test with a personal Teams meeting first"
echo "   - Check backend logs for detailed debugging"
echo "   - Use short durations for testing"
echo ""

# If arguments provided, run the command
if [ "$#" -gt 0 ]; then
    echo "🎬 Running: npm run cli --workspace=backend -- $@"
    echo ""
    npm run cli --workspace=backend -- "$@"
fi