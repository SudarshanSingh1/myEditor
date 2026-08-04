import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authController } from '../AuthController';
import { useUserStore } from '../../stores/useUserStore';
import { useSystemStore } from '../../stores/useSystemStore';
import * as api from '../../lib/api';
import { queryClient } from '../../lib/queryClient';

// Mock the API fetcher
vi.mock('../../lib/api', () => ({
  fetchApi: vi.fn(),
}));

describe('AuthController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authController.destroy();
    
    // Reset stores
    useUserStore.setState({
      user: null,
      permissions: [],
      authState: 'UNKNOWN',
      guestQuota: null
    });
    
    useSystemStore.setState({
      isMaintenanceMode: false,
      hasChecked: true
    });
  });

  it('should transition to AUTHENTICATED on successful bootstrap', async () => {
    vi.mocked(api.fetchApi).mockResolvedValueOnce({
      success: true,
      data: { id: 1, email: 'test@test.com' }
    });

    const result = await authController.bootstrap();
    
    expect(result).toBe(true);
    expect(useUserStore.getState().authState).toBe('AUTHENTICATED');
    expect(useUserStore.getState().user?.email).toBe('test@test.com');
  });

  it('should singleton multiple concurrent bootstrap calls', async () => {
    vi.mocked(api.fetchApi).mockImplementation(async () => {
      await new Promise(r => setTimeout(r, 50));
      return { success: true, data: { id: 1 } };
    });

    const p1 = authController.bootstrap();
    const p2 = authController.bootstrap();
    
    await Promise.all([p1, p2]);
    
    // fetchApi should only be called once for /auth/me
    const authMeCalls = vi.mocked(api.fetchApi).mock.calls.filter(call => call[0] === '/auth/me');
    expect(authMeCalls.length).toBe(1);
    expect(useUserStore.getState().authState).toBe('AUTHENTICATED');
  });

  it('should refresh and retry if auth/me returns 401', async () => {
    // 1. auth/me fails
    vi.mocked(api.fetchApi).mockRejectedValueOnce({ status: 401 });
    // 2. refresh succeeds
    vi.mocked(api.fetchApi).mockResolvedValueOnce({ success: true });
    // 3. auth/me retry succeeds
    vi.mocked(api.fetchApi).mockResolvedValueOnce({
      success: true,
      data: { id: 2, email: 'retry@test.com' }
    });

    const result = await authController.bootstrap();
    
    expect(result).toBe(true);
    expect(api.fetchApi).toHaveBeenCalledTimes(3);
    expect(api.fetchApi).toHaveBeenNthCalledWith(2, '/auth/refresh', expect.anything());
    expect(useUserStore.getState().authState).toBe('AUTHENTICATED');
  });

  it('should fallback to guest if refresh fails', async () => {
    // 1. auth/me fails
    vi.mocked(api.fetchApi).mockRejectedValueOnce({ status: 401 });
    // 2. refresh fails
    vi.mocked(api.fetchApi).mockRejectedValueOnce({ status: 401 });
    // 3. guest init succeeds
    vi.mocked(api.fetchApi).mockResolvedValueOnce({
      access_token: 'guest_token',
      executions_used: 0,
      executions_max: 10,
      expires_at: new Date(Date.now() + 86400000).toISOString()
    });

    const result = await authController.bootstrap();
    
    expect(result).toBe(false); // false because not authenticated
    expect(useUserStore.getState().authState).toBe('GUEST');
    expect(useUserStore.getState().guestQuota?.executions_max).toBe(10);
  });

  it('should logout correctly', async () => {
    useUserStore.setState({ authState: 'AUTHENTICATED' });
    vi.mocked(api.fetchApi).mockResolvedValueOnce({ success: true });
    
    const cancelSpy = vi.spyOn(queryClient, 'cancelQueries');
    
    // Mock window.location
    const originalLocation = window.location;
    delete (window as any).location;
    window.location = { ...originalLocation, href: '' } as any;

    await authController.logout();

    expect(useUserStore.getState().authState).toBe('UNAUTHENTICATED');
    expect(cancelSpy).toHaveBeenCalled();
    expect(api.fetchApi).toHaveBeenCalledWith('/auth/logout', expect.anything());
    expect(window.location.href).toBe('/login');
    
    window.location = originalLocation;
  });
});
