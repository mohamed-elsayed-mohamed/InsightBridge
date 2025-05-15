import React, { useState, ChangeEvent, useEffect } from 'react';
import { Box, Button, TextField, Typography, CircularProgress, Alert, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton } from '@mui/material';
import { useApi } from '../hooks/useApi';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

export interface DatabaseSchema {
  tables: Array<{
    name: string;
    schema: string;
    rowCount: number;
    columns: Array<{
      name: string;
      dataType: string;
      maxLength?: number;
      isNullable: boolean;
      isPrimaryKey: boolean;
    }>;
  }>;
  views: Array<{
    name: string;
    schema: string;
    definition: string;
  }>;
  storedProcedures: Array<{
    name: string;
    schema: string;
    definition: string;
  }>;
}

interface SavedConnection {
  id: number;
  name: string;
  connectionString: string;
  databaseType: string;
  createdAt: string;
  lastUsedAt?: string;
}

export interface DatabaseConnectionProps {
  onSchemaReceived: (schema: DatabaseSchema, connectionString: string) => void;
}

export const DatabaseConnection: React.FC<DatabaseConnectionProps> = ({ onSchemaReceived }) => {
  const [connectionString, setConnectionString] = useState('');
  const [connectionName, setConnectionName] = useState('');
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const api = useApi();

  useEffect(() => {
    loadSavedConnections();
  }, []);

  const loadSavedConnections = async () => {
    try {
      const response = await api.get<SavedConnection[]>('/api/DatabaseConnection');
      setSavedConnections(response.data);
    } catch (err) {
      console.error('Error loading saved connections:', err);
    }
  };

  const handleTestConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<{ isValid: boolean }>('/api/DatabaseConnection/test', {
        connectionString
      });
      if (response.data.isValid) {
        setError(null);
      } else {
        setError('Connection failed');
      }
    } catch (err) {
      setError('Failed to test connection');
    } finally {
      setLoading(false);
    }
  };

  const handleGetSchema = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<DatabaseSchema>('/api/DatabaseConnection/schema', {
        connectionString
      });
      setSchema(response.data);
      onSchemaReceived(response.data, connectionString);
    } catch (err) {
      setError('Failed to retrieve schema');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      await api.post('/api/DatabaseConnection', {
        name: connectionName,
        connectionString,
        databaseType: 'SqlServer' // You might want to make this dynamic
      });
      await loadSavedConnections();
      setError(null);
    } catch (err) {
      setError('Failed to save connection');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConnection = async (id: number) => {
    try {
      setLoading(true);
      setError(null);
      await api.delete(`/api/DatabaseConnection/${id}`);
      await loadSavedConnections();
      setError(null);
    } catch (err) {
      setError('Failed to delete connection');
    } finally {
      setLoading(false);
    }
  };

  const handleUseSavedConnection = (connection: SavedConnection) => {
    setConnectionString(connection.connectionString);
    setConnectionName(connection.name);
  };

  const handleConnectionStringChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConnectionString(e.target.value);
  };

  const handleConnectionNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConnectionName(e.target.value);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ p: 3, mb: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="h5" gutterBottom>
          Database Connection
        </Typography>
        
        {/* Saved Connections List */}
        {savedConnections.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Saved Connections
            </Typography>
            <List>
              {savedConnections.map((connection) => (
                <ListItem key={connection.id}>
                  <ListItemText
                    primary={connection.name}
                    secondary={`Last used: ${connection.lastUsedAt ? new Date(connection.lastUsedAt).toLocaleString() : 'Never'}`}
                  />
                  <ListItemSecondaryAction>
                    <Button onClick={() => handleUseSavedConnection(connection)} sx={{ mr: 1 }}>
                      Use
                    </Button>
                    <IconButton edge="end" onClick={() => handleDeleteConnection(connection.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        <TextField
          fullWidth
          label="Connection Name"
          value={connectionName}
          onChange={handleConnectionNameChange}
          margin="normal"
          placeholder="My Database Connection"
        />
        <TextField
          fullWidth
          label="Connection String"
          value={connectionString}
          onChange={handleConnectionStringChange}
          margin="normal"
          multiline
          rows={3}
          placeholder="Server=localhost;Database=YourDatabase;User Id=sa;Password=YourPassword;TrustServerCertificate=True;"
        />
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            onClick={handleTestConnection}
            disabled={loading || !connectionString}
          >
            {loading ? <CircularProgress size={24} /> : 'Test Connection'}
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={handleGetSchema}
            disabled={loading || !connectionString}
          >
            Get Schema
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<SaveIcon />}
            onClick={handleSaveConnection}
            disabled={loading || !connectionString || !connectionName}
          >
            Save Connection
          </Button>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      {schema && (
        <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 1 }}>
          <Typography variant="h5" gutterBottom>
            Database Schema
          </Typography>

          {/* Tables */}
          <Typography variant="h6" gutterBottom>
            Tables
          </Typography>
          {schema.tables.map((table) => (
            <Box key={`${table.schema}.${table.name}`} sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                {table.schema}.{table.name} ({table.rowCount} rows)
              </Typography>
              <List dense>
                {table.columns.map((column) => (
                  <ListItem key={column.name}>
                    <ListItemText
                      primary={column.name}
                      secondary={`${column.dataType}${column.maxLength ? `(${column.maxLength})` : ''} ${column.isNullable ? 'NULL' : 'NOT NULL'} ${column.isPrimaryKey ? 'PK' : ''}`}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          ))}

          {/* Views */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Views
          </Typography>
          {schema.views.map((view) => (
            <Box key={`${view.schema}.${view.name}`} sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                {view.schema}.{view.name}
              </Typography>
              <Typography variant="body2" component="pre" sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                {view.definition}
              </Typography>
            </Box>
          ))}

          {/* Stored Procedures */}
          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            Stored Procedures
          </Typography>
          {schema.storedProcedures.map((proc) => (
            <Box key={`${proc.schema}.${proc.name}`} sx={{ mb: 2 }}>
              <Typography variant="subtitle1">
                {proc.schema}.{proc.name}
              </Typography>
              <Typography variant="body2" component="pre" sx={{ mt: 1, p: 1, bgcolor: 'grey.100', borderRadius: 1 }}>
                {proc.definition}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}; 