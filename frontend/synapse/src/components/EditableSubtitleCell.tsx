import React, { useState, useRef, useEffect, memo } from 'react';
import { TableCell, TextField } from '@mui/material';
import DiffHighlighter from './DiffHighlighter';
import { Subtitle } from '../types';
import { textCellStyle, textFieldStyle, textDisplayStyle } from './sharedStyles';

interface EditableSubtitleCellProps {
  row: Subtitle;
  editingId: number | null;
  onSubtitleChange: (id: number, newText: string) => void;
  setEditingId: (id: number | null) => void;
}

// 自定义比较函数，避免使用 JSON.stringify 比较 diffs 数组
const areEqual = (prevProps: EditableSubtitleCellProps, nextProps: EditableSubtitleCellProps) => {
  // 比较基本属性
  if (
    prevProps.editingId !== nextProps.editingId ||
    prevProps.row.id !== nextProps.row.id ||
    prevProps.row.text !== nextProps.row.text ||
    prevProps.row.startTimecode !== nextProps.row.startTimecode ||
    prevProps.row.endTimecode !== nextProps.row.endTimecode ||
    prevProps.row.originalText !== nextProps.row.originalText
  ) {
    return false;
  }

  // 比较 diffs 数组
  const prevDiffs = prevProps.row.diffs;
  const nextDiffs = nextProps.row.diffs;

  if (prevDiffs === nextDiffs) {
    // 包括都为 undefined 或都为 null 的情况
    return true;
  }

  if (!prevDiffs || !nextDiffs) {
    // 其中一个为 falsy 值
    return false;
  }

  if (prevDiffs.length !== nextDiffs.length) {
    return false;
  }

  // 逐个比较 diffs 元素
  for (let i = 0; i < prevDiffs.length; i++) {
    if (
      prevDiffs[i].type !== nextDiffs[i].type ||
      prevDiffs[i].value !== nextDiffs[i].value
    ) {
      return false;
    }
  }

  return true;
};

const EditableSubtitleCell: React.FC<EditableSubtitleCellProps> = ({
  row,
  editingId,
  onSubtitleChange,
  setEditingId,
}) => {
  const [editText, setEditText] = useState(row.text);
  const textFieldRef = useRef<HTMLInputElement>(null);
  const [escapePressed, setEscapePressed] = useState(false);

  useEffect(() => {
    // Only update from prop if not currently editing that specific cell
    if (editingId !== row.id) {
      setEditText(row.text);
    }
    
    // 在编辑模式下全选文本
    if (editingId === row.id && textFieldRef.current) {
      // autoFocus 会处理聚焦，这里用来全选文本
      textFieldRef.current.select();
    }
  }, [row.text, editingId, row.id]);

  const isEditing = editingId === row.id;

  const handleDoubleClick = () => {
    setEditingId(row.id);
    setEditText(row.text);
    setEscapePressed(false);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditText(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      onSubtitleChange(row.id, editText);
      setEditingId(null);
    } else if (event.key === 'Escape') {
      setEscapePressed(true);
      setEditingId(null);
      setEditText(row.text);
    }
  };

  const handleBlur = () => {
    if (escapePressed) {
      setEscapePressed(false);
      return;
    }
    if (editText !== row.text) {
      onSubtitleChange(row.id, editText);
    }
    setEditingId(null);
  };

  return (
    <TableCell component="div" sx={textCellStyle} onDoubleClick={handleDoubleClick}>
      {isEditing ? (
        <TextField
          inputRef={textFieldRef}
          value={editText}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoFocus
          fullWidth
          multiline
          variant="outlined"
          sx={textFieldStyle}
        />
      ) : (
        <div style={textDisplayStyle}>
          <DiffHighlighter diffs={row.diffs || []} />
        </div>
      )}
    </TableCell>
  );
};

export default memo(EditableSubtitleCell, areEqual);