import { render, screen, fireEvent } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import FindReplace from './FindReplace';

const mockProps = {
  searchQuery: '',
  replaceQuery: '',
  showReplace: false,
  onSearchChange: vi.fn(),
  onReplaceChange: vi.fn(),
  onReplaceAll: vi.fn(),
  onToggleShowReplace: vi.fn(),
};

beforeEach(() => {
  // Reset all mock functions before each test
  mockProps.onSearchChange.mockReset();
  mockProps.onReplaceChange.mockReset();
  mockProps.onReplaceAll.mockReset();
  mockProps.onToggleShowReplace.mockReset();
});

describe('FindReplace Component', () => {
  it('should render search input and toggle button', () => {
    render(<FindReplace {...mockProps} />);
    expect(screen.getByPlaceholderText('搜索')).toBeInTheDocument();
    expect(screen.getByLabelText('显示替换')).toBeInTheDocument();
  });

  it('should not show replace input by default', () => {
    render(<FindReplace {...mockProps} />);
    expect(screen.queryByPlaceholderText('替换')).not.toBeInTheDocument();
  });

  it('should show replace input when toggle is clicked', () => {
    const props = { ...mockProps, showReplace: true };
    render(<FindReplace {...props} />);
    expect(screen.getByPlaceholderText('替换')).toBeInTheDocument();
  });

  it('should call onToggleShowReplace when toggle button is clicked', () => {
    render(<FindReplace {...mockProps} />);
    const toggleButton = screen.getByLabelText('显示替换');
    fireEvent.click(toggleButton);
    expect(mockProps.onToggleShowReplace).toHaveBeenCalledTimes(1);
  });

  it('should call onSearchChange when typing in search input', () => {
    render(<FindReplace {...mockProps} />);
    const searchInput = screen.getByPlaceholderText('搜索');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    expect(mockProps.onSearchChange).toHaveBeenCalled();
  });

  it('should call onReplaceChange when typing in replace input', () => {
    const props = { ...mockProps, showReplace: true };
    render(<FindReplace {...props} />);
    const replaceInput = screen.getByPlaceholderText('替换');
    fireEvent.change(replaceInput, { target: { value: 'new' } });
    expect(mockProps.onReplaceChange).toHaveBeenCalled();
  });


  it('should call onReplaceAll when "全部替换" button is clicked', () => {
    const props = { ...mockProps, showReplace: true };
    render(<FindReplace {...props} />);
    const replaceAllButton = screen.getByLabelText('全部替换');
    fireEvent.click(replaceAllButton);
    expect(mockProps.onReplaceAll).toHaveBeenCalledTimes(1);
  });

  it('should call onReplaceAll when Enter is pressed in replace input', () => {
    const props = { ...mockProps, showReplace: true };
    render(<FindReplace {...props} />);
    const replaceInput = screen.getByPlaceholderText('替换');
    fireEvent.keyDown(replaceInput, { key: 'Enter', code: 'Enter' });
    expect(mockProps.onReplaceAll).toHaveBeenCalledTimes(1);
  });
});