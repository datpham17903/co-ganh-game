import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HowToPlayPage } from '../src/pages/HowToPlayPage.js';

describe('HowToPlayPage', () => {
  it('renders intro + 5 sections', () => {
    render(
      <MemoryRouter>
        <HowToPlayPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Cờ gánh là gì\?/)).toBeInTheDocument();
    expect(screen.getByText(/1\. Bàn cờ/)).toBeInTheDocument();
    expect(screen.getByText(/2\. Di chuyển/)).toBeInTheDocument();
    expect(screen.getByText(/3\. Gánh/)).toBeInTheDocument();
    expect(screen.getByText(/4\. Vây/)).toBeInTheDocument();
    expect(screen.getByText(/5\. Kết thúc ván/)).toBeInTheDocument();
  });

  it('có link wiki tới Wikipedia', () => {
    render(
      <MemoryRouter>
        <HowToPlayPage />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link', { name: /Wikipedia/i });
    expect(link).toHaveAttribute('href', 'https://vi.wikipedia.org/wiki/C%E1%BB%9D_g%C3%A1nh');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });
});
