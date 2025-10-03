import React, { useState, useRef, useEffect } from 'react';
import {
  CallClient,
  CallAgent,
  Call,
  TeamsMeetingLinkLocator,
  TeamsMeetingIdLocator
} from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import './App.css';

interface TokenResponse {
  user: string;
  token: string;
  expiresOn: string; // backend serializes Date to ISO string
}

// Augment Window to avoid using `any` for a dev-mode init guard
declare global {
  interface Window {
    __APP_INIT__?: boolean;
  }
}

function App() {
  const [callAgent, setCallAgent] = useState<CallAgent | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [meetingUrl, setMeetingUrl] = useState<string>('');
  const [meetingId, setMeetingId] = useState<string>('');
  const [passcode, setPasscode] = useState<string>('');
  const [joinMethod, setJoinMethod] = useState<'url' | 'id'>('url');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const didInitRef = useRef<boolean>(false); // guard StrictMode re-mounts per instance

  useEffect(() => {
    // In Vite dev, prevent duplicate init across StrictMode remounts
    if (import.meta.env.MODE === 'development') {
      if (typeof window !== 'undefined') {
        if (window.__APP_INIT__) return;
        window.__APP_INIT__ = true;
      }
    } else {
      if (didInitRef.current) return;
      didInitRef.current = true;
    }
    initializeCallClient();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const initializeCallClient = async () => {
    try {
      // Get ACS token
      const response = await fetch('/api/token', { method: 'POST' });
      const tokenData: TokenResponse = await response.json();
      
      // Initialize call client
      const client = new CallClient();
      const tokenCredential = new AzureCommunicationTokenCredential(tokenData.token);
      const agent = await client.createCallAgent(tokenCredential);
      await client.getDeviceManager(); // Initialize device manager but don't store if not used

      setCallAgent(agent);
      setIsInitialized(true);
      setConnectionStatus('Initialized');
    } catch (error) {
      console.error('Failed to initialize call client:', error);
      setConnectionStatus('Failed to initialize');
    }
  };

  const joinMeeting = async () => {
    if (!callAgent) {
      alert('Call agent not initialized');
      return;
    }

    // Validate inputs based on join method
    if (joinMethod === 'url') {
      if (!meetingUrl.trim()) {
        alert('Please enter a valid meeting URL');
        return;
      }
    } else {
      if (!meetingId.trim()) {
        alert('Please enter a valid meeting ID');
        return;
      }
      if (!passcode.trim()) {
        alert('Please enter a valid passcode');
        return;
      }
    }

    try {
      setConnectionStatus('Connecting...');
      
      let joinedCall: Call;
      if (joinMethod === 'url') {
        const locator: TeamsMeetingLinkLocator = { meetingLink: meetingUrl };
        joinedCall = callAgent.join(locator);
      } else {
        const locator: TeamsMeetingIdLocator = {
          meetingId: meetingId,
          passcode: passcode
        };
        joinedCall = callAgent.join(locator);
      }
      
      setCall(joinedCall);
      setConnectionStatus('Connected');

      // Set up audio streaming
      setupAudioStreaming();

    } catch (error) {
      console.error('Failed to join meeting:', error);
      setConnectionStatus('Failed to connect');
    }
  };

  const setupAudioStreaming = () => {
    // Initialize WebSocket connection for audio streaming
    // Use a relative path so Vite proxy (dev) and same-origin (prod) handle host/scheme
    wsRef.current = new WebSocket('/audio');
    
    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
    };
    
    wsRef.current.onmessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      console.log('Received from server:', data);
    };
    
    wsRef.current.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
    };

    // TODO: Set up raw audio stream subscription when available
    // This requires the preview SDK features for raw media access
  };

  const leaveMeeting = () => {
    if (call) {
      call.hangUp();
      setCall(null);
      setConnectionStatus('Disconnected');
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Serene Connect</h1>
        <p className="status-text">Status: {connectionStatus}</p>
        
        {!isInitialized && (
          <div>
            <p>Initializing call client...</p>
          </div>
        )}
        
        {isInitialized && !call && (
          <div className="join-container">
            <div className="join-method-section">
              <h3>Choose Join Method:</h3>
              <label className="radio-option">
                <input
                  type="radio"
                  name="joinMethod"
                  value="url"
                  checked={joinMethod === 'url'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinMethod(e.target.value as 'url' | 'id')}
                />
                Join with Meeting URL
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="joinMethod"
                  value="id"
                  checked={joinMethod === 'id'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinMethod(e.target.value as 'url' | 'id')}
                />
                Join with Meeting ID & Passcode
              </label>
            </div>

            {joinMethod === 'url' && (
              <div className="input-section">
                <input
                  type="text"
                  value={meetingUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMeetingUrl(e.target.value)}
                  placeholder="Enter Teams meeting URL"
                  className="meeting-input"
                />
              </div>
            )}

            {joinMethod === 'id' && (
              <div className="input-section">
                <input
                  type="text"
                  value={meetingId}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMeetingId(e.target.value)}
                  placeholder="Enter Meeting ID"
                  className="meeting-input"
                />
                <input
                  type="text"
                  value={passcode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPasscode(e.target.value)}
                  placeholder="Enter Passcode"
                  className="meeting-input"
                />
              </div>
            )}

            <button onClick={joinMeeting} className="join-button">
              Join Meeting
            </button>
          </div>
        )}
        
        {call && (
          <div className="join-container">
            <p>Connected to meeting</p>
            <button onClick={leaveMeeting} className="leave-button">
              Leave Meeting
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;