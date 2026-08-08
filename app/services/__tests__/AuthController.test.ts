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
    vi.mocked(api.fetchApi).mockImplementation(async (url: string) => {
      if (url === '/auth/me') return { success: true, data: { id: 1, email: 'test@test.com' } };
      if (url === '/rbac/my-permissions') return { success: true, permissions: ['read'] };
      return { success: true };
    });

    const result = await authController.bootstrap();
    
    expect(result).toBe(true);
    expect(useUserStore.getState().authState).toBe('AUTHENTICATED');
    expect(useUserStore.getState().user?.email).toBe('test@test.com');
  });

  it('should singleton multiple concurrent bootstrap calls', async () => {
    vi.mocked(api.fetchApi).mockImplementation(async (url: string) => {
      await new Promise(r => setTimeout(r, 50));
      if (url === '/auth/me') return { success: true, data: { id: 1 } };
      return { success: true };
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
    let meCalls = 0;
    vi.mocked(api.fetchApi).mockImplementation(async (url: string) => {
      if (url === '/auth/me') {
        meCalls++;
        if (meCalls === 1) throw { status: 401 };
        return { success: true, data: { id: 2, email: 'retry@test.com' } };
      }
      if (url === '/auth/refresh') return { success: true };
      if (url === '/rbac/my-permissions') return { success: true, permissions: [] };
      return { success: true };
    });

    const result = await authController.bootstrap();
    
    expect(result).toBe(true);
    // /auth/me (fail), /rbac (fail/succ), /auth/refresh (succ), /auth/me (succ), /rbac (succ)
    expect(api.fetchApi).toHaveBeenCalledTimes(5);
    expect(useUserStore.getState().authState).toBe('AUTHENTICATED');
  });

  it('should fallback to guest if refresh fails', async () => {
    vi.mocked(api.fetchApi).mockImplementation(async (url: string) => {
      if (url === '/auth/me') throw { status: 401 };
      if (url === '/auth/refresh') throw { status: 401 };
      if (url === '/guest/init') return {
        access_token: 'guest_token',
        executions_used: 0,
        executions_max: 10,
        expires_at: new Date(Date.now() + 86400000).toISOString()
      };
      return { success: true };
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
