import React, { useState, useRef, useEffect } from 'react';
import { CallClient, CallAgent, Call } from '@azure/communication-calling';
import { AzureCommunicationTokenCredential } from '@azure/communication-common';
import './App.css';

interface TokenResponse {
  user: string;
  token: string;
  expiresOn: Date;
}

function App() {
  const [callAgent, setCallAgent] = useState<CallAgent | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const [meetingUrl, setMeetingUrl] = useState<string>('');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
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
    if (!callAgent || !meetingUrl.trim()) {
      alert('Please enter a valid meeting URL');
      return;
    }

    try {
      setConnectionStatus('Connecting...');
      
      const locator = { meetingLink: meetingUrl };
      const joinedCall = callAgent.join(locator);
      
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
    wsRef.current = new WebSocket('ws://localhost:3001/audio');
    
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
        <h1>Azure Communication Services Calling App</h1>
        <p>Status: {connectionStatus}</p>
        
        {!isInitialized && (
          <div>
            <p>Initializing call client...</p>
          </div>
        )}
        
        {isInitialized && !call && (
          <div>
            <input
              type="text"
              value={meetingUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMeetingUrl(e.target.value)}
              placeholder="Enter Teams meeting URL"
              style={{ width: '300px', margin: '10px', padding: '10px' }}
            />
            <br />
            <button onClick={joinMeeting} style={{ padding: '10px 20px', margin: '10px' }}>
              Join Meeting
            </button>
          </div>
        )}
        
        {call && (
          <div>
            <p>Connected to meeting</p>
            <button onClick={leaveMeeting} style={{ padding: '10px 20px', margin: '10px' }}>
              Leave Meeting
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;