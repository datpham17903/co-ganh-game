import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App.js';

describe('App routing', () => {
  it('renders home title at default route', () => {
    render(<App />);
    expect(screen.getAllByText(/Cờ Gánh/i).length).toBeGreaterThan(0);
  });
});
