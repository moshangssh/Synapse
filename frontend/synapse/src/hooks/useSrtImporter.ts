import { useState, useCallback, useRef } from 'react';
import { useDataStore } from '../stores/useDataStore';
import { parseSRTFile, validateSRTContent } from '../utils/srtParser';
import { convertSrtToSubtitles } from '../utils/converter';

/**
 * 自定义Hook，用于封装SRT文件导入逻辑
 * @returns 包含文件导入处理函数、状态和错误处理的对象
 */
export const useSrtImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 从状态管理中获取所需的函数
  const setSubtitles = useDataStore((state) => state.setSubtitles);
  const addImportedSubtitleFile = useDataStore((state) => state.addImportedSubtitleFile);

  /**
   * 处理文件导入的函数
   * @param event 文件输入变化事件
   */
  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError(null);

    try {
      // 检查文件类型
      if (!file.name.toLowerCase().endsWith('.srt')) {
        const errorMessage = '请选择SRT格式的文件';
        setImportError(errorMessage);
        setSnackbarMessage(errorMessage);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      const content = await file.text();
      
      // 验证SRT文件内容
      const validation = validateSRTContent(content);
      if (!validation.isValid) {
        const errorMessage = `SRT文件格式错误: ${validation.errors.join(', ')}`;
        setImportError(errorMessage);
        setSnackbarMessage(errorMessage);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
        return;
      }

      // 解析SRT文件
      const parsedFile = parseSRTFile(content, file.name);
      
      // 将解析后的数据添加到状态管理中
      addImportedSubtitleFile(parsedFile);
      
      // 将SRT字幕条目转换为Subtitle格式并设置到状态中
      const convertedSubtitles = convertSrtToSubtitles(parsedFile.subtitles);
      setSubtitles(convertedSubtitles);
      
      setSnackbarMessage(`成功导入 ${parsedFile.subtitles.length} 条字幕`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('导入SRT文件时发生错误:', error);
      const errorMessage = '导入SRT文件时发生错误';
      setImportError(errorMessage);
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setIsImporting(false);
      
      // 重置文件输入，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [setSubtitles, addImportedSubtitleFile]);

  /**
   * 触发文件选择对话框
   */
  const triggerFileSelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  /**
   * 关闭提示消息
   */
  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  /**
   * 清除错误状态
   */
  const clearError = useCallback(() => {
    setImportError(null);
  }, []);

  return {
    handleFileChange,
    isImporting,
    importError,
    clearError,
    triggerFileSelect,
    fileInputRef,
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    handleSnackbarClose,
  };
};