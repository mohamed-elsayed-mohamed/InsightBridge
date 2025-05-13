import { useState } from 'react';
import api from '../services/api';

interface ConnectionResult {
  success: boolean;
  message: string;
}

export const useDatabaseConnection = () => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testConnection = async (connectionString: string): Promise<ConnectionResult> => {
    setIsConnecting(true);
    setError(null);

    try {
      const response = await api.post('/connections/test', { connectionString });
      return {
        success: true,
        message: 'Connection successful',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to database';
      setError(message);
      return {
        success: false,
        message,
      };
    } finally {
      setIsConnecting(false);
    }
  };

  const saveConnection = async (connectionString: string, name: string): Promise<ConnectionResult> => {
    setIsConnecting(true);
    setError(null);

    try {
      await api.post('/connections', { connectionString, name });
      return {
        success: true,
        message: 'Connection saved successfully',
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save connection';
      setError(message);
      return {
        success: false,
        message,
      };
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    isConnecting,
    error,
    testConnection,
    saveConnection,
  };
}; 