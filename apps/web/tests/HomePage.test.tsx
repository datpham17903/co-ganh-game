import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from '../src/pages/HomePage.js';

describe('HomePage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders title and 3 main play buttons', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('CỜ GÁNH')).toBeInTheDocument();
    expect(screen.getByText(/CHƠI VỚI BOT/)).toBeInTheDocument();
    expect(screen.getByText(/CHƠI ONLINE/)).toBeInTheDocument();
    expect(screen.getByText(/CHƠI 2 NGƯỜI/)).toBeInTheDocument();
    expect(screen.getByText(/Hướng dẫn luật chơi/)).toBeInTheDocument();
  });

  it('opens settings modal when settings button clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByLabelText('Cài đặt'));
    expect(screen.getByRole('dialog', { name: 'Cài đặt' })).toBeInTheDocument();
  });

  it('closes settings via close button', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    await user.click(screen.getByLabelText('Cài đặt'));
    await user.click(screen.getByLabelText('Đóng'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
