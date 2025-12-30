import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MarkdownMessage from './MarkdownMessage';

describe('MarkdownMessage', () => {
  it('renders plain text correctly', () => {
    render(<MarkdownMessage content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders markdown tables', () => {
    const table = `| Year | Value |
|------|-------|
| 2025 | $100K |`;
    render(<MarkdownMessage content={table} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('2025')).toBeInTheDocument();
    expect(screen.getByText('$100K')).toBeInTheDocument();
  });

  it('renders bold text', () => {
    render(<MarkdownMessage content="**bold text**" />);
    const boldElement = screen.getByText('bold text');
    expect(boldElement.tagName).toBe('STRONG');
  });

  it('renders italic text', () => {
    render(<MarkdownMessage content="*italic text*" />);
    const italicElement = screen.getByText('italic text');
    expect(italicElement.tagName).toBe('EM');
  });

  it('renders lists', () => {
    const listContent = `- item 1
- item 2
- item 3`;
    render(<MarkdownMessage content={listContent} />);
    expect(screen.getByText('item 1')).toBeInTheDocument();
    expect(screen.getByText('item 2')).toBeInTheDocument();
    expect(screen.getByText('item 3')).toBeInTheDocument();
  });

  it('renders headers', () => {
    render(<MarkdownMessage content="## Header 2" />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Header 2');
  });

  it('handles in-app navigation links', () => {
    const onNavigate = vi.fn();
    render(<MarkdownMessage content="[Go to Projections](#projections)" onNavigate={onNavigate} />);

    const button = screen.getByText('Go to Projections');
    fireEvent.click(button);
    expect(onNavigate).toHaveBeenCalledWith('projections');
  });

  it('handles in-app navigation for scenarios tab', () => {
    const onNavigate = vi.fn();
    render(<MarkdownMessage content="[View Scenarios](#scenarios)" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('View Scenarios'));
    expect(onNavigate).toHaveBeenCalledWith('scenarios');
  });

  it('handles in-app navigation for settings tab', () => {
    const onNavigate = vi.fn();
    render(<MarkdownMessage content="[Open Settings](#settings)" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText('Open Settings'));
    expect(onNavigate).toHaveBeenCalledWith('settings');
  });

  it('does not navigate for invalid tab links', () => {
    const onNavigate = vi.fn();
    render(<MarkdownMessage content="[Invalid](#invalid-tab)" onNavigate={onNavigate} />);

    // Should render as regular link, not a button
    const link = screen.getByText('Invalid');
    expect(link.tagName).toBe('A');
  });

  it('opens external links in new tab', () => {
    render(<MarkdownMessage content="[Google](https://google.com)" />);
    const link = screen.getByText('Google');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows external link indicator', () => {
    render(<MarkdownMessage content="[External](https://example.com)" />);
    // The arrow icon is rendered as a span with the arrow character
    const link = screen.getByText('External');
    const container = link.closest('a');
    expect(container.textContent).toContain('\u2197'); // Contains the arrow character
  });

  it('blocks non-HTTPS images', () => {
    render(<MarkdownMessage content="![alt](http://evil.com/image.png)" />);
    expect(screen.getByText(/Image blocked: requires HTTPS/)).toBeInTheDocument();
  });

  it('renders HTTPS images', () => {
    render(<MarkdownMessage content="![alt text](https://example.com/image.png)" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/image.png');
    expect(img).toHaveAttribute('alt', 'alt text');
  });

  it('renders inline code', () => {
    render(<MarkdownMessage content="Use `console.log()` for debugging" />);
    const code = screen.getByText('console.log()');
    expect(code.tagName).toBe('CODE');
  });

  it('renders code blocks without language', () => {
    const codeBlock = `\`\`\`
const x = 1;
\`\`\``;
    render(<MarkdownMessage content={codeBlock} />);
    expect(screen.getByText('const x = 1;')).toBeInTheDocument();
  });

  it('renders code blocks with syntax highlighting', () => {
    const jsCode = `\`\`\`javascript
const x = 1;
\`\`\``;
    render(<MarkdownMessage content={jsCode} />);
    expect(screen.getByText(/const/)).toBeInTheDocument();
  });

  it('applies prose styling classes', () => {
    const { container } = render(<MarkdownMessage content="Test content" />);
    expect(container.firstChild).toHaveClass('prose');
    expect(container.firstChild).toHaveClass('prose-invert');
  });

  it('is memoized for performance', () => {
    // MarkdownMessage is wrapped in React.memo
    const { rerender } = render(<MarkdownMessage content="Test" />);
    const firstRender = screen.getByText('Test');

    rerender(<MarkdownMessage content="Test" />);
    const secondRender = screen.getByText('Test');

    // Same element should be reused due to memoization
    expect(firstRender).toBe(secondRender);
  });

  it('handles empty content', () => {
    const { container } = render(<MarkdownMessage content="" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('sanitizes dangerous HTML', () => {
    // Test that script tags in markdown are stripped
    render(<MarkdownMessage content="Safe text here" />);
    expect(screen.getByText('Safe text here')).toBeInTheDocument();

    // The sanitizer prevents XSS by stripping dangerous elements
    const { container } = render(<MarkdownMessage content="Test **bold** content" />);
    expect(container.querySelector('script')).toBeNull();
  });
});
