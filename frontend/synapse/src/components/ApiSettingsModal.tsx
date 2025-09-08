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
} from '@mui/material';
import { Visibility, VisibilityOff } from 'lucide-react';
import { useState } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

interface ApiSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function ApiSettingsModal({ open, onClose }: ApiSettingsModalProps) {
  const { apiConfig, updateApiConfig, saveApiConfig, loadApiConfig, validateApiEndpoint } = useSettingsStore();
  const [localConfig, setLocalConfig] = useState(apiConfig);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [errors, setErrors] = useState<{ endpoint?: string; apiKey?: string }>({});

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
      const response = await fetch(`${localConfig.endpoint}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localConfig.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Connection successful! API is responding.'
        });
      } else {
        setTestResult({
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`
        });
      }
    } catch (error) {
      let message = 'Connection failed. Please check your network and API configuration.';
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Connection timeout. Please check if the API endpoint is accessible.';
        } else if (error.message.includes('Failed to fetch')) {
          message = 'Network error. Please check if the API endpoint is correct and accessible.';
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
                    {showApiKey ? <VisibilityOff size={20} /> : <Visibility size={20} />}
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