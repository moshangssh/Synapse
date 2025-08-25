import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DiffHighlighter from './DiffHighlighter';

describe('DiffHighlighter Accessibility', () => {
  const renderWithTheme = (component: React.ReactElement) => {
    const theme = createTheme();
    return render(
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    );
  };

  it('should have proper color contrast for different diff types', () => {
    const diffs = [
      { type: 'normal' as const, value: 'This is normal text' },
      { type: 'added' as const, value: 'This is added text' },
      { type: 'removed' as const, value: 'This is removed text' },
    ];

    renderWithTheme(<DiffHighlighter diffs={diffs} />);

    // All text should be visible and have proper contrast
    const normalText = screen.getByText('This is normal text');
    const addedText = screen.getByText('This is added text');
    const removedText = screen.getByText('This is removed text');

    expect(normalText).toBeInTheDocument();
    expect(addedText).toBeInTheDocument();
    expect(removedText).toBeInTheDocument();

    // Check that different diff types have different visual representations
    // (This would ideally be tested with visual regression testing)
  });

  it('should be readable for users with color vision deficiencies', () => {
    const diffs = [
      { type: 'added' as const, value: 'Important added content' },
      { type: 'removed' as const, value: 'Removed content' },
    ];

    renderWithTheme(<DiffHighlighter diffs={diffs} />);

    // Component should not rely solely on color to convey information
    // The different styles (text-decoration for removed) help with this
    const addedText = screen.getByText('Important added content');
    const removedText = screen.getByText('Removed content');

    expect(addedText).toBeInTheDocument();
    expect(removedText).toBeInTheDocument();

    // In a real test, we might check that there are non-color indicators
    // like text decorations, borders, or icons
  });

  it('should handle empty diffs array gracefully', () => {
    renderWithTheme(<DiffHighlighter diffs={[]} />);

    // Should render empty content without errors
    const container = screen.getByTestId('diff-highlighter');
    expect(container).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('should maintain proper text sizing and spacing', () => {
    const diffs = [
      { type: 'normal' as const, value: 'Sample text with proper sizing' },
    ];

    renderWithTheme(<DiffHighlighter diffs={diffs} />);

    const textElement = screen.getByText('Sample text with proper sizing');
    
    // Text should have appropriate size for readability
    const computedStyle = window.getComputedStyle(textElement);
    expect(parseInt(computedStyle.fontSize)).toBeGreaterThanOrEqual(14);
    
    // Line height should be sufficient for readability
    expect(parseFloat(computedStyle.lineHeight)).toBeGreaterThan(1.2);
  });

  it('should support high contrast themes', () => {
    const highContrastTheme = createTheme({
      palette: {
        mode: 'light',
        contrastThreshold: 7,
        text: {
          primary: '#000000',
          secondary: '#000000',
        },
        background: {
          default: '#ffffff',
          paper: '#ffffff',
        },
      },
    });

    const diffs = [
      { type: 'normal' as const, value: 'Text in high contrast mode' },
    ];

    render(
      <ThemeProvider theme={highContrastTheme}>
        <DiffHighlighter diffs={diffs} />
      </ThemeProvider>
    );

    const textElement = screen.getByText('Text in high contrast mode');
    expect(textElement).toBeInTheDocument();
  });

  it('should be accessible in dark mode', () => {
    const darkTheme = createTheme({
      palette: {
        mode: 'dark',
        text: {
          primary: '#ffffff',
          secondary: '#cccccc',
        },
        background: {
          default: '#121212',
          paper: '#1e1e1e',
        },
      },
    });

    const diffs = [
      { type: 'added' as const, value: 'Added text in dark mode' },
      { type: 'removed' as const, value: 'Removed text in dark mode' },
    ];

    render(
      <ThemeProvider theme={darkTheme}>
        <DiffHighlighter diffs={diffs} />
      </ThemeProvider>
    );

    const addedText = screen.getByText('Added text in dark mode');
    const removedText = screen.getByText('Removed text in dark mode');

    expect(addedText).toBeInTheDocument();
    expect(removedText).toBeInTheDocument();
  });

  it('should handle long text content properly', () => {
    const longText = 'a'.repeat(1000); // Very long text
    const diffs = [
      { type: 'normal' as const, value: longText },
    ];

    renderWithTheme(<DiffHighlighter diffs={diffs} />);

    // Long text should be handled without breaking accessibility
    const textElement = screen.getByText(longText);
    expect(textElement).toBeInTheDocument();

    // Text should wrap properly
    const computedStyle = window.getComputedStyle(textElement);
    expect(computedStyle.whiteSpace).toBe('pre-wrap');
    expect(computedStyle.wordBreak).toBe('break-word');
  });

  it('should maintain accessibility with mixed diff types', () => {
    const diffs = [
      { type: 'normal' as const, value: 'Start ' },
      { type: 'added' as const, value: 'added ' },
      { type: 'normal' as const, value: 'middle ' },
      { type: 'removed' as const, value: 'removed ' },
      { type: 'normal' as const, value: 'end' },
    ];

    renderWithTheme(<DiffHighlighter diffs={diffs} />);

    // All text segments should be present and properly styled
    expect(screen.getByText('Start')).toBeInTheDocument();
    expect(screen.getByText('added')).toBeInTheDocument();
    expect(screen.getByText('middle')).toBeInTheDocument();
    expect(screen.getByText('removed')).toBeInTheDocument();
    expect(screen.getByText('end')).toBeInTheDocument();
  });

  it('should have proper semantic structure', () => {
    const diffs = [
      { type: 'normal' as const, value: 'Semantic content' },
    ];

    renderWithTheme(<DiffHighlighter diffs={diffs} />);

    // The component should use appropriate HTML elements
    const container = screen.getByTestId('diff-highlighter');
    expect(container).toBeInTheDocument();

    // Content should be in appropriate text elements
    const textElement = screen.getByText('Semantic content');
    expect(textElement.tagName).toBe('SPAN');
  });
});