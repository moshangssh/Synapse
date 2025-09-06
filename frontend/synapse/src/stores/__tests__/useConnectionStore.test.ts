import { renderHook, act } from '@testing-library/react';
import { useConnectionStore } from '../useConnectionStore';

// Mock ApiError type
interface MockApiError {
  message: string;
  code?: string;
  details?: any;
}

interface MockUserInfo {
  name: string;
  email: string;
  avatar: string;
}

describe('useConnectionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useConnectionStore());
    act(() => {
      result.current.setConnectionStatus('disconnected');
      result.current.setErrorMessage(null);
      result.current.setUserInfo(null);
    });
  });

  describe('initial state', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      expect(result.current.connectionStatus).toBe('disconnected');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.userInfo).toBeNull();
    });
  });

  describe('connectionStatus', () => {
    it('should set connection status correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      act(() => {
        result.current.setConnectionStatus('connected');
      });

      expect(result.current.connectionStatus).toBe('connected');

      act(() => {
        result.current.setConnectionStatus('connecting');
      });

      expect(result.current.connectionStatus).toBe('connecting');

      act(() => {
        result.current.setConnectionStatus('error');
      });

      expect(result.current.connectionStatus).toBe('error');

      act(() => {
        result.current.setConnectionStatus('disconnected');
      });

      expect(result.current.connectionStatus).toBe('disconnected');

      act(() => {
        result.current.setConnectionStatus('standalone');
      });

      expect(result.current.connectionStatus).toBe('standalone');
    });

    it('should handle all valid status types', () => {
      const { result } = renderHook(() => useConnectionStore());
      const validStatuses: Array<'connected' | 'connecting' | 'error' | 'disconnected' | 'standalone'> = 
        ['connected', 'connecting', 'error', 'disconnected', 'standalone'];
      
      validStatuses.forEach((status) => {
        act(() => {
          result.current.setConnectionStatus(status);
        });

        expect(result.current.connectionStatus).toBe(status);
      });
    });
  });

  describe('errorMessage', () => {
    it('should set error message correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      const mockError: MockApiError = {
        message: 'Connection failed',
        code: 'CONN_ERROR',
        details: { timeout: 5000 },
      };
      
      act(() => {
        result.current.setErrorMessage(mockError);
      });

      expect(result.current.errorMessage).toEqual(mockError);
    });

    it('should clear error message when set to null', () => {
      const { result } = renderHook(() => useConnectionStore());
      const mockError: MockApiError = {
        message: 'Connection failed',
      };
      
      // First set error
      act(() => {
        result.current.setErrorMessage(mockError);
      });

      expect(result.current.errorMessage).toEqual(mockError);

      // Then clear it
      act(() => {
        result.current.setErrorMessage(null);
      });

      expect(result.current.errorMessage).toBeNull();
    });

    it('should handle error with different structures', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      // Error with only message
      act(() => {
        result.current.setErrorMessage({ message: 'Simple error' });
      });

      expect(result.current.errorMessage).toEqual({ message: 'Simple error' });

      // Error with code
      act(() => {
        result.current.setErrorMessage({ message: 'Error with code', code: 'ERR_001' });
      });

      expect(result.current.errorMessage).toEqual({ 
        message: 'Error with code', 
        code: 'ERR_001' 
      });

      // Error with details
      act(() => {
        result.current.setErrorMessage({ 
          message: 'Error with details', 
          code: 'ERR_002',
          details: { stack: 'stack trace' }
        });
      });

      expect(result.current.errorMessage).toEqual({ 
        message: 'Error with details', 
        code: 'ERR_002',
        details: { stack: 'stack trace' }
      });
    });
  });

  describe('userInfo', () => {
    it('should set user info correctly', () => {
      const { result } = renderHook(() => useConnectionStore());
      const mockUser: MockUserInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
      };
      
      act(() => {
        result.current.setUserInfo(mockUser);
      });

      expect(result.current.userInfo).toEqual(mockUser);
    });

    it('should clear user info when set to null', () => {
      const { result } = renderHook(() => useConnectionStore());
      const mockUser: MockUserInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
      };
      
      // First set user info
      act(() => {
        result.current.setUserInfo(mockUser);
      });

      expect(result.current.userInfo).toEqual(mockUser);

      // Then clear it
      act(() => {
        result.current.setUserInfo(null);
      });

      expect(result.current.userInfo).toBeNull();
    });

    it('should handle user info with different data types', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      // User with different avatar formats
      const userWithBase64Avatar: MockUserInfo = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      };

      act(() => {
        result.current.setUserInfo(userWithBase64Avatar);
      });

      expect(result.current.userInfo).toEqual(userWithBase64Avatar);

      // User with relative avatar path
      const userWithRelativeAvatar: MockUserInfo = {
        name: 'Bob Smith',
        email: 'bob@example.com',
        avatar: '/avatars/bob.jpg',
      };

      act(() => {
        result.current.setUserInfo(userWithRelativeAvatar);
      });

      expect(result.current.userInfo).toEqual(userWithRelativeAvatar);
    });
  });

  describe('integration scenarios', () => {
    it('should manage complete connection state consistently', () => {
      const { result } = renderHook(() => useConnectionStore());
      const mockUser: MockUserInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar.jpg',
      };
      const mockError: MockApiError = {
        message: 'Authentication failed',
        code: 'AUTH_ERROR',
      };
      
      // Simulate connection flow
      act(() => {
        result.current.setConnectionStatus('connecting');
      });

      expect(result.current.connectionStatus).toBe('connecting');

      // Connection fails
      act(() => {
        result.current.setConnectionStatus('error');
        result.current.setErrorMessage(mockError);
      });

      expect(result.current.connectionStatus).toBe('error');
      expect(result.current.errorMessage).toEqual(mockError);

      // Clear error and retry
      act(() => {
        result.current.setErrorMessage(null);
        result.current.setConnectionStatus('connecting');
      });

      expect(result.current.errorMessage).toBeNull();
      expect(result.current.connectionStatus).toBe('connecting');

      // Connection succeeds
      act(() => {
        result.current.setConnectionStatus('connected');
        result.current.setUserInfo(mockUser);
      });

      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.userInfo).toEqual(mockUser);
    });

    it('should handle standalone mode', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      act(() => {
        result.current.setConnectionStatus('standalone');
        result.current.setErrorMessage(null);
        result.current.setUserInfo(null);
      });

      expect(result.current.connectionStatus).toBe('standalone');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.userInfo).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid status changes', () => {
      const { result } = renderHook(() => useConnectionStore());
      const statuses: Array<'connected' | 'connecting' | 'error' | 'disconnected' | 'standalone'> = 
        ['connected', 'connecting', 'error', 'disconnected', 'standalone'];
      
      // Rapid status changes
      statuses.forEach((status) => {
        act(() => {
          result.current.setConnectionStatus(status);
        });
        expect(result.current.connectionStatus).toBe(status);
      });
    });

    it('should handle error clearing during different states', () => {
      const { result } = renderHook(() => useConnectionStore());
      const mockError: MockApiError = {
        message: 'Test error',
      };
      
      // Set error in different states
      act(() => {
        result.current.setConnectionStatus('error');
        result.current.setErrorMessage(mockError);
      });

      expect(result.current.errorMessage).toEqual(mockError);

      // Clear error while keeping error status
      act(() => {
        result.current.setErrorMessage(null);
      });

      expect(result.current.errorMessage).toBeNull();
      expect(result.current.connectionStatus).toBe('error');

      // Change status and ensure error remains cleared
      act(() => {
        result.current.setConnectionStatus('connected');
      });

      expect(result.current.errorMessage).toBeNull();
      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should handle user info updates while connected', () => {
      const { result } = renderHook(() => useConnectionStore());
      const initialUser: MockUserInfo = {
        name: 'John Doe',
        email: 'john@example.com',
        avatar: 'https://example.com/avatar1.jpg',
      };
      const updatedUser: MockUserInfo = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        avatar: 'https://example.com/avatar2.jpg',
      };
      
      // Connect with initial user
      act(() => {
        result.current.setConnectionStatus('connected');
        result.current.setUserInfo(initialUser);
      });

      expect(result.current.userInfo).toEqual(initialUser);

      // Update user info while keeping connection
      act(() => {
        result.current.setUserInfo(updatedUser);
      });

      expect(result.current.userInfo).toEqual(updatedUser);
      expect(result.current.connectionStatus).toBe('connected');
    });

    it('should handle special characters in user data', () => {
      const { result } = renderHook(() => useConnectionStore());
      const userWithSpecialChars: MockUserInfo = {
        name: '张三',
        email: 'zhangsan@example.com',
        avatar: 'https://example.com/张三.jpg',
      };
      
      act(() => {
        result.current.setUserInfo(userWithSpecialChars);
      });

      expect(result.current.userInfo).toEqual(userWithSpecialChars);
    });

    it('should handle error messages with special characters', () => {
      const { result } = renderHook(() => useConnectionStore());
      const errorWithSpecialChars: MockApiError = {
        message: '连接失败: 网络超时',
        code: '网络错误',
        details: { 信息: '请检查网络连接' },
      };
      
      act(() => {
        result.current.setErrorMessage(errorWithSpecialChars);
      });

      expect(result.current.errorMessage).toEqual(errorWithSpecialChars);
    });
  });

  describe('state independence', () => {
    it('should allow independent state management', () => {
      const { result } = renderHook(() => useConnectionStore());
      
      // Set all states
      act(() => {
        result.current.setConnectionStatus('connected');
        result.current.setErrorMessage({ message: 'Warning message' });
        result.current.setUserInfo({
          name: 'Test User',
          email: 'test@example.com',
          avatar: 'avatar.jpg',
        });
      });

      // Clear one state should not affect others
      act(() => {
        result.current.setErrorMessage(null);
      });

      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.userInfo).toEqual({
        name: 'Test User',
        email: 'test@example.com',
        avatar: 'avatar.jpg',
      });

      // Clear another state
      act(() => {
        result.current.setUserInfo(null);
      });

      expect(result.current.connectionStatus).toBe('connected');
      expect(result.current.errorMessage).toBeNull();
      expect(result.current.userInfo).toBeNull();
    });
  });
});