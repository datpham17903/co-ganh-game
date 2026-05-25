import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HowToPlayPage } from '../src/pages/HowToPlayPage.js';

describe('HowToPlayPage', () => {
  it('renders 5 sections', () => {
    render(
      <MemoryRouter>
        <HowToPlayPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/1\. Bàn cờ/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Di chuyển/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Gánh/)).toBeInTheDocument();
    expect(screen.getByText(/4\. Vây/)).toBeInTheDocument();
    expect(screen.getByText(/5\. Kết thúc ván/)).toBeInTheDocument();
  });
});
