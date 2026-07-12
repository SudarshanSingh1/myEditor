import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App Component', () => {
  it('renders without crashing', () => {
    // Basic test to verify the app can boot in jsdom
    render(<App />);
    expect(document.body).toBeInTheDocument();
  });
});
