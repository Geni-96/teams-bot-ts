import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header and updates initialization status', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Serene Connect'
    );

    expect(await screen.findByText(/Status: Initialized/i)).toBeInTheDocument();
  });

  it('allows switching to meeting ID join method', async () => {
    render(<App />);

    await screen.findByText(/Status: Initialized/i);

    const idOption = screen.getByLabelText('Join with Meeting ID & Passcode');
    fireEvent.click(idOption);

    expect(screen.getByPlaceholderText('Enter Meeting ID')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Passcode')).toBeInTheDocument();
  });

  it('shows an alert when attempting to join without a URL', async () => {
    render(<App />);

    await screen.findByText(/Status: Initialized/i);

    const joinButton = screen.getByRole('button', { name: /Join Meeting/i });
    fireEvent.click(joinButton);

    expect(window.alert).toHaveBeenCalled();
  });
});
