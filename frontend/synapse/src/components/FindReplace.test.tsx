import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import FindReplace from './FindReplace';

const mockProps = {
  searchQuery: '',
  replaceQuery: '',
  showReplace: false,
  matchCase: false,
  matchWholeWord: false,
  useRegex: false,
  onSearchChange: vi.fn(),
  onReplaceChange: vi.fn(),
  onReplaceAll: vi.fn(),
  onToggleShowReplace: vi.fn(),
  onToggleMatchCase: vi.fn(),
  onToggleMatchWholeWord: vi.fn(),
  onToggleUseRegex: vi.fn(),
};

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

  it('should call onToggleMatchCase when "大小写匹配" button is clicked', () => {
    render(<FindReplace {...mockProps} />);
    const matchCaseButton = screen.getByLabelText('大小写匹配');
    fireEvent.click(matchCaseButton);
    expect(mockProps.onToggleMatchCase).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleMatchWholeWord when "全词匹配" button is clicked', () => {
    render(<FindReplace {...mockProps} />);
    const matchWholeWordButton = screen.getByLabelText('全词匹配');
    fireEvent.click(matchWholeWordButton);
    expect(mockProps.onToggleMatchWholeWord).toHaveBeenCalledTimes(1);
  });

  it('should call onToggleUseRegex when "使用正则表达式" button is clicked', () => {
    render(<FindReplace {...mockProps} />);
    const useRegexButton = screen.getByLabelText('使用正则表达式');
    fireEvent.click(useRegexButton);
    expect(mockProps.onToggleUseRegex).toHaveBeenCalledTimes(1);
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