import { Container, Typography, Box, Grid, Paper, Button } from '@mui/material';
import { useState } from 'react';

export const Reports = () => {
  const [reports] = useState([
    { id: 1, title: 'Sales Overview', date: '2024-03-20' },
    { id: 2, title: 'Customer Analysis', date: '2024-03-19' },
    { id: 3, title: 'Inventory Status', date: '2024-03-18' },
  ]);

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Reports
        </Typography>
        <Box sx={{ mb: 3 }}>
          <Button variant="contained" color="primary">
            Create New Report
          </Button>
        </Box>
        <Grid container spacing={3}>
          {reports.map((report) => (
            <Grid item xs={12} md={4} key={report.id}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {report.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {report.date}
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Button size="small" sx={{ mr: 1 }}>
                    View
                  </Button>
                  <Button size="small" color="secondary">
                    Edit
                  </Button>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}; 