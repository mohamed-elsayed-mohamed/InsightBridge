import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { useApi } from '../hooks/useApi';

interface AIQueryResponse {
  sqlQuery: string;
  explanation: string;
  visualization: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
}

interface AIQueryProps {
  schema: any; // Replace with proper schema type
  connectionString: string;
}

export const AIQuery: React.FC<AIQueryProps> = ({ schema, connectionString }) => {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<AIQueryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState('');
  const api = useApi();

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post<AIQueryResponse>('/api/AIQuery/generate', {
        question,
        schema,
        connectionString
      });
      setResponse(response.data);
    } catch (err) {
      setError('Failed to generate query');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClarification = async () => {
    if (!response || !clarification) return;

    try {
      setLoading(true);
      setError(null);
      const newResponse = await api.post<AIQueryResponse>('/api/AIQuery/clarify', {
        question,
        schema,
        connectionString,
        clarification
      });
      setResponse(newResponse.data);
      setClarification('');
    } catch (err) {
      setError('Failed to process clarification');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        AI Query Engine
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          label="Ask a question about your data"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          multiline
          rows={3}
          placeholder="Example: Show me the total sales by product category for the last month"
          sx={{ mb: 2 }}
        />
        
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !question || !schema}
          fullWidth
        >
          {loading ? <CircularProgress size={24} /> : 'Generate Query'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {response && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Generated SQL Query
            </Typography>
            <Paper
              sx={{
                p: 2,
                bgcolor: 'grey.100',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                mb: 2
              }}
            >
              {response.sqlQuery}
            </Paper>

            <Typography variant="h6" gutterBottom>
              Explanation
            </Typography>
            <Typography paragraph>
              {response.explanation}
            </Typography>

            <Typography variant="h6" gutterBottom>
              Suggested Visualization
            </Typography>
            <Typography paragraph>
              {response.visualization}
            </Typography>

            {response.needsClarification && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6" color="primary" gutterBottom>
                  Clarification Needed
                </Typography>
                <Typography paragraph>
                  {response.clarificationQuestion}
                </Typography>
                <TextField
                  fullWidth
                  label="Provide clarification"
                  value={clarification}
                  onChange={(e) => setClarification(e.target.value)}
                  multiline
                  rows={2}
                  sx={{ mb: 2 }}
                />
                <Button
                  variant="contained"
                  onClick={handleClarification}
                  disabled={loading || !clarification}
                >
                  {loading ? <CircularProgress size={24} /> : 'Submit Clarification'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}; 