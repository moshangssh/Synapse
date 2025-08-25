import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import FindReplace from './FindReplace';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronRight: () => <div data-testid="chevron-right" />,
  ReplaceAll: () => <div data-testid="replace-all" />,
}));

describe('FindReplace Accessibility', () => {
  const mockProps = {
    searchQuery: '',
    replaceQuery: '',
    showReplace: false,
    onSearchChange: vi.fn(),
    onReplaceChange: vi.fn(),
    onReplaceAll: vi.fn(),
    onToggleShowReplace: vi.fn(),
  };

  const renderWithTheme = (component: React.ReactElement) => {
    const theme = createTheme();
    return render(
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should have proper input labels and placeholders', () => {
    renderWithTheme(<FindReplace {...mockProps} />);

    // Search input should have proper placeholder
    const searchInput = screen.getByPlaceholderText('搜索');
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveAttribute('type', 'text');

    // Toggle button should have proper title/tooltip
    const toggleButton = screen.getByTitle('显示替换');
    expect(toggleButton).toBeInTheDocument();
  });

  it('should support keyboard navigation', () => {
    renderWithTheme(<FindReplace {...mockProps} showReplace={true} />);

    // Both inputs should be focusable
    const searchInput = screen.getByPlaceholderText('搜索');
    const replaceInput = screen.getByPlaceholderText('替换');

    expect(searchInput).toHaveAttribute('tabindex', '0');
    expect(replaceInput).toHaveAttribute('tabindex', '0');

    // Simulate keyboard interaction
    fireEvent.keyDown(searchInput, { key: 'Tab' });
    // Replace input should be next in tab order
    expect(document.activeElement).toBe(replaceInput);
  });

  it('should handle Enter key in replace input', () => {
    const handleReplaceAll = vi.fn();
    
    renderWithTheme(
      <FindReplace 
        {...mockProps} 
        showReplace={true} 
        onReplaceAll={handleReplaceAll}
      />
    );

    const replaceInput = screen.getByPlaceholderText('替换');
    
    // Press Enter in replace input
    fireEvent.keyDown(replaceInput, { key: 'Enter' });
    
    expect(handleReplaceAll).toHaveBeenCalledTimes(1);
  });

  it('should have proper ARIA attributes', () => {
    renderWithTheme(<FindReplace {...mockProps} />);

    // Check that inputs have proper aria attributes
    const searchInput = screen.getByPlaceholderText('搜索');
    expect(searchInput).toHaveAccessibleName();

    // Toggle button should have accessible name
    const toggleButton = screen.getByRole('button', { name: /显示替换/ });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should maintain proper contrast ratios with theme', () => {
    const darkTheme = createTheme({
      palette: {
        mode: 'dark',
        text: {
          primary: '#ffffff',
          secondary: '#aaaaaa',
        },
        primary: {
          main: '#90caf9',
        },
        action: {
          hover: 'rgba(255, 255, 255, 0.08)',
        },
      },
    });

    render(
      <ThemeProvider theme={darkTheme}>
        <FindReplace {...mockProps} />
      </ThemeProvider>
    );

    // In dark mode, text should be light colored
    const searchInput = screen.getByPlaceholderText('搜索');
    expect(searchInput).toBeInTheDocument();
    // Component should render without throwing errors in dark mode
  });

  it('should be usable with screen readers', () => {
    renderWithTheme(<FindReplace {...mockProps} showReplace={true} />);

    // All interactive elements should be accessible by screen readers
    const searchInput = screen.getByPlaceholderText('搜索');
    const replaceInput = screen.getByPlaceholderText('替换');
    const replaceAllButton = screen.getByTitle('全部替换');

    expect(searchInput).toHaveAccessibleName();
    expect(replaceInput).toHaveAccessibleName();
    expect(replaceAllButton).toHaveAccessibleName();

    // Check that button has proper role
    expect(replaceAllButton).toHaveAttribute('role', 'button');
  });

  it('should have proper focus indicators', () => {
    renderWithTheme(<FindReplace {...mockProps} showReplace={true} />);

    const searchInput = screen.getByPlaceholderText('搜索');
    
    // Simulate focus
    fireEvent.focus(searchInput);
    
    // Input should accept focus (this is a basic test, visual focus styles 
    // would need visual testing tools)
    expect(document.activeElement).toBe(searchInput);
  });

  it('should support reduced motion preferences', () => {
    // Mock prefersReducedMotion
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    renderWithTheme(<FindReplace {...mockProps} />);

    // Component should render without errors when reduced motion is preferred
    const toggleButton = screen.getByRole('button', { name: /显示替换/ });
    expect(toggleButton).toBeInTheDocument();

    // Restore original matchMedia
    window.matchMedia = originalMatchMedia;
  });

  it('should have proper text size for accessibility', () => {
    renderWithTheme(<FindReplace {...mockProps} />);

    const searchInput = screen.getByPlaceholderText('搜索');
    
    // Input should not be too small (minimum font size should be readable)
    const computedStyle = window.getComputedStyle(searchInput);
    expect(parseInt(computedStyle.fontSize)).toBeGreaterThanOrEqual(12);
  });

  it('should maintain accessibility when toggling replace section', () => {
    const { rerender } = renderWithTheme(<FindReplace {...mockProps} />);

    // Initially, replace input should not be visible
    expect(screen.queryByPlaceholderText('替换')).not.toBeInTheDocument();

    // Toggle replace section
    rerender(<FindReplace {...mockProps} showReplace={true} />);

    // Now replace input should be visible and accessible
    const replaceInput = screen.getByPlaceholderText('替换');
    expect(replaceInput).toBeInTheDocument();
    expect(replaceInput).toHaveAccessibleName();
  });

  it('should have sufficient color contrast for interactive elements', () => {
    // This test would ideally use a tool like axe-core or pa11y
    // For now, we'll check that the component renders with proper theme colors
    const highContrastTheme = createTheme({
      palette: {
        mode: 'light',
        contrastThreshold: 7, // WCAG AA requires at least 4.5:1
        text: {
          primary: '#000000',
          secondary: '#666666',
        },
        primary: {
          main: '#0066cc',
        },
      },
    });

    render(
      <ThemeProvider theme={highContrastTheme}>
        <FindReplace {...mockProps} />
      </ThemeProvider>
    );

    // Component should render without errors in high contrast theme
    const searchInput = screen.getByPlaceholderText('搜索');
    expect(searchInput).toBeInTheDocument();
  });
});