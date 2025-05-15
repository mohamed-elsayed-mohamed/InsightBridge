import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { ChatBox } from '../components/ChatBox';

const ChatPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ height: '100vh', py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Query Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Ask questions about your data in natural language and get instant insights.
        </Typography>
      </Box>
      <Box sx={{ height: 'calc(100vh - 200px)' }}>
        <ChatBox />
      </Box>
    </Container>
  );
};

export default ChatPage; 