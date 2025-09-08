import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ApiSettingsModal } from '../ApiSettingsModal';

// Mock the useSettingsStore hook
const mockUseSettingsStore = vi.fn();

vi.mock('../../stores/useSettingsStore', () => ({
  useSettingsStore: () => mockUseSettingsStore()
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock fetch
global.fetch = vi.fn();

describe('ApiSettingsModal', () => {
  const mockProps = {
    open: true,
    onClose: vi.fn(),
  };

  const mockStore = {
    apiConfig: {
      endpoint: '',
      apiKey: '',
    },
    updateApiConfig: vi.fn(),
    saveApiConfig: vi.fn(),
    loadApiConfig: vi.fn(),
    validateApiEndpoint: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSettingsStore.mockReturnValue(mockStore as any);
    mockStore.validateApiEndpoint.mockImplementation((url: string) => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
  });

  it('should render modal with correct title', () => {
    render(<ApiSettingsModal {...mockProps} />);
    
    expect(screen.getByText('API Configuration')).toBeInTheDocument();
    expect(screen.getByLabelText('API Endpoint URL')).toBeInTheDocument();
    expect(screen.getByLabelText('API Key')).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('should handle API endpoint input change', () => {
    render(<ApiSettingsModal {...mockProps} />);
    
    const endpointInput = screen.getByLabelText('API Endpoint URL');
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com' } });
    
    expect(endpointInput).toHaveValue('https://api.example.com');
  });

  it('should handle API key input change', () => {
    render(<ApiSettingsModal {...mockProps} />);
    
    const apiKeyInput = screen.getByLabelText('API Key');
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    
    expect(apiKeyInput).toHaveValue('test-key');
  });

  it('should toggle API key visibility', () => {
    render(<ApiSettingsModal {...mockProps} />);
    
    const apiKeyInput = screen.getByLabelText('API Key');
    const visibilityButton = screen.getByRole('button', { name: /toggle visibility/i });
    
    // Initially password type
    expect(apiKeyInput).toHaveAttribute('type', 'password');
    
    // Click to show
    fireEvent.click(visibilityButton);
    expect(apiKeyInput).toHaveAttribute('type', 'text');
    
    // Click to hide
    fireEvent.click(visibilityButton);
    expect(apiKeyInput).toHaveAttribute('type', 'password');
  });

  it('should validate form on save', async () => {
    render(<ApiSettingsModal {...mockProps} />);
    
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);
    
    // Should show validation errors
    expect(screen.getByText('API endpoint is required')).toBeInTheDocument();
    expect(screen.getByText('API key is required')).toBeInTheDocument();
    
    // Should not call save functions
    expect(mockStore.updateApiConfig).not.toHaveBeenCalled();
    expect(mockStore.saveApiConfig).not.toHaveBeenCalled();
  });

  it('should validate API endpoint URL format', async () => {
    render(<ApiSettingsModal {...mockProps} />);
    
    const endpointInput = screen.getByLabelText('API Endpoint URL');
    const saveButton = screen.getByText('Save');
    
    // Enter invalid URL
    fireEvent.change(endpointInput, { target: { value: 'invalid-url' } });
    fireEvent.click(saveButton);
    
    expect(screen.getByText('Please enter a valid URL')).toBeInTheDocument();
  });

  it('should save valid configuration', async () => {
    render(<ApiSettingsModal {...mockProps} />);
    
    const endpointInput = screen.getByLabelText('API Endpoint URL');
    const apiKeyInput = screen.getByLabelText('API Key');
    const saveButton = screen.getByText('Save');
    
    // Enter valid data
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com' } });
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    fireEvent.click(saveButton);
    
    // Should call save functions
    expect(mockStore.updateApiConfig).toHaveBeenCalledWith({
      endpoint: 'https://api.example.com',
      apiKey: 'test-key',
    });
    expect(mockStore.saveApiConfig).toHaveBeenCalled();
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should handle save error', async () => {
    mockStore.saveApiConfig.mockImplementation(() => {
      throw new Error('Save failed');
    });
    
    render(<ApiSettingsModal {...mockProps} />);
    
    const endpointInput = screen.getByLabelText('API Endpoint URL');
    const apiKeyInput = screen.getByLabelText('API Key');
    const saveButton = screen.getByText('Save');
    
    // Enter valid data
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com' } });
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    fireEvent.click(saveButton);
    
    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
    
    // Should not close modal
    expect(mockProps.onClose).not.toHaveBeenCalled();
  });

  it('should test connection successfully', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: 'OK',
    };
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);
    
    render(<ApiSettingsModal {...mockProps} />);
    
    const endpointInput = screen.getByLabelText('API Endpoint URL');
    const apiKeyInput = screen.getByLabelText('API Key');
    const testButton = screen.getByText('Test Connection');
    
    // Enter valid data
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com' } });
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    
    // Test connection
    fireEvent.click(testButton);
    
    // Should show loading state
    expect(screen.getByText('Test Connection')).toBeDisabled();
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('https://api.example.com/health', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer test-key',
          'Content-Type': 'application/json',
        },
        signal: expect.any(AbortSignal),
      });
    });
    
    await waitFor(() => {
      expect(screen.getByText('Connection successful! API is responding.')).toBeInTheDocument();
    });
  });

  it('should handle connection test failure', async () => {
    const mockResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    };
    
    global.fetch = vi.fn().mockResolvedValue(mockResponse);
    
    render(<ApiSettingsModal {...mockProps} />);
    
    const endpointInput = screen.getByLabelText('API Endpoint URL');
    const apiKeyInput = screen.getByLabelText('API Key');
    const testButton = screen.getByText('Test Connection');
    
    // Enter valid data
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com' } });
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    
    // Test connection
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('Connection failed: 401 Unauthorized')).toBeInTheDocument();
    });
  });

  it('should handle connection test network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    render(<ApiSettingsModal {...mockProps} />);
    
    const endpointInput = screen.getByLabelText('API Endpoint URL');
    const apiKeyInput = screen.getByLabelText('API Key');
    const testButton = screen.getByText('Test Connection');
    
    // Enter valid data
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com' } });
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    
    // Test connection
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('Connection failed: Network error')).toBeInTheDocument();
    });
  });

  it('should handle connection test timeout', async () => {
    global.fetch = vi.fn().mockImplementation(() => {
      return new Promise((_, reject) => {
        const error = new Error('AbortError');
        error.name = 'AbortError';
        setTimeout(() => reject(error), 100);
      });
    });
    
    render(<ApiSettingsModal {...mockProps} />);
    
    const endpointInput = screen.getByLabelText('API Endpoint URL');
    const apiKeyInput = screen.getByLabelText('API Key');
    const testButton = screen.getByText('Test Connection');
    
    // Enter valid data
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com' } });
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    
    // Test connection
    fireEvent.click(testButton);
    
    await waitFor(() => {
      expect(screen.getByText('Connection timeout. Please check if the API endpoint is accessible.')).toBeInTheDocument();
    });
  });

  it('should reset form on cancel', () => {
    render(<ApiSettingsModal {...mockProps} />);
    
    const endpointInput = screen.getByLabelText('API Endpoint URL');
    const apiKeyInput = screen.getByLabelText('API Key');
    const cancelButton = screen.getByText('Cancel');
    
    // Enter some data
    fireEvent.change(endpointInput, { target: { value: 'https://api.example.com' } });
    fireEvent.change(apiKeyInput, { target: { value: 'test-key' } });
    
    // Cancel
    fireEvent.click(cancelButton);
    
    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should not render when closed', () => {
    const { container } = render(<ApiSettingsModal {...mockProps} open={false} />);
    
    // Modal should not be in the DOM
    expect(container.firstChild).toBeNull();
  });
});