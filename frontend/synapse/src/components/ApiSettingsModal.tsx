import {
  Box,
  Modal,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  Slider,
  Chip,
  Divider,
} from '@mui/material';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

interface ApiSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ApiSettingsModal({ open, onClose }: ApiSettingsModalProps) {
  const { apiConfig, updateApiConfig, saveApiConfig, loadApiConfig, validateApiEndpoint, getAvailablePresets, applyPreset, isDevelopmentMode } = useSettingsStore();
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<{ endpoint?: string; apiKey?: string }>({});
  const availablePresets = getAvailablePresets();

  const handleEndpointChange = (endpoint: string) => {
    setLocalConfig(prev => ({ ...prev, endpoint }));
    setErrors(prev => ({ ...prev, endpoint: '' }));
    setTestResult(null);
  };

  const handleApiKeyChange = (apiKey: string) => {
    setLocalConfig(prev => ({ ...prev, apiKey }));
    setErrors(prev => ({ ...prev, apiKey: '' }));
    setTestResult(null);
  };

  const handlePresetSelect = (presetKey: string) => {
    applyPreset(presetKey as any);
    setLocalConfig(useSettingsStore.getState().apiConfig);
    setTestResult(null);
  };

  const validateForm = () => {
    const newErrors: { endpoint?: string; apiKey?: string } = {};
    
    if (!localConfig.endpoint.trim()) {
      newErrors.endpoint = 'API endpoint is required';
    } else if (!validateApiEndpoint(localConfig.endpoint)) {
      newErrors.endpoint = 'Please enter a valid URL';
    }
    
    if (!localConfig.apiKey.trim()) {
      newErrors.apiKey = 'API key is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    try {
      updateApiConfig(localConfig);
      saveApiConfig();
      onClose();
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to save configuration'
      });
    }
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      // 测试 LLM API 连接 - 发送一个简单的测试请求
      const testResponse = await fetch(localConfig.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: localConfig.model,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 5,
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (testResponse.ok) {
        setTestResult({
          success: true,
          message: 'Connection successful! LLM API is responding.'
        });
      } else {
        const errorText = await testResponse.text();
        setTestResult({
          success: false,
          message: `Connection failed: ${testResponse.status} ${testResponse.statusText} - ${errorText.substring(0, 100)}`
        });
      }
    } catch (error) {
      let message = 'Connection failed. Please check your network and API configuration.';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Connection timeout. Please check if the API endpoint is accessible.';
        } else if (error.message.includes('Failed to fetch')) {
          message = 'Network error. Please check if the API endpoint is correct and accessible.';
        } else if (error.message.includes('CORS')) {
          message = 'CORS error. Please check if the API allows cross-origin requests.';
        } else {
          message = `Connection failed: ${error.message}`;
        }
      }
      
      setTestResult({
        success: false,
        message
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCancel = () => {
    setLocalConfig(apiConfig);
    setErrors({});
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
          API Configuration
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
          <TextField
            label="API Endpoint URL"
            value={localConfig.endpoint}
            onChange={(e) => handleEndpointChange(e.target.value)}
            error={!!errors.endpoint}
            helperText={errors.endpoint}
            fullWidth
            placeholder="https://api.example.com"
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#FFFFFF',
                '& fieldset': { borderColor: '#404040' },
                '&:hover fieldset': { borderColor: '#606060' },
                '&.Mui-focused fieldset': { borderColor: '#90CAF9' },
              },
              '& .MuiInputLabel-root': { color: '#B0B0B0' },
              '& .MuiFormHelperText-root': { color: '#FF6B6B' },
            }}
          />

          <TextField
            label="API Key"
            type={showApiKey ? 'text' : 'password'}
            value={localConfig.apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            error={!!errors.apiKey}
            helperText={errors.apiKey}
            fullWidth
            placeholder="Enter your API key"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowApiKey(!showApiKey)}
                    edge="end"
                    sx={{ color: '#B0B0B0' }}
                  >
                    {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#FFFFFF',
                '& fieldset': { borderColor: '#404040' },
                '&:hover fieldset': { borderColor: '#606060' },
                '&.Mui-focused fieldset': { borderColor: '#90CAF9' },
              },
              '& .MuiInputLabel-root': { color: '#B0B0B0' },
              '& .MuiFormHelperText-root': { color: '#FF6B6B' },
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

          {testResult && (
            <Alert
              severity={testResult.success ? 'success' : 'error'}
              sx={{
                '& .MuiAlert-message': { color: '#FFFFFF' },
                backgroundColor: testResult.success ? '#1B5E20' : '#B71C1C',
              }}
            >
              {testResult.message}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              onClick={handleTestConnection}
              disabled={isTesting}
              variant="outlined"
              sx={{
                color: '#90CAF9',
                borderColor: '#404040',
                '&:hover': {
                  borderColor: '#606060',
                  backgroundColor: 'rgba(144, 202, 249, 0.08)',
                },
              }}
            >
              {isTesting ? (
                <CircularProgress size={20} sx={{ mr: 1 }} />
              ) : null}
              Test Connection
            </Button>
            
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