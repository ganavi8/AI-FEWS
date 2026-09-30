// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from '../src/client/app/components.js';

describe('shared environmental UI', () => {
  it('renders explicit live state text and marks its decorative status indicator as hidden', () => {
    render(<StatusBadge status="LIVE" />);
    const badge = screen.getByText('LIVE');
    expect(badge.className).toContain('is-live');
    expect(badge.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });
});
