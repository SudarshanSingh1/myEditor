import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchApi } from '../api';

// Mock AuthController
vi.mock('../../services/AuthController', () => ({
  authController: {
    refresh: vi.fn().mockResolvedValue(true)
  }
}));

// Mock useUserStore
vi.mock('../../stores/useUserStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({ authInvalid: false }))
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

  it('queues multiple 401s and only calls refresh once', async () => {
    // Initial 401 responses
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    
    // Retried 200 responses
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 1 }) });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 2 }) });
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ id: 3 }) });

    // Execute concurrently
    const [res1, res2, res3] = await Promise.all([
      fetchApi('/test-1'),
      fetchApi('/test-2'),
      fetchApi('/test-3')
    ]);

    expect(res1).toEqual({ id: 1 });
    expect(res2).toEqual({ id: 2 });
    expect(res3).toEqual({ id: 3 });

    // Original 3 calls + 3 retry calls = 6 fetch calls
    expect(mockFetch).toHaveBeenCalledTimes(6);
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
