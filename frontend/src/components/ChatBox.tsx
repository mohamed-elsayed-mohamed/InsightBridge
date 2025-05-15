import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Collapse,
  Alert,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useApi } from '../hooks/useApi';

interface Message {
  id: string;
  question: string;
  sqlQuery: string;
  explanation: string;
  visualization: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  timestamp: Date;
}

interface DatabaseSchema {
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

export const ChatBox: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const api = useApi();

  useEffect(() => {
    loadHistory();
    loadSchema();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadSchema = async () => {
    try {
      const response = await api.post('/api/DatabaseConnection/schema', {
        connectionString: localStorage.getItem('currentConnectionString')
      });
      setSchema(response.data);
    } catch (err) {
      console.error('Error loading schema:', err);
      setError('Failed to load database schema. Please connect to a database first.');
    }
  };

  const loadHistory = async () => {
    try {
      const response = await api.get('/api/ai/history');
      const history = response.data.map((item: any) => ({
        ...item,
        timestamp: new Date(),
      }));
      setMessages(history);
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    if (!schema) {
      setError('Please connect to a database first');
      return;
    }

    const question = input;
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/ai/query', {
        question,
        schema: JSON.stringify(schema)
      });

      const newMessage: Message = {
        id: Date.now().toString(),
        question,
        sqlQuery: response.data.sqlQuery,
        explanation: response.data.explanation,
        visualization: response.data.visualization,
        needsClarification: response.data.needsClarification,
        clarificationQuestion: response.data.clarificationQuestion,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to generate query. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClarify = async (messageId: string, clarification: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message || !schema) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/ai/clarify', {
        question: message.question,
        schema: JSON.stringify(schema),
        clarification,
      });

      const newMessage: Message = {
        id: Date.now().toString(),
        question: `${message.question} (Clarification: ${clarification})`,
        sqlQuery: response.data.sqlQuery,
        explanation: response.data.explanation,
        visualization: response.data.visualization,
        needsClarification: response.data.needsClarification,
        clarificationQuestion: response.data.clarificationQuestion,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, newMessage]);
    } catch (error) {
      console.error('Error sending clarification:', error);
      setError('Failed to process clarification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (messageId: string) => {
    setExpandedMessage(expandedMessage === messageId ? null : messageId);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper
        elevation={3}
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 2,
          mb: 2,
          bgcolor: 'background.paper',
        }}
      >
        <List>
          {messages.map((message) => (
            <React.Fragment key={message.id}>
              <ListItem alignItems="flex-start">
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" color="primary">
                        Q: {message.question}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => toggleExpand(message.id)}
                      >
                        {expandedMessage === message.id ? (
                          <ExpandLessIcon />
                        ) : (
                          <ExpandMoreIcon />
                        )}
                      </IconButton>
                    </Box>
                  }
                  secondary={
                    <Collapse in={expandedMessage === message.id}>
                      <Box sx={{ mt: 1 }}>
                        <Typography variant="subtitle2" color="text.secondary">
                          SQL Query:
                        </Typography>
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1,
                            bgcolor: 'grey.100',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {message.sqlQuery}
                        </Paper>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Explanation:
                        </Typography>
                        <Typography variant="body2">{message.explanation}</Typography>
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          Suggested Visualization:
                        </Typography>
                        <Typography variant="body2">
                          {message.visualization}
                        </Typography>
                        {message.needsClarification && message.clarificationQuestion && (
                          <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" color="warning.main">
                              Clarification Needed:
                            </Typography>
                            <Typography variant="body2" color="warning.main">
                              {message.clarificationQuestion}
                            </Typography>
                            <Button
                              variant="outlined"
                              color="warning"
                              size="small"
                              sx={{ mt: 1 }}
                              onClick={() => handleClarify(message.id, "Yes")}
                            >
                              Provide Clarification
                            </Button>
                          </Box>
                        )}
                      </Box>
                    </Collapse>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </List>
      </Paper>

      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          display: 'flex',
          gap: 1,
          bgcolor: 'background.paper',
        }}
      >
        <TextField
          fullWidth
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your data..."
          disabled={loading || !schema}
          multiline
          maxRows={4}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={loading || !input.trim() || !schema}
          endIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
        >
          Send
        </Button>
      </Paper>
    </Box>
  );
}; 