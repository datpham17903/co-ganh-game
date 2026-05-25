import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../src/components/Modal.js';

describe('Modal', () => {
  it('không render khi open=false', () => {
    render(
      <Modal open={false} onClose={() => undefined}>
        body
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('render với title và body khi open=true', () => {
    render(
      <Modal open={true} onClose={() => undefined} title="Test">
        body
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('Escape gọi onClose', async () => {
    const user = userEvent.setup();
    let closed = 0;
    render(
      <Modal open={true} onClose={() => closed++} title="X">
        body
      </Modal>,
    );
    await user.keyboard('{Escape}');
    expect(closed).toBe(1);
  });

  it('click outside gọi onClose', async () => {
    const user = userEvent.setup();
    let closed = 0;
    render(
      <Modal open={true} onClose={() => closed++} title="X">
        body
      </Modal>,
    );
    await user.click(screen.getByRole('dialog'));
    expect(closed).toBe(1);
  });

  it('click trong body không đóng', async () => {
    const user = userEvent.setup();
    let closed = 0;
    render(
      <Modal open={true} onClose={() => closed++} title="X">
        <span>inside</span>
      </Modal>,
    );
    await user.click(screen.getByText('inside'));
    expect(closed).toBe(0);
  });
});
