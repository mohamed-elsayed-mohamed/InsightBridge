import { Container, Typography, Grid, Paper, Box } from '@mui/material';

export const Dashboard = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Reports
              </Typography>
              {/* Add reports list component here */}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Database Connections
              </Typography>
              {/* Add connections list component here */}
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quick Insights
              </Typography>
              {/* Add insights component here */}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}; 