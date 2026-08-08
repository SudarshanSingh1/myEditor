import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchApi } from '../api';

// Mock AuthController
vi.mock('../../services/AuthController', () => ({
  authController: {
    refresh: vi.fn()
  }
}));

// Mock useUserStore
vi.mock('../../stores/useUserStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({ 
      authState: 'UNKNOWN',
      setAuthState: vi.fn()
    }))
  }
}));

// Setup global fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('fetchApi interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles successful requests normally', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true })
    });

    const data = await fetchApi('/test-endpoint');
    expect(data).toEqual({ success: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('retries exactly once upon 401', async () => {
    const { authController } = await import('../../services/AuthController');
    (authController.refresh as any).mockResolvedValueOnce(true);

    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 1 }) });

    const res = await fetchApi('/test-1');
    expect(res).toEqual({ id: 1 });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('does not retry if refresh fails and throws auth error', async () => {
    const { authController } = await import('../../services/AuthController');
    (authController.refresh as any).mockResolvedValueOnce(false);

    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });

    await expect(fetchApi('/test-4')).rejects.toThrow('Authentication failed.');
    
    // Should not have attempted a retry
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
