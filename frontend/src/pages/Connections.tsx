import { Container, Typography, Box, Button, TextField, Paper } from '@mui/material';
import { useState } from 'react';

export const Connections = () => {
  const [connectionString, setConnectionString] = useState('');

  const handleConnect = () => {
    // TODO: Implement database connection logic
    console.log('Connecting to database...', connectionString);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Database Connections
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Add New Connection
          </Typography>
          <TextField
            fullWidth
            label="Connection String"
            value={connectionString}
            onChange={(e) => setConnectionString(e.target.value)}
            margin="normal"
            variant="outlined"
            placeholder="Server=localhost;Database=myDB;User Id=myUser;Password=myPassword;"
          />
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleConnect}
              disabled={!connectionString}
            >
              Test Connection
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}; 