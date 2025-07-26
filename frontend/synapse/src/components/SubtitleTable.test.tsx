import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import SubtitleTable from './SubtitleTable';
import { Subtitle } from '../types';

// Mock the useNotifier hook
vi.mock('../hooks/useNotifier', () => ({
  __esModule: true,
  default: () => ({
    error: vi.fn(),
    success: vi.fn(),
  }),
}));

interface MockListProps {
  children: React.ComponentType<{ data: any; index: number; style: React.CSSProperties; key: number }>;
  itemData: {
    subtitles: { id: number }[];
  };
  height: number;
  width: string;
}

// Mock react-window
vi.mock('react-window', () => ({
  __esModule: true,
  FixedSizeList: ({ children: RowComponent, itemData, height, width }: MockListProps) => {
    return (
      <div style={{ height, width }}>
        {itemData.subtitles.map((subtitle, index) => (
          <RowComponent data={itemData} index={index} style={{}} key={subtitle.id} />
        ))}
      </div>
    );
  },
}));


describe('SubtitleTable', () => {
  const mockSubtitles: Subtitle[] = [
    { id: 1, startTimecode: '00:00:01,000', endTimecode: '00:00:03,000', text: 'Hello world', originalText: 'Hello world', diffs: [{ type: 'normal', value: 'Hello world' }] },
    { id: 2, startTimecode: '00:00:04,000', endTimecode: '00:00:06,000', text: 'This is a test', originalText: 'This is a test', diffs: [{ type: 'normal', value: 'This is a test' }] },
  ];

  const mockOnSubtitleChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    ) as any;
  });

  it('renders subtitles correctly', () => {
    render(<SubtitleTable subtitles={mockSubtitles} jumpTo="start" onSubtitleChange={mockOnSubtitleChange} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });

  it('renders a filtered list of subtitles correctly', () => {
    const filteredSubtitles = [mockSubtitles[0]]; // Only "Hello world"
    render(<SubtitleTable subtitles={filteredSubtitles} jumpTo="start" onSubtitleChange={mockOnSubtitleChange} />);
    
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByText('This is a test')).not.toBeInTheDocument();
  });

  it('enters edit mode on double click', async () => {
    render(<SubtitleTable subtitles={mockSubtitles} jumpTo="start" onSubtitleChange={mockOnSubtitleChange} />);
    const textElement = screen.getByText('Hello world');
    fireEvent.doubleClick(textElement);
    const input = await screen.findByDisplayValue('Hello world');
    expect(input).toBeInTheDocument();
  });

  it('allows text to be changed in edit mode', async () => {
    render(<SubtitleTable subtitles={mockSubtitles} jumpTo="start" onSubtitleChange={mockOnSubtitleChange} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input: HTMLInputElement = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'Updated text' } });
    expect(input.value).toBe('Updated text');
  });

  it('calls onSubtitleChange and exits edit mode on Enter key', async () => {
    render(<SubtitleTable subtitles={mockSubtitles} jumpTo="start" onSubtitleChange={mockOnSubtitleChange} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'Updated text' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    expect(mockOnSubtitleChange).toHaveBeenCalledWith(1, 'Updated text');
    expect(screen.queryByDisplayValue('Updated text')).not.toBeInTheDocument();
  });

  it('calls onSubtitleChange and exits edit mode on blur', async () => {
    render(<SubtitleTable subtitles={mockSubtitles} jumpTo="start" onSubtitleChange={mockOnSubtitleChange} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'Updated on blur' } });
    fireEvent.blur(input);

    expect(mockOnSubtitleChange).toHaveBeenCalledWith(1, 'Updated on blur');
    expect(screen.queryByDisplayValue('Updated on blur')).not.toBeInTheDocument();
  });

  it('does not call onSubtitleChange and exits edit mode on Escape key', async () => {
    render(<SubtitleTable subtitles={mockSubtitles} jumpTo="start" onSubtitleChange={mockOnSubtitleChange} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'This should not be saved' } });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    expect(mockOnSubtitleChange).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('This should not be saved')).not.toBeInTheDocument();
    // The original text should be back
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('does not call onSubtitleChange on blur after Escape key is pressed', async () => {
    render(<SubtitleTable subtitles={mockSubtitles} jumpTo="start" onSubtitleChange={mockOnSubtitleChange} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'This should also not be saved' } });

    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    
    // Then blur the input
    fireEvent.blur(input);

    // The change should NOT have been saved
    expect(mockOnSubtitleChange).not.toHaveBeenCalled();
    expect(screen.queryByDisplayValue('This should also not be saved')).not.toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
});