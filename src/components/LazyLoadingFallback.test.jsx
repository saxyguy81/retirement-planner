import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { LazyLoadingFallback } from './LazyLoadingFallback';

describe('LazyLoadingFallback', () => {
  it('renders loading spinner', () => {
    render(<LazyLoadingFallback />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders custom message', () => {
    render(<LazyLoadingFallback message="Loading Dashboard..." />);
    expect(screen.getByText('Loading Dashboard...')).toBeInTheDocument();
  });
});
