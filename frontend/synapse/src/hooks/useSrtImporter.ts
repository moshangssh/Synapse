import { useState, useCallback, useRef } from 'react';
import { useSubtitleStore } from '../stores/useSubtitleStore';
import { useProjectStore } from '../stores/useProjectStore';
import { useConnectionStore } from '../stores/useConnectionStore';
import { convertSrtToSubtitles } from '../utils/converter';
import useNotifier from './useNotifier';
import { importSrtFile } from '../services/importService';

/**
 * 自定义Hook，用于封装SRT文件导入逻辑
 * @returns 包含文件导入处理函数、状态和错误处理的对象
 */
export const useSrtImporter = () => {
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 从状态管理中获取所需的函数
  const setSubtitles = useSubtitleStore((state) => state.setSubtitles);
  const addImportedSubtitleFile = useProjectStore((state) => state.addImportedSubtitleFile);
  const setConnectionStatus = useConnectionStore((state) => state.setConnectionStatus);
  const notify = useNotifier();

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
        notify.error(errorMessage);
        return;
      }

      const content = await file.text();
      
      // 调用后端API进行SRT文件解析
      const importedFile = await importSrtFile(content, file.name);

      // 处理成功的响应
      // 将解析后的数据添加到状态管理中
      addImportedSubtitleFile({
        fileName: importedFile.fileName,
        subtitles: importedFile.subtitles,
        metadata: importedFile.metadata,
      });
      
      // 将SRT字幕条目转换为Subtitle格式并设置到状态中
      const convertedSubtitles = convertSrtToSubtitles(importedFile.subtitles);
      setSubtitles(convertedSubtitles);
      
      // 自动切换到独立模式
      setConnectionStatus('standalone');
      
      notify.success(`成功导入 ${importedFile.subtitles.length} 条字幕`);
    } catch (error) {
      console.error('导入SRT文件时发生错误:', error);
      const errorMessage = '导入SRT文件时发生错误';
      setImportError(errorMessage);
      notify.error(errorMessage);
    } finally {
      setIsImporting(false);
      
      // 重置文件输入，允许重复选择同一文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [setSubtitles, addImportedSubtitleFile, setConnectionStatus, notify]);

  /**
   * 触发文件选择对话框
   */
  const triggerFileSelect = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
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
  };
};