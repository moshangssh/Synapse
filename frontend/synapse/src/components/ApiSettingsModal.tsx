import {
  Box,
  Modal,
  Typography,
  TextField,
  Button,
  Divider,
  Slider,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { optimizationService } from '../services/optimizationService';

interface ApiSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ApiSettingsModal({ open, onClose }: ApiSettingsModalProps) {
  const { apiConfig, updateApiConfig, saveApiConfig, getAvailablePresets, applyPreset, isDevelopmentMode } = useSettingsStore();
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    responseTime?: number;
  } | null>(null);
  const availablePresets = getAvailablePresets();

  const handlePresetSelect = (presetKey: string) => {
    applyPreset(presetKey as any);
    setLocalConfig(useSettingsStore.getState().apiConfig);
  };

  const handleTestConnection = async () => {
    if (!localConfig.apiUrl || !localConfig.apiKey) {
      setTestResult({
        success: false,
        message: '请先填写API URL和API Key'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await optimizationService.testConnection({
        api_url: localConfig.apiUrl,
        api_key: localConfig.apiKey,
        model: localConfig.model
      });

      setTestResult({
        success: result.success,
        message: result.message,
        responseTime: result.response_time
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    try {
      updateApiConfig(localConfig);
      saveApiConfig();
      onClose();
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const handleCancel = () => {
    setLocalConfig(apiConfig);
    setTestResult(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      aria-labelledby="api-settings-modal-title"
      aria-describedby="api-settings-modal-description"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 500,
          bgcolor: '#2D2D2D',
          border: `1px solid #404040`,
          borderRadius: 2,
          boxShadow: 24,
          p: 3,
          outline: 'none',
        }}
      >
        <Typography
          id="api-settings-modal-title"
          variant="h6"
          component="h2"
          sx={{ mb: 2, color: '#FFFFFF' }}
        >
          AI Configuration
        </Typography>

        {/* 开发环境预设选择 */}
        {isDevelopmentMode() && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1 }}>
              快速预设 (开发模式):
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {availablePresets.map((preset) => (
                <Chip
                  key={preset.key}
                  label={preset.name}
                  title={preset.description}
                  onClick={() => handlePresetSelect(preset.key)}
                  clickable
                  sx={{
                    backgroundColor: '#404040',
                    color: '#FFFFFF',
                    border: '1px solid #606060',
                    '&:hover': {
                      backgroundColor: '#606060',
                      borderColor: '#808080',
                    },
                    '&.MuiChip-clickable:hover': {
                      backgroundColor: '#606060',
                    },
                  }}
                />
              ))}
            </Box>
            <Divider sx={{ my: 2, borderColor: '#404040' }} />
          </Box>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* API URL 输入 */}
          <TextField
            label="API URL"
            value={localConfig.apiUrl}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
            fullWidth
            placeholder="e.g., https://api.openai.com/v1/chat/completions"
            helperText="输入API服务地址"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#FFFFFF',
                '& fieldset': { borderColor: '#404040' },
                '&:hover fieldset': { borderColor: '#606060' },
                '&.Mui-focused fieldset': { borderColor: '#90CAF9' },
              },
              '& .MuiInputLabel-root': { color: '#B0B0B0' },
              '& .MuiFormHelperText-root': { color: '#B0B0B0' },
            }}
          />

          {/* API Key 输入 */}
          <TextField
            label="API Key"
            value={localConfig.apiKey}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, apiKey: e.target.value }))}
            fullWidth
            placeholder="输入您的API密钥"
            type="password"
            helperText="输入您的API密钥（将加密存储）"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#FFFFFF',
                '& fieldset': { borderColor: '#404040' },
                '&:hover fieldset': { borderColor: '#606060' },
                '&.Mui-focused fieldset': { borderColor: '#90CAF9' },
              },
              '& .MuiInputLabel-root': { color: '#B0B0B0' },
              '& .MuiFormHelperText-root': { color: '#B0B0B0' },
            }}
          />

          {/* AI 模型输入 */}
          <TextField
            label="AI Model"
            value={localConfig.model}
            onChange={(e) => setLocalConfig(prev => ({ ...prev, model: e.target.value }))}
            fullWidth
            placeholder="e.g., gpt-3.5-turbo, gpt-4, claude-3-sonnet"
            helperText="Enter the model name (e.g., gpt-3.5-turbo, gpt-4, claude-3-sonnet)"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#FFFFFF',
                '& fieldset': { borderColor: '#404040' },
                '&:hover fieldset': { borderColor: '#606060' },
                '&.Mui-focused fieldset': { borderColor: '#90CAF9' },
              },
              '& .MuiInputLabel-root': { color: '#B0B0B0' },
              '& .MuiFormHelperText-root': { color: '#B0B0B0' },
            }}
          />

          {/* 连通性测试 */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Button
                onClick={handleTestConnection}
                disabled={isTesting}
                variant="outlined"
                sx={{
                  color: '#B0B0B0',
                  borderColor: '#404040',
                  '&:hover': {
                    borderColor: '#606060',
                    backgroundColor: 'rgba(176, 176, 176, 0.08)',
                  },
                  '&:disabled': {
                    color: '#666666',
                    borderColor: '#333333',
                  },
                }}
              >
                {isTesting ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} sx={{ color: '#B0B0B0' }} />
                    测试中...
                  </Box>
                ) : (
                  '测试连接'
                )}
              </Button>
              
              {testResult && (
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: testResult.success ? '#4CAF50' : '#F44336',
                    fontWeight: 500
                  }}
                >
                  {testResult.success ? '✓ 连接正常' : '✗ 连接失败'}
                  {testResult.responseTime && ` (${testResult.responseTime?.toFixed(2)}s)`}
                </Typography>
              )}
            </Box>

            {/* 测试结果详情 */}
            {testResult && (
              <Alert 
                severity={testResult.success ? "success" : "error"}
                sx={{
                  backgroundColor: testResult.success ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                  color: testResult.success ? '#4CAF50' : '#F44336',
                  border: `1px solid ${testResult.success ? '#4CAF50' : '#F44336'}`,
                  '& .MuiAlert-icon': {
                    color: testResult.success ? '#4CAF50' : '#F44336',
                  },
                }}
              >
                {testResult.message}
              </Alert>
            )}
          </Box>

          {/* 温度设置 */}
          <Box>
            <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1 }}>
              Temperature: {localConfig.temperature}
            </Typography>
            <Slider
              value={localConfig.temperature}
              onChange={(_, value) => setLocalConfig(prev => ({ ...prev, temperature: value as number }))}
              min={0}
              max={2}
              step={0.1}
              sx={{
                color: '#90CAF9',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#90CAF9',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#90CAF9',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#404040',
                },
              }}
            />
          </Box>

          {/* 最大令牌数设置 */}
          <Box>
            <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1 }}>
              Max Tokens: {localConfig.maxTokens}
            </Typography>
            <Slider
              value={localConfig.maxTokens}
              onChange={(_, value) => setLocalConfig(prev => ({ ...prev, maxTokens: value as number }))}
              min={100}
              max={4000}
              step={100}
              sx={{
                color: '#90CAF9',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#90CAF9',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#90CAF9',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#404040',
                },
              }}
            />
          </Box>

          {/* 批处理大小设置 */}
          <Box>
            <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1 }}>
              Batch Size: {localConfig.batchSize}
            </Typography>
            <Slider
              value={localConfig.batchSize}
              onChange={(_, value) => setLocalConfig(prev => ({ ...prev, batchSize: value as number }))}
              min={1}
              max={20}
              step={1}
              sx={{
                color: '#90CAF9',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#90CAF9',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#90CAF9',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#404040',
                },
              }}
            />
          </Box>

          {/* 并行数量设置 */}
          <Box>
            <Typography variant="body2" sx={{ color: '#B0B0B0', mb: 1 }}>
              Parallelism Count: {localConfig.parallelismCount}
            </Typography>
            <Slider
              value={localConfig.parallelismCount}
              onChange={(_, value) => setLocalConfig(prev => ({ ...prev, parallelismCount: value as number }))}
              min={0}
              max={10}
              step={1}
              sx={{
                color: '#90CAF9',
                '& .MuiSlider-thumb': {
                  backgroundColor: '#90CAF9',
                },
                '& .MuiSlider-track': {
                  backgroundColor: '#90CAF9',
                },
                '& .MuiSlider-rail': {
                  backgroundColor: '#404040',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: '#808080', mt: 1, display: 'block' }}>
              0 = 无限制并行，1-10 = 并发任务数量
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              onClick={handleCancel}
              variant="outlined"
              sx={{
                color: '#B0B0B0',
                borderColor: '#404040',
                '&:hover': {
                  borderColor: '#606060',
                  backgroundColor: 'rgba(176, 176, 176, 0.08)',
                },
              }}
            >
              Cancel
            </Button>
            
            <Button
              onClick={handleSave}
              variant="contained"
              sx={{
                backgroundColor: '#1976D2',
                color: '#FFFFFF',
                '&:hover': {
                  backgroundColor: '#1565C0',
                },
              }}
            >
              Save
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}