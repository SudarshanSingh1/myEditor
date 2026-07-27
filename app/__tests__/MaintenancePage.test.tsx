import { render, screen } from '@testing-library/react';
import { MaintenancePage } from '../pages/MaintenancePage';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock the framer-motion library to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion') as any;
  return {
    ...actual,
    motion: {
      div: ({ children, className, ...props }: any) => <div className={className} {...props}>{children}</div>,
      span: ({ children, className, ...props }: any) => <span className={className} {...props}>{children}</span>,
    },
    useReducedMotion: () => true, // Disable complex canvas animations
  };
});

// Mock the Zustand stores
vi.mock('../stores/useSystemStore', () => ({
  useSystemStore: () => ({
    isMaintenanceMode: true,
    maintenanceMessage: 'System is undergoing scheduled maintenance',
    maintenanceEndTime: new Date(Date.now() + 3600000).toISOString(),
    checkStatus: vi.fn(),
    isChecking: false,
    hasChecked: true,
  }),
}));

vi.mock('../stores/useUserStore', () => ({
  useUserStore: () => ({
    isAuthenticated: false,
  }),
}));

describe('MaintenancePage', () => {
  it('renders the maintenance message correctly', () => {
    render(
      <BrowserRouter>
        <MaintenancePage />
      </BrowserRouter>
    );

    // Verify the main title is present
    expect(screen.getByText('SYSTEM MAINTENANCE')).toBeInTheDocument();
    
    // Verify the dynamic message from the store is present
    expect(screen.getByText('System is undergoing scheduled maintenance')).toBeInTheDocument();
    
    // Verify the stage tracker is present
    expect(screen.getByText('Current Stage', { exact: false })).toBeInTheDocument();
  });
});
