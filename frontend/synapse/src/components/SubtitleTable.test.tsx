import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SubtitleTable from './SubtitleTable';

// Mock the global fetch function
global.fetch = vi.fn();

describe('SubtitleTable', () => {
  const subtitles = [
    { id: 1, startTimecode: '00:00:01:00', endTimecode: '00:00:03:00', text: 'Hello' },
    { id: 2, startTimecode: '00:00:04:00', endTimecode: '00:00:06:00', text: 'World' },
  ];

  beforeEach(() => {
    // Reset the mock before each test
    (global.fetch as ReturnType<typeof vi.fn>).mockClear();
  });

  it('should call fetch with the correct parameters when a row is clicked', async () => {
    // Mock a successful response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    render(<SubtitleTable subtitles={subtitles} jumpTo="start" />);

    // Find the first row by its text content and click it
    const firstRow = screen.getByText('Hello').closest('tr');
    if (!firstRow) {
        throw new Error("Could not find the table row");
    }
    fireEvent.click(firstRow);
    
    // Wait for the fetch call to be made
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${import.meta.env.VITE_API_URL}/api/v1/timeline/timecode`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            in_point: '00:00:01:00',
            out_point: '00:00:03:00',
            jump_to: 'start',
          }),
        }
      );
    });
  });
});