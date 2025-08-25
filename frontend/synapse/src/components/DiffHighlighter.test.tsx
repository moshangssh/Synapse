import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DiffHighlighter, { DiffPart } from './DiffHighlighter';

describe('DiffHighlighter', () => {
  const mockDiffs: DiffPart[] = [
    { type: 'normal', value: 'Hello ' },
    { type: 'added', value: 'world' },
    { type: 'normal', value: '! ' },
    { type: 'removed', value: 'old' },
    { type: 'normal', value: ' text' },
  ];

  it('renders without crashing', () => {
    const { container } = render(<DiffHighlighter diffs={mockDiffs} />);
    expect(container).toBeInTheDocument();
  });

  it('renders empty diffs array', () => {
    const { container } = render(<DiffHighlighter diffs={[]} />);
    const paragraph = container.querySelector('p');
    expect(paragraph).toBeInTheDocument();
    expect(paragraph).toBeEmptyDOMElement();
  });

  it('renders only normal text', () => {
    const normalDiffs: DiffPart[] = [
      { type: 'normal', value: 'Just normal text' },
    ];
    const { container } = render(<DiffHighlighter diffs={normalDiffs} />);
    expect(screen.getByText('Just normal text')).toBeInTheDocument();
  });

  it('renders mixed diff types correctly', () => {
    const { container } = render(<DiffHighlighter diffs={mockDiffs} />);
    
    expect(screen.getByText('Hello world! old text')).toBeInTheDocument();
  });

  it('handles special characters in diff values', () => {
    const specialCharsDiffs: DiffPart[] = [
      { type: 'normal', value: 'Text with ' },
      { type: 'added', value: '<>&"\' characters' },
    ];
    const { container } = render(<DiffHighlighter diffs={specialCharsDiffs} />);
    expect(screen.getByText(/Text with <>&"' characters/)).toBeInTheDocument();
  });

  it('applies correct styles to paragraph', () => {
    const { container } = render(<DiffHighlighter diffs={mockDiffs} />);
    const paragraph = container.querySelector('p');
    expect(paragraph).toHaveStyle({
      margin: 0,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    });
  });

  it('renders consecutive diffs of same type', () => {
    const consecutiveDiffs: DiffPart[] = [
      { type: 'added', value: 'first' },
      { type: 'added', value: ' second' },
      { type: 'removed', value: ' third' },
      { type: 'removed', value: ' fourth' },
    ];
    const { container } = render(<DiffHighlighter diffs={consecutiveDiffs} />);
    expect(screen.getByText('first second third fourth')).toBeInTheDocument();
  });
});