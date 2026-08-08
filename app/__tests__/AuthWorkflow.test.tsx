import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BootstrapManager } from '../components/layout/BootstrapManager';
import { useUserStore } from '../stores/useUserStore';

// We just test the BootstrapManager which orchestrates the auth lifecycle
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Authentication Runtime Workflow Verification', () => {
  let fetchMock: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    useUserStore.setState({
      authState: 'UNKNOWN',
      user: null,
    });
    
    fetchMock = vi.spyOn(global, 'fetch').mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/system/status')) {
        return new Response(JSON.stringify({ status: 'healthy', maintenance_mode: false, version: '1.0' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/auth/me')) {
        return new Response(JSON.stringify({ success: true, data: { id: 1, email: 'test@example.com' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/rbac/my-permissions')) {
        return new Response(JSON.stringify({ success: true, permissions: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({}), { status: 404, headers: { 'Content-Type': 'application/json' } });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('verifies that exactly ONE /auth/me request is made during startup (No Race Conditions, No Duplicate Checks)', async () => {
    render(
      <TestWrapper>
        <BootstrapManager>
          <div data-testid="app-content">App Loaded</div>
        </BootstrapManager>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });

    const calls = fetchMock.mock.calls;
    const authMeCalls = calls.filter(c => c[0].toString().includes('/auth/me'));
    
    // There must be exactly ONE call to /auth/me to verify no loops or duplicates
    expect(authMeCalls.length).toBe(1);
    
    const userState = useUserStore.getState();
    expect(userState.authState).toBe('AUTHENTICATED');
    expect(userState.user?.email).toBe('test@example.com');
  });
  
  it('verifies refresh flow when /auth/me returns 401', async () => {
    let meCount = 0;
    fetchMock.mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/system/status')) {
        return new Response(JSON.stringify({ status: 'healthy', maintenance_mode: false, version: '1.0' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/auth/me')) {
        meCount++;
        if (meCount === 1) {
          return new Response(JSON.stringify({ detail: 'Token expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ success: true, data: { id: 1, email: 'test@example.com' } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/auth/refresh')) {
        return new Response(JSON.stringify({ success: true, access_token: 'new-token' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/rbac/my-permissions')) {
        return new Response(JSON.stringify({ success: true, permissions: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({}), { status: 404, headers: { 'Content-Type': 'application/json' } });
    });

    render(
      <TestWrapper>
        <BootstrapManager>
          <div data-testid="app-content">App Loaded</div>
        </BootstrapManager>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });

    const calls = fetchMock.mock.calls;
    const refreshCalls = calls.filter(c => c[0].toString().includes('/auth/refresh'));
    
    // Refresh must be called exactly once
    expect(refreshCalls.length).toBe(1);
    
    // AuthMe is called initially (401), triggers refresh, and does NOT loop unnecessarily
    // Actually the retry mechanism in fetchApi will retry it once
    const authMeCalls = calls.filter(c => c[0].toString().includes('/auth/me'));
    expect(authMeCalls.length).toBe(2);
    
    const userState = useUserStore.getState();
    expect(userState.authState).toBe('AUTHENTICATED');
  });

  it('verifies fallback to guest mode when refresh fails (No Refresh Loops)', async () => {
    fetchMock.mockImplementation(async (url) => {
      const urlStr = url.toString();
      if (urlStr.includes('/system/status')) {
        return new Response(JSON.stringify({ status: 'healthy', maintenance_mode: false, version: '1.0' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/auth/me')) {
        return new Response(JSON.stringify({ detail: 'Token expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/auth/refresh')) {
        return new Response(JSON.stringify({ detail: 'Refresh token expired' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/guest/init')) {
        return new Response(JSON.stringify({ access_token: 'guest-token' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (urlStr.includes('/rbac/my-permissions')) {
        return new Response(JSON.stringify({ success: true, permissions: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({}), { status: 404, headers: { 'Content-Type': 'application/json' } });
    });

    render(
      <TestWrapper>
        <BootstrapManager>
          <div data-testid="app-content">App Loaded</div>
        </BootstrapManager>
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });

    const calls = fetchMock.mock.calls;
    const refreshCalls = calls.filter(c => c[0].toString().includes('/auth/refresh'));
    const guestInitCalls = calls.filter(c => c[0].toString().includes('/guest/init'));
    
    // Refresh must be called exactly once
    expect(refreshCalls.length).toBe(1);
    
    // Guest init should happen as fallback
    expect(guestInitCalls.length).toBe(1);
    
    const userState = useUserStore.getState();
    expect(userState.authState).toBe('GUEST');
  });
});
