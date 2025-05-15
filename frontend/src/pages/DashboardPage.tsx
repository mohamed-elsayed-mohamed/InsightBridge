import React, { useState, useEffect, useRef } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import {
  Box, Typography, Paper, TextField, Button, MenuItem, CircularProgress, Alert, IconButton, Stack, Divider, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { useApi } from '../hooks/useApi';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import RefreshIcon from '@mui/icons-material/Refresh';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HistoryIcon from '@mui/icons-material/History';
import FileSaver from 'file-saver';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, ChartTooltip, Legend);

const chartTypeMap = {
  bar: Bar,
  line: Line,
  pie: Pie,
};

const defaultQuery = `SELECT 
  FORMAT(SaleDate, 'yyyy-MM') AS Month,
  SUM(Quantity) AS TotalSold
FROM Sales
WHERE ProductID = 1 -- Change to desired ProductID
GROUP BY FORMAT(SaleDate, 'yyyy-MM')
ORDER BY Month;`;
const defaultColor = 'rgba(75,192,192,0.4)';
const defaultConnectionString = 'Server=.;Database=TestAIDatabase;User Id=sa;Password=Alpha-13;TrustServerCertificate=True;';
const defaultAiPrompt = 'Generate a SQL query to show monthly sales data';

interface ChartConfig {
  id: string;
  title: string;
  type: string;
  query: string;
  color: string;
  connectionString: string;
  aiPrompt: string;
  layout: Layout;
  data?: any[];
  columns?: string[];
}

const getRandomColor = () =>
  '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
const getRandomColors = (count: number) =>
  Array.from({ length: count }, getRandomColor);

const ChartWidget = ({
  id,
  title,
  type,
  query: initialQuery,
  color,
  connectionString,
  aiPrompt,
  onChange,
  onRemove,
}: {
  id: string;
  title: string;
  type: string;
  query: string;
  color: string | string[];
  connectionString: string;
  aiPrompt: string;
  onChange: (changes: Partial<ChartConfig>) => void;
  onRemove: () => void;
}) => {
  const [data, setData] = useState<any>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seriesColors, setSeriesColors] = useState<string[]>(getRandomColors(1));
  const [valueColumns, setValueColumns] = useState<string[]>([]); // for multi-series
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const api = useApi();
  const chartRef = useRef<any>(null);

  // Update local query state when prop changes
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    // Reset colors if columns change
    if (type === 'pie' && data && columns.length >= 2) {
      // Pie: one color per slice (unique label)
      const labels = data.map((row: any) => row[columns[0]]);
      setSeriesColors(getRandomColors(labels.length));
    } else if ((type === 'bar' || type === 'line') && valueColumns.length > 0) {
      setSeriesColors(getRandomColors(valueColumns.length));
    }
  }, [type, data, columns, valueColumns]);

  const handleVisualize = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await api.post('/api/visualization/visualize', {
        query,
        connectionString,
        aiPrompt,
      });
      setColumns(res.data.columns);
      setData(res.data.data);
      onChange({ data: res.data.data, columns: res.data.columns });
      // Update the query field if a generated query is returned
      if (res.data.generatedQuery) {
        setQuery(res.data.generatedQuery);
        onChange({ query: res.data.generatedQuery });
      }
      // Detect value columns for multi-series
      if (res.data.columns.length > 2 && (type === 'bar' || type === 'line')) {
        setValueColumns(res.data.columns.slice(1));
        setSeriesColors(getRandomColors(res.data.columns.length - 1));
      } else if (type === 'pie' && res.data.data && res.data.columns.length >= 2) {
        setValueColumns([res.data.columns[1]]);
        setSeriesColors(getRandomColors(res.data.data.length));
      } else {
        setValueColumns(res.data.columns.length > 1 ? [res.data.columns[1]] : []);
        setSeriesColors(getRandomColors(1));
      }
      if (res.data.chartTypes && res.data.chartTypes.length > 0) {
        onChange({ type: res.data.chartTypes[0] });
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to visualize data');
    } finally {
      setLoading(false);
    }
  };

  // Handle color change for a series/slice
  const handleColorChange = (idx: number, newColor: string) => {
    const newColors = [...seriesColors];
    newColors[idx] = newColor;
    setSeriesColors(newColors);
  };

  // Render color pickers for each value/label (for all chart types)
  let colorPickers = null;
  if (data && columns.length >= 2) {
    const labels = data.map((row: any) => row[columns[0]]);
    colorPickers = labels.map((label: string, idx: number) => (
      <Box key={label} sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
        <TextField
          label={label}
          type="color"
          value={seriesColors[idx] || getRandomColors(labels.length)[idx]}
          onChange={e => handleColorChange(idx, e.target.value)}
          size="small"
          sx={{ width: 60, minWidth: 60, p: 0, background: 'none', mr: 1 }}
          InputLabelProps={{ shrink: true }}
        />
        <Typography variant="body2">{label}</Typography>
      </Box>
    ));
  }

  // Prepare chart.js data
  let chartData: any = null;
  if (data && columns.length >= 2) {
    const labels = data.map((row: any) => row[columns[0]]);
    if (type === 'pie') {
      // Pie: one label per row, one value per row
      const values = data.map((row: any) => row[columns[1]]);
      chartData = {
        labels,
        datasets: [
          {
            label: title,
            data: values,
            backgroundColor: seriesColors,
            borderColor: seriesColors,
            borderWidth: 1,
          },
        ],
      };
    } else if (type === 'bar' || type === 'line') {
      // Bar/Line: one dataset for single-series, multiple datasets for multi-series
      if (valueColumns.length > 1) {
        // Multi-series: each dataset gets the same color array (per value/label)
        chartData = {
          labels,
          datasets: valueColumns.map((col, idx) => ({
            label: col,
            data: data.map((row: any) => row[col]),
            backgroundColor: seriesColors,
            borderColor: seriesColors,
            borderWidth: 1,
          })),
        };
      } else {
        // Single-series: color per value/label
        const values = data.map((row: any) => row[columns[1]]);
        chartData = {
          labels,
          datasets: [
            {
              label: valueColumns[0] || columns[1],
              data: values,
              backgroundColor: seriesColors,
              borderColor: seriesColors,
              borderWidth: 1,
            },
          ],
        };
      }
    }
  }

  const ChartComponent = chartTypeMap[type as keyof typeof chartTypeMap];

  // Export handlers for this chart
  const handleExport = async (format: 'pdf' | 'excel') => {
    if (!data || !columns || data.length === 0 || columns.length === 0) {
      alert('Please visualize the chart before exporting.');
      return;
    }
    if (format === 'pdf') {
      // Get chart image as PNG
      let chartImage = '';
      if (chartRef.current && chartRef.current.toBase64Image) {
        chartImage = chartRef.current.toBase64Image();
      }
      // Build legend HTML
      let legendHtml = '<div style="margin-top:10px;"><b>Legend:</b><ul style="list-style:none;padding:0;">';
      if (chartData && chartData.datasets) {
        chartData.datasets.forEach((ds: any, idx: number) => {
          legendHtml += `<li style='display:flex;align-items:center;margin-bottom:4px;'><span style='display:inline-block;width:16px;height:16px;background:${Array.isArray(ds.backgroundColor) ? ds.backgroundColor[idx] || ds.backgroundColor[0] : ds.backgroundColor};margin-right:8px;'></span>${ds.label}</li>`;
        });
      }
      legendHtml += '</ul></div>';
      // Build export HTML
      let html = `<h2>${title}</h2>`;
      if (chartImage) html += `<img src='${chartImage}' style='max-width:600px;display:block;margin-bottom:10px;' />`;
      html += legendHtml;
      const res = await api.post('/api/export/pdf', { Html: html }, { responseType: 'blob' });
      FileSaver.saveAs(res.data, `${title || 'report'}.pdf`);
    } else {
      const excelData = data.map((row: any) => columns.map(col => row[col]));
      const res = await api.post('/api/export/excel', { Columns: columns, Data: excelData }, { responseType: 'blob' });
      FileSaver.saveAs(res.data, `${title || 'report'}.xlsx`);
    }
  };

  return (
    <Paper sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3, borderRadius: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: 'grey.100', px: 2, py: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <IconButton className="chart-widget-header" size="small" sx={{ cursor: 'grab', mr: 1 }}>
          <DragIndicatorIcon />
        </IconButton>
        <TextField
          label="Chart Title"
          value={title}
          onChange={(e) => onChange({ title: e.target.value })}
          size="small"
          sx={{ flexGrow: 1, mx: 1 }}
        />
        <IconButton onClick={() => setConfirmRemove(true)} size="small">
          <DeleteIcon />
        </IconButton>
      </Box>
      <Divider />
      {/* Controls */}
      <Box sx={{ p: 2, pb: 0 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <TextField
            select
            label="Chart Type"
            value={type}
            onChange={e => onChange({ type: e.target.value })}
            size="small"
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="bar">Bar</MenuItem>
            <MenuItem value="line">Line</MenuItem>
            <MenuItem value="pie">Pie</MenuItem>
          </TextField>
        </Stack>
        {/* Color pickers for each value/label */}
        {colorPickers && (
          <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {colorPickers}
          </Box>
        )}
        <TextField
          fullWidth
          label="AI Prompt"
          value={aiPrompt}
          onChange={(e) => onChange({ aiPrompt: e.target.value })}
          multiline
          rows={2}
          placeholder="Enter your prompt for AI to generate SQL query..."
        />
        <TextField
          fullWidth
          label="Database Connection String"
          value={connectionString}
          onChange={e => onChange({ connectionString: e.target.value })}
          sx={{ mb: 1 }}
          size="small"
        />
        <TextField
          label="SQL Query"
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            onChange({ query: e.target.value });
          }}
          multiline
          rows={4}
          fullWidth
          sx={{ mb: 1 }}
        />
        <Button variant="contained" onClick={handleVisualize} disabled={loading || !query || !connectionString} size="small" sx={{ mb: 1 }}>
          {loading ? <CircularProgress size={16} /> : 'Visualize'}
        </Button>
        {/* Export buttons for this chart */}
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button variant="outlined" onClick={() => handleExport('pdf')} size="small">Export PDF</Button>
          <Button variant="outlined" onClick={() => handleExport('excel')} size="small">Export Excel</Button>
        </Stack>
      </Box>
      <Divider />
      {/* Chart Area */}
      <Box sx={{ flex: 1, p: 2, position: 'relative', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading && (
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(255,255,255,0.7)', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        )}
        {error && <Alert severity="error" sx={{ mb: 2, width: '100%' }}>{error}</Alert>}
        {!loading && !chartData && !error && (
          <Typography variant="body2" color="text.secondary">No data to display. Enter a query and click Visualize.</Typography>
        )}
        {chartData && ChartComponent && !loading && (
          <Box sx={{ width: '100%', height: 220 }}>
            <ChartComponent ref={chartRef} data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true } } }} />
          </Box>
        )}
      </Box>
      {/* Remove Confirmation Dialog */}
      <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)}>
        <DialogTitle>Remove Chart</DialogTitle>
        <DialogContent>Are you sure you want to remove this chart?</DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(false)}>Cancel</Button>
          <Button onClick={onRemove} color="error">Remove</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

const initialCharts: ChartConfig[] = [
  {
    id: 'chart1',
    title: 'Chart 1',
    type: 'bar',
    query: defaultQuery,
    color: defaultColor,
    connectionString: defaultConnectionString,
    aiPrompt: defaultAiPrompt,
    layout: { i: 'chart1', x: 0, y: 0, w: 6, h: 8 },
  },
];

const DashboardPage: React.FC = () => {
  const [charts, setCharts] = useState<ChartConfig[]>(initialCharts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [exportHistory, setExportHistory] = useState<any[]>([]);
  // Schedule form state
  const [scheduleConnectionString, setScheduleConnectionString] = useState('');
  const [scheduleSqlQuery, setScheduleSqlQuery] = useState('');
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const api = useApi();

  const handleAddChart = () => {
    const id = `chart${charts.length + 1}`;
    setCharts([
      ...charts,
      {
        id,
        title: `Chart ${charts.length + 1}`,
        type: 'bar',
        query: defaultQuery,
        color: defaultColor,
        connectionString: defaultConnectionString,
        aiPrompt: defaultAiPrompt,
        layout: { i: id, x: 0, y: Infinity, w: 6, h: 8 },
      },
    ]);
  };

  const handleRemoveChart = (id: string) => {
    setCharts(charts.filter(c => c.id !== id));
  };

  const handleChartChange = (id: string, changes: Partial<ChartConfig>) => {
    setCharts(charts.map(c => (c.id === id ? { ...c, ...changes } : c)));
  };

  const handleSaveDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/visualization/dashboard/save', charts);
    } catch (err: any) {
      setError('Failed to save dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/visualization/dashboard');
      if (res.data.dashboard && Array.isArray(res.data.dashboard)) {
        setCharts(res.data.dashboard);
      }
    } catch (err: any) {
      setError('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDashboard = () => {
    setCharts(initialCharts);
  };

  // Schedule handlers
  const handleSchedule = () => {
    // Pre-fill with first chart if available
    const chart = charts[0];
    setScheduleConnectionString(chart?.connectionString || '');
    setScheduleSqlQuery(chart?.query || '');
    setScheduleEmail('');
    setScheduleDateTime('');
    setScheduleDialogOpen(true);
  };
  const handleScheduleConfirm = async () => {
    setScheduleDialogOpen(false);
    if (!scheduleConnectionString || !scheduleSqlQuery || !scheduleEmail || !scheduleDateTime) {
      alert('Please fill in all schedule fields.');
      return;
    }
    try {
      await api.post('/api/schedule', {
        connectionString: scheduleConnectionString,
        sqlQuery: scheduleSqlQuery,
        format: exportFormat,
        scheduledTimeUtc: scheduleDateTime,
        email: scheduleEmail,
      });
      alert('Report scheduled! You will receive an email at the scheduled time.');
    } catch (err: any) {
      alert('Failed to schedule report: ' + (err?.response?.data?.error || err.message));
    }
  };

  // History handlers
  const handleHistory = async () => {
    setHistoryDialogOpen(true);
    const res = await api.get('/api/export/history');
    setExportHistory(res.data);
  };
  const handleHistoryClose = () => setHistoryDialogOpen(false);

  const layout: Layout[] = charts.map(c => ({ ...c.layout, i: c.id }));

  return (
    <Box sx={{ p: { xs: 1, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 6, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5 }}>Dashboard</Typography>
            <Typography variant="body2" color="text.secondary">Visualize your data with customizable charts. Drag, resize, and edit widgets as needed.</Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Schedule Report"><span><Button variant="outlined" color="secondary" startIcon={<ScheduleIcon />} onClick={handleSchedule} disabled={loading}>Schedule</Button></span></Tooltip>
            <Tooltip title="Export History"><span><Button variant="outlined" startIcon={<HistoryIcon />} onClick={handleHistory} disabled={loading}>History</Button></span></Tooltip>
            <Tooltip title="Save Dashboard"><span><Button variant="contained" color="primary" startIcon={<SaveIcon />} onClick={handleSaveDashboard} disabled={loading}>Save</Button></span></Tooltip>
            <Tooltip title="Load Dashboard"><span><Button variant="outlined" color="primary" startIcon={<RestoreIcon />} onClick={handleLoadDashboard} disabled={loading}>Load</Button></span></Tooltip>
            <Tooltip title="Reset Dashboard"><span><Button variant="outlined" color="secondary" startIcon={<RefreshIcon />} onClick={handleResetDashboard} disabled={loading}>Reset</Button></span></Tooltip>
            <Tooltip title="Add Chart"><span><Button variant="outlined" startIcon={<AddIcon />} onClick={handleAddChart} disabled={loading}>Add Chart</Button></span></Tooltip>
          </Stack>
        </Stack>
        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </Paper>
      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Report</DialogTitle>
        <DialogContent>
          <TextField
            select
            label="Format"
            value={exportFormat}
            onChange={e => setExportFormat(e.target.value as 'pdf' | 'excel')}
            sx={{ mt: 2, minWidth: 120 }}
          >
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="excel">Excel</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)}>
        <DialogTitle>Schedule Report</DialogTitle>
        <DialogContent>
          <TextField select label="Format" value={exportFormat} onChange={e => setExportFormat(e.target.value as 'pdf' | 'excel')} sx={{ mt: 2, minWidth: 120 }} fullWidth>
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="excel">Excel</MenuItem>
          </TextField>
          <TextField
            label="Database Connection String"
            value={scheduleConnectionString}
            onChange={e => setScheduleConnectionString(e.target.value)}
            sx={{ mt: 2 }}
            fullWidth
          />
          <TextField
            label="SQL Query"
            value={scheduleSqlQuery}
            onChange={e => setScheduleSqlQuery(e.target.value)}
            sx={{ mt: 2 }}
            fullWidth
            multiline
            rows={2}
          />
          <TextField
            label="Recipient Email"
            value={scheduleEmail}
            onChange={e => setScheduleEmail(e.target.value)}
            sx={{ mt: 2 }}
            fullWidth
            type="email"
          />
          <TextField
            label="Schedule Date & Time (UTC)"
            type="datetime-local"
            value={scheduleDateTime}
            onChange={e => setScheduleDateTime(e.target.value)}
            sx={{ mt: 2 }}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleScheduleConfirm} variant="contained">Schedule</Button>
        </DialogActions>
      </Dialog>
      {/* Export History Dialog */}
      <Dialog open={historyDialogOpen} onClose={handleHistoryClose} maxWidth="sm" fullWidth>
        <DialogTitle>Export History</DialogTitle>
        <DialogContent>
          {exportHistory.length === 0 ? (
            <Typography variant="body2">No export history yet.</Typography>
          ) : (
            <Box>
              {exportHistory.map((item, idx) => (
                <Box key={idx} sx={{ mb: 1 }}>
                  <Typography variant="body2">
                    {item.Type} - {item.FileName} - {new Date(item.Timestamp).toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleHistoryClose}>Close</Button>
        </DialogActions>
      </Dialog>
      <GridLayout
        className="layout"
        layout={layout}
        cols={12}
        rowHeight={60}
        width={1200}
        draggableHandle=".chart-widget-header"
        onLayoutChange={newLayout => {
          setCharts(charts =>
            charts.map(c => {
              const l = newLayout.find(l => l.i === c.id);
              return l ? { ...c, layout: l } : c;
            })
          );
        }}
      >
        {charts.map(chart => (
          <div key={chart.id}>
            <ChartWidget
              {...chart}
              onChange={changes => handleChartChange(chart.id, changes)}
              onRemove={() => handleRemoveChart(chart.id)}
            />
          </div>
        ))}
      </GridLayout>
    </Box>
  );
};

export default DashboardPage; 