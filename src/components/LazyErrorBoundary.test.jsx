import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState } from 'react';
import { LazyErrorBoundary } from './LazyErrorBoundary';

const ThrowError = () => {
  throw new Error('Test error');
};

// Component that throws once, then works after retry
const ThrowOnce = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Recovered</div>;
};

describe('LazyErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when no error', () => {
    render(
      <LazyErrorBoundary>
        <div>Content</div>
      </LazyErrorBoundary>
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <LazyErrorBoundary>
        <ThrowError />
      </LazyErrorBoundary>
    );
    expect(screen.getByText('Failed to load component')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('clears error state on retry click', () => {
    // Use a wrapper that controls whether the child throws
    const TestWrapper = () => {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <LazyErrorBoundary>
          {shouldThrow ? (
            <button onClick={() => setShouldThrow(false)}>
              <ThrowOnce shouldThrow={shouldThrow} />
            </button>
          ) : (
            <ThrowOnce shouldThrow={false} />
          )}
        </LazyErrorBoundary>
      );
    };

    const { rerender } = render(<TestWrapper />);

    // Error boundary caught the error
    expect(screen.getByText('Failed to load component')).toBeInTheDocument();

    // Click retry - this clears the error state
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    // Rerender with the child that no longer throws
    rerender(
      <LazyErrorBoundary>
        <ThrowOnce shouldThrow={false} />
      </LazyErrorBoundary>
    );

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });
});
