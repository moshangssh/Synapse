import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubtitleTable from './SubtitleTable';
import { Subtitle } from '../types';
import { vi } from 'vitest';

// Mock the useTimelineNavigation hook
vi.mock('../hooks/useTimelineNavigation', () => ({
  useTimelineNavigation: () => ({
    setTimecode: vi.fn(),
  }),
}));

// Mock the useDataStore hook
vi.mock('../stores/useDataStore');

// Mock the useUIStore hook
vi.mock('../stores/useUIStore', () => ({
  useUIStore: vi.fn((selector) => selector({ jumpTo: 'start' })),
}));

// Mock react-virtuoso to render all items in JSDOM
vi.mock('react-virtuoso', () => ({
  Virtuoso: (props: any) => {
    return (
      <div data-testid="virtuoso-container">
        {props.data.map((item: any, index: number) => (
          <div key={item.id}>{props.itemContent(index, item)}</div>
        ))}
      </div>
    );
  },
}));

describe('SubtitleTable', () => {
  const mockSubtitles: Subtitle[] = [
    { id: 1, startTimecode: '00:00:01,000', endTimecode: '00:00:02,000', text: 'Hello world', originalText: 'Hello world', diffs: [], isModified: false },
    { id: 2, startTimecode: '00:00:03,000', endTimecode: '00:00:04,000', text: 'This is a test', originalText: 'This is a test', diffs: [], isModified: false },
  ];

  const mockOnSubtitleChange = vi.fn();
  const mockOnRowClick = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const { useDataStore } = await import('../stores/useDataStore');
    (useDataStore as any).mockImplementation((selector: (state: any) => any) => {
      const state = {
        subtitles: mockSubtitles,
        updateSubtitleText: mockOnSubtitleChange,
        getModifiedSubtitleIndices: () => [],
      };
      return selector(state);
    });
  });

  it('renders subtitles correctly', () => {
    render(<SubtitleTable jumpToSubtitleId={null} onRowClick={mockOnRowClick} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.getByText('This is a test')).toBeInTheDocument();
  });

  it('renders a filtered list of subtitles correctly', async () => {
    const filteredSubtitles = [mockSubtitles[0]];
    const { useDataStore } = await import('../stores/useDataStore');
    (useDataStore as any).mockImplementation((selector: (state: any) => any) => {
      const state = {
        subtitles: filteredSubtitles,
        updateSubtitleText: mockOnSubtitleChange,
        getModifiedSubtitleIndices: () => [],
      };
      return selector(state);
    });

    render(<SubtitleTable jumpToSubtitleId={null} onRowClick={mockOnRowClick} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
    expect(screen.queryByText('This is a test')).not.toBeInTheDocument();
  });

  it('enters edit mode on double click', async () => {
    render(<SubtitleTable jumpToSubtitleId={null} onRowClick={mockOnRowClick} />);
    const textElement = screen.getByText('Hello world');
    fireEvent.doubleClick(textElement);
    const input = await screen.findByDisplayValue('Hello world');
    expect(input).toBeInTheDocument();
  });

  it('allows text to be changed in edit mode', async () => {
    render(<SubtitleTable jumpToSubtitleId={null} onRowClick={mockOnRowClick} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input: HTMLInputElement = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'Updated text' } });
    expect(input.value).toBe('Updated text');
  });

  it('calls onSubtitleChange and exits edit mode on Enter key', async () => {
    render(<SubtitleTable jumpToSubtitleId={null} onRowClick={mockOnRowClick} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'Updated text' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockOnSubtitleChange).toHaveBeenCalledWith(1, 'Updated text');
    });
    expect(screen.queryByDisplayValue('Updated text')).not.toBeInTheDocument();
  });

  it('calls onSubtitleChange and exits edit mode on blur', async () => {
    render(<SubtitleTable jumpToSubtitleId={null} onRowClick={mockOnRowClick} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'Updated on blur' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSubtitleChange).toHaveBeenCalledWith(1, 'Updated on blur');
    });
    expect(screen.queryByDisplayValue('Updated on blur')).not.toBeInTheDocument();
  });

  it('does not call onSubtitleChange and exits edit mode on Escape key', async () => {
    render(<SubtitleTable jumpToSubtitleId={null} onRowClick={mockOnRowClick} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'This should not be saved' } });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

    await waitFor(() => {
      expect(mockOnSubtitleChange).not.toHaveBeenCalled();
    });
    expect(screen.queryByDisplayValue('This should not be saved')).not.toBeInTheDocument();
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('does not call onSubtitleChange on blur after Escape key is pressed', async () => {
    render(<SubtitleTable jumpToSubtitleId={null} onRowClick={mockOnRowClick} />);
    fireEvent.doubleClick(screen.getByText('Hello world'));
    const input = await screen.findByDisplayValue('Hello world');
    fireEvent.change(input, { target: { value: 'This should also not be saved' } });
    fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(mockOnSubtitleChange).not.toHaveBeenCalled();
    });
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
});