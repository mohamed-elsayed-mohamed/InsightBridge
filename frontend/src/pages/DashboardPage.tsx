import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import {
  Box, Typography, Paper, TextField, Button, MenuItem, CircularProgress, Alert, IconButton, Stack, Divider, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  Card, CardContent, CardHeader, CardActions, Chip, useTheme, alpha, Fade, Zoom, Collapse, FormControl, InputLabel, Select, FormControlLabel, Checkbox, Grid,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormLabel
} from '@mui/material';
import { Bar, Line, Pie, Scatter, Bubble, Radar, Doughnut, PolarArea } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  RadialLinearScale,
  Decimation
} from 'chart.js';
import { useApi } from '../hooks/useApi';
import { DatabaseConnection } from '../services/dbService';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import RefreshIcon from '@mui/icons-material/Refresh';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ScheduleIcon from '@mui/icons-material/Schedule';
import HistoryIcon from '@mui/icons-material/History';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CodeIcon from '@mui/icons-material/Code';
import PaletteIcon from '@mui/icons-material/Palette';
import FileSaver from 'file-saver';
import 'chartjs-plugin-zoom';
import 'chartjs-plugin-annotation';
import VisibilityIcon from '@mui/icons-material/Visibility';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  ChartTooltip,
  Legend,
  RadialLinearScale,
  Decimation
);

// Types
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
  seriesColors?: string[];
  valueColumns?: string[];
}

// Add new interface for column selection
interface ColumnSelection {
  xAxis: string[];
  yAxis: string[];
}

// Add new interfaces for chart features
interface ChartFeature {
  id: string;
  name: string;
  description: string;
  applicableTypes: string[];
}

// Add new interfaces for export options
interface ExportOptions {
  format: 'pdf' | 'excel';
  title: string;
  description?: string;
  quality: 'low' | 'medium' | 'high';
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  includeMetadata: boolean;
  includePageNumbers: boolean;
  includeLogo: boolean;
  logoUrl?: string;
  customHeader?: string;
  customFooter?: string;
  includeWatermark: boolean;
  watermarkText?: string;
  dataSource?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  showWatermark?: boolean;
  logo?: string;
  footerText?: string;
  // Email options
  sendViaEmail: boolean;
  recipientEmail: string;
  emailSubject: string;
  emailMessage: string;
  chartImage?: string;
  // Excel specific options
  includeChart?: boolean;
  includeDataTable?: boolean;
  includeFormulas?: boolean;
  includeFilters?: boolean;
  includePivotTable?: boolean;
  sheetName?: string;
  autoFitColumns?: boolean;
  freezeHeader?: boolean;
  includeSummary?: boolean;
}

// Add these interfaces near the top with other interfaces
interface ScheduleOptions {
  frequency: 'once' | 'daily' | 'weekly' | 'monthly';
  timezone: string;
  endDate?: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
}

// Add this constant near other constants
const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
];

// Constants
const chartTypeMap = {
  bar: Bar,
  line: Line,
  pie: Pie,
  scatter: Scatter,
  bubble: Bubble,
  radar: Radar,
  doughnut: Doughnut,
  polarArea: PolarArea,
};

const defaultQuery = `SELECT 
  FORMAT(SaleDate, 'yyyy-MM') AS Month,
  SUM(Quantity) AS TotalSold
FROM Sales
WHERE ProductID = 1
GROUP BY FORMAT(SaleDate, 'yyyy-MM')
ORDER BY Month;`;

const defaultColor = 'rgba(75,192,192,0.4)';
const defaultConnectionString = 'Server=.;Database=TestAIDatabase;User Id=sa;Password=Alpha-13;TrustServerCertificate=True;';
const defaultAiPrompt = 'Generate a SQL query to show monthly sales data';

// Color utilities
const generateStableColors = (count: number) => {
  const colors = [
    '#2196F3', // Blue
    '#4CAF50', // Green
    '#FFC107', // Amber
    '#F44336', // Red
    '#9C27B0', // Purple
    '#00BCD4', // Cyan
    '#FF9800', // Orange
    '#795548', // Brown
  ];
  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
};

// Add helper function to check if a value is numeric
const isNumeric = (value: any): boolean => {
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    return !isNaN(Number(value)) && !isNaN(parseFloat(value));
  }
  return false;
};

// Add helper function to categorize columns
const categorizeColumns = (data: any[], columns: string[]): { numeric: string[], nonNumeric: string[] } => {
  const numeric: string[] = [];
  const nonNumeric: string[] = [];

  columns.forEach(column => {
    // Check first 10 rows to determine column type
    const sampleSize = Math.min(10, data.length);
    let isColumnNumeric = true;

    for (let i = 0; i < sampleSize; i++) {
      if (!isNumeric(data[i][column])) {
        isColumnNumeric = false;
        break;
      }
    }

    if (isColumnNumeric) {
      numeric.push(column);
    } else {
      nonNumeric.push(column);
    }
  });

  return { numeric, nonNumeric };
};

// Add helper function for statistics
const calculateStatistics = (data: number[]): { 
  mean: number; 
  median: number; 
  min: number; 
  max: number; 
  stdDev: number;
} => {
  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const stdDev = Math.sqrt(
    data.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / data.length
  );
  return { mean, median, min, max, stdDev };
};

// Add Statistics Panel component
const StatisticsPanel = React.memo(({ data, columns }: { data: any[]; columns: string[] }) => {
  const theme = useTheme();
  const { numeric } = useMemo(() => categorizeColumns(data, columns), [data, columns]);

  const stats = useMemo(() => {
    const result: Record<string, any> = {};
    numeric.forEach(col => {
      const values = data.map(row => Number(row[col]));
      result[col] = calculateStatistics(values);
    });
    return result;
  }, [data, numeric]);

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: theme.palette.background.paper, borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Statistics
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Metric</TableCell>
              {numeric.map(col => (
                <TableCell key={col} align="right">{col}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Mean</TableCell>
              {numeric.map(col => (
                <TableCell key={col} align="right">
                  {stats[col].mean.toFixed(2)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Median</TableCell>
              {numeric.map(col => (
                <TableCell key={col} align="right">
                  {stats[col].median.toFixed(2)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Min</TableCell>
              {numeric.map(col => (
                <TableCell key={col} align="right">
                  {stats[col].min.toFixed(2)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Max</TableCell>
              {numeric.map(col => (
                <TableCell key={col} align="right">
                  {stats[col].max.toFixed(2)}
                </TableCell>
              ))}
            </TableRow>
            <TableRow>
              <TableCell>Std Dev</TableCell>
              {numeric.map(col => (
                <TableCell key={col} align="right">
                  {stats[col].stdDev.toFixed(2)}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
});

// Components
const ChartHeader = React.memo(({ 
  title, 
  onTitleChange, 
  onRemove, 
  onAdvancedToggle 
}: { 
  title: string;
  onTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onAdvancedToggle: () => void;
}) => {
  const theme = useTheme();
  
  return (
    <CardHeader
      avatar={
        <IconButton className="chart-widget-header" size="small" sx={{ cursor: 'grab' }}>
          <DragIndicatorIcon />
        </IconButton>
      }
      action={
        <Stack direction="row" spacing={1}>
          <Tooltip title="Advanced Settings">
            <IconButton onClick={onAdvancedToggle} size="small" sx={{ 
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}>
              <PaletteIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove Chart">
            <IconButton onClick={onRemove} size="small" sx={{ 
              bgcolor: theme.palette.error.main,
              color: theme.palette.error.contrastText,
              '&:hover': {
                bgcolor: theme.palette.error.dark,
              }
            }}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      }
      title={
        <TextField
          label="Chart Title"
          value={title}
          onChange={onTitleChange}
          size="small"
          fullWidth
          variant="standard"
          sx={{ 
            '& .MuiInputBase-input': { 
              fontSize: '1.25rem', 
              fontWeight: 500 
            },
            '& .MuiInput-underline:before': {
              borderBottomColor: theme.palette.primary.main,
            }
          }}
        />
      }
      sx={{
        bgcolor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        borderBottom: `2px solid ${theme.palette.primary.dark}`,
        '& .MuiCardHeader-title': {
          color: theme.palette.primary.contrastText,
        }
      }}
    />
  );
});

// Update helper function to determine which chart types need which selections
const getChartTypeRequirements = (chartType: string): { 
  needsXAxis: boolean; 
  needsYAxis: boolean; 
  needsSize: boolean;
} => {
  switch (chartType) {
    case 'bar':
    case 'line':
      return { needsXAxis: true, needsYAxis: true, needsSize: false };
    case 'scatter':
      return { needsXAxis: true, needsYAxis: true, needsSize: false };
    case 'bubble':
      return { needsXAxis: true, needsYAxis: true, needsSize: true };
    case 'radar':
      return { needsXAxis: false, needsYAxis: true, needsSize: false };
    case 'pie':
    case 'doughnut':
    case 'polarArea':
      return { needsXAxis: false, needsYAxis: false, needsSize: false };
    default:
      return { needsXAxis: false, needsYAxis: false, needsSize: false };
  }
};

// Update ColumnSelector component
const ColumnSelector = React.memo(({
  columns,
  selectedColumns,
  onColumnChange,
  disabled,
  data,
  chartType
}: {
  columns: string[];
  selectedColumns: ColumnSelection;
  onColumnChange: (selection: ColumnSelection) => void;
  disabled: boolean;
  data: any[];
  chartType: string;
}) => {
  const { numeric, nonNumeric } = useMemo(() => 
    categorizeColumns(data, columns),
    [data, columns]
  );

  const { needsXAxis, needsYAxis, needsSize } = getChartTypeRequirements(chartType);

  const handleXAxisChange = (column: string, checked: boolean) => {
    const newXAxis = checked
      ? [...selectedColumns.xAxis, column]
      : selectedColumns.xAxis.filter(col => col !== column);
    
    onColumnChange({
      ...selectedColumns,
      xAxis: newXAxis
    });
  };

  const handleYAxisChange = (column: string, checked: boolean) => {
    const newYAxis = checked
      ? [...selectedColumns.yAxis, column]
      : selectedColumns.yAxis.filter(col => col !== column);
    
    onColumnChange({
      ...selectedColumns,
      yAxis: newYAxis
    });
  };

  // If no axis selection is needed, don't render anything
  if (!needsXAxis && !needsYAxis && !needsSize) {
    return null;
  }

  const getColumnSelectionUI = () => {
    switch (chartType) {
      case 'scatter':
      case 'bubble':
  return (
          <>
            {needsXAxis && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  X-Axis (First Variable)
      </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {numeric.map((column) => (
                    <FormControlLabel
                      key={column}
                      control={
                        <Checkbox
                          checked={selectedColumns.xAxis.includes(column)}
                          onChange={(e) => handleXAxisChange(column, e.target.checked)}
                          disabled={disabled}
                        />
                      }
                      label={column}
                      sx={{ minWidth: '120px' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
            {needsYAxis && (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
                  Y-Axis (Second Variable)
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {numeric.map((column) => (
                    <FormControlLabel
                      key={column}
                      control={
                        <Checkbox
                          checked={selectedColumns.yAxis.includes(column)}
                          onChange={(e) => handleYAxisChange(column, e.target.checked)}
                          disabled={disabled}
                        />
                      }
                      label={column}
                      sx={{ minWidth: '120px' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
            {needsSize && chartType === 'bubble' && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Size (Third Variable)
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {numeric.map((column) => (
                    <FormControlLabel
                      key={column}
                      control={
                        <Checkbox
                          checked={selectedColumns.yAxis.includes(column)}
                          onChange={(e) => handleYAxisChange(column, e.target.checked)}
                          disabled={disabled}
                        />
                      }
                      label={column}
                      sx={{ minWidth: '120px' }}
                    />
                  ))}
                </Stack>
              </Box>
            )}
          </>
        );

      case 'radar':
        return needsYAxis ? (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Variables to Compare
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {numeric.map((column) => (
                <FormControlLabel
                  key={column}
                  control={
                    <Checkbox
                      checked={selectedColumns.yAxis.includes(column)}
                      onChange={(e) => handleYAxisChange(column, e.target.checked)}
                      disabled={disabled}
                    />
                  }
                  label={column}
                  sx={{ minWidth: '120px' }}
                />
              ))}
            </Stack>
          </Box>
        ) : null;

      default: // bar and line charts
        return (
          <>
            {needsXAxis && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  X-Axis (Categories)
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {nonNumeric.map((column) => (
              <FormControlLabel
                key={column}
                control={
                  <Checkbox
                    checked={selectedColumns.xAxis.includes(column)}
                    onChange={(e) => handleXAxisChange(column, e.target.checked)}
                    disabled={disabled}
                  />
                }
                label={column}
                sx={{ minWidth: '120px' }}
              />
            ))}
          </Stack>
        </Box>
            )}
            {needsYAxis && (
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
                  Y-Axis (Values)
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {numeric.map((column) => (
              <FormControlLabel
                key={column}
                control={
                  <Checkbox
                    checked={selectedColumns.yAxis.includes(column)}
                    onChange={(e) => handleYAxisChange(column, e.target.checked)}
                    disabled={disabled}
                  />
                }
                label={column}
                sx={{ minWidth: '120px' }}
              />
            ))}
          </Stack>
        </Box>
            )}
          </>
        );
    }
  };

  return (
    <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Column Selection
      </Typography>
      <Stack spacing={2}>
        {getColumnSelectionUI()}
      </Stack>
    </Box>
  );
});

ColumnSelector.displayName = 'ColumnSelector';

const ChartControls = React.memo(({
  type,
  onTypeChange,
  aiPrompt,
  onAIPromptChange,
  connections,
  selectedConnection,
  onConnectionChange,
  query,
  onQueryChange,
  onVisualizeAI,
  onVisualizeSQL,
  isLoading,
  parentLoading,
  chartData,
  data,
  columns,
  selectedColumns,
  onColumnChange
}: {
  type: string;
  onTypeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  aiPrompt: string;
  onAIPromptChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  connections: DatabaseConnection[];
  selectedConnection: DatabaseConnection | null;
  onConnectionChange: (connectionId: string) => void;
  query: string;
  onQueryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVisualizeAI: () => void;
  onVisualizeSQL: () => void;
  isLoading: boolean;
  parentLoading: boolean;
  chartData: any;
  data: any[];
  columns: string[];
  selectedColumns: ColumnSelection;
  onColumnChange: (selection: ColumnSelection) => void;
}) => {
  const theme = useTheme();
  const chartTypes = [
    { id: 'bar', label: 'Bar' },
    { id: 'line', label: 'Line' },
    { id: 'pie', label: 'Pie' },
    { id: 'scatter', label: 'Scatter' },
    { id: 'bubble', label: 'Bubble' },
    { id: 'radar', label: 'Radar' },
    { id: 'doughnut', label: 'Doughnut' },
    { id: 'polarArea', label: 'Polar Area' },
  ];

  return (
    <Stack spacing={2}>
      {/* 1. Database Connection */}
      <TextField
        select
        fullWidth
        label="Database Connection"
        value={selectedConnection?.databaseConnectionId?.toString() || ''}
        onChange={(e) => onConnectionChange(e.target.value)}
        size="small"
      >
        <MenuItem value="">
          <em>Select a connection</em>
        </MenuItem>
        {connections.map((connection) => (
          <MenuItem 
            key={connection.databaseConnectionId || connection.name} 
            value={connection.databaseConnectionId?.toString() || ''}
          >
            {connection.name} ({connection.databaseType})
          </MenuItem>
        ))}
      </TextField>

      {/* 2. AI Prompt with button */}
      <Box>
        <TextField
          fullWidth
          label="AI Prompt"
          value={aiPrompt}
          onChange={onAIPromptChange}
          multiline
          rows={2}
          placeholder="Enter your prompt for AI to generate SQL query..."
          InputProps={{
            startAdornment: <AutoAwesomeIcon sx={{ mr: 1, color: 'primary.main' }} />,
          }}
        />
        <Button 
          variant="contained" 
          onClick={onVisualizeAI} 
          disabled={parentLoading || isLoading || !aiPrompt || !selectedConnection}
          startIcon={<AutoAwesomeIcon />}
          fullWidth
          sx={{ mt: 1 }}
        >
          {(parentLoading || isLoading) ? <CircularProgress size={20} /> : 'Visualize with AI'}
        </Button>
      </Box>

      {/* 3. SQL Query with button */}
      <Box>
        <TextField
          label="SQL Query"
          value={query}
          onChange={onQueryChange}
          multiline
          rows={4}
          fullWidth
          InputProps={{
            startAdornment: <CodeIcon sx={{ mr: 1, color: 'primary.main' }} />,
          }}
        />
        <Button 
          variant="contained" 
          onClick={onVisualizeSQL} 
          disabled={parentLoading || isLoading || !query || !selectedConnection}
          startIcon={<CodeIcon />}
          color="secondary"
          fullWidth
          sx={{ mt: 1 }}
        >
          {(parentLoading || isLoading) ? <CircularProgress size={20} /> : 'Visualize with SQL'}
        </Button>
      </Box>

      {/* 4. Chart Type Selection */}
      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Chart Type
        </Typography>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {chartTypes.map((chartType) => (
          <Chip
              key={chartType.id}
              label={chartType.label}
              onClick={() => onTypeChange({ target: { value: chartType.id } } as any)}
              color={type === chartType.id ? 'primary' : 'default'}
              variant={type === chartType.id ? 'filled' : 'outlined'}
            sx={{ 
              cursor: 'pointer',
              '&:hover': {
                bgcolor: theme => alpha(theme.palette.primary.main, 0.1)
              }
            }}
          />
        ))}
      </Box>
      </Box>

      {/* 5. Column Selection - Only show for appropriate chart types */}
      {columns.length > 0 && getChartTypeRequirements(type).needsYAxis && (
        <ColumnSelector
          columns={columns}
          selectedColumns={selectedColumns}
          onColumnChange={onColumnChange}
          disabled={isLoading || parentLoading}
          data={data}
          chartType={type}
        />
      )}
    </Stack>
  );
});

// Add chart features configuration
const chartFeatures: ChartFeature[] = [
  {
    id: 'trendline',
    name: 'Trend Line',
    description: 'Add a trend line to show data direction',
    applicableTypes: ['line', 'scatter']
  },
  {
    id: 'movingAverage',
    name: 'Moving Average',
    description: 'Show moving average over time',
    applicableTypes: ['line', 'bar']
  },
  {
    id: 'annotations',
    name: 'Annotations',
    description: 'Add custom annotations to highlight important points',
    applicableTypes: ['line', 'bar', 'scatter']
  },
  {
    id: 'referenceLines',
    name: 'Reference Lines',
    description: 'Add reference lines (mean, median, etc.)',
    applicableTypes: ['line', 'bar', 'scatter']
  }
];

// Add helper function for trend line calculation
const calculateTrendLine = (data: number[]): { slope: number; intercept: number } => {
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = data;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, b, i) => a + b * y[i], 0);
  const sumXX = x.reduce((a, b) => a + b * b, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
};

// Add helper function for moving average
const calculateMovingAverage = (data: number[], windowSize: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const average = window.reduce((a, b) => a + b, 0) / window.length;
    result.push(average);
  }
  return result;
};

// Add interface for chart annotations
interface ChartAnnotation {
  type: 'point' | 'line' | 'box';
  xValue?: number;
  yValue?: number;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  label?: {
    content: string;
    enabled: boolean;
    position: 'top' | 'bottom' | 'left' | 'right';
  };
}

// Move this function definition to be right after the interfaces and before any components
const generatePreviewHtml = (
  chartRef: React.RefObject<HTMLCanvasElement>,
  exportOptions: ExportOptions,
  exportTitle: string,
  exportDescription: string,
  chartType: string,
  data: any[]
): string => {
  // Calculate statistics for numeric columns
  const calculateStats = (column: string) => {
    const values = data.map(row => row[column]).filter(v => !isNaN(v));
    if (values.length === 0) return null;
    
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      sum: sum
    };
  };

  // Calculate distribution for categorical columns
  const calculateDistribution = (column: string) => {
    const counts = data.reduce((acc, row) => {
      const value = row[column]?.toString() || 'N/A';
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([value, count]) => ({
        value,
        count: count as number,
        percentage: ((count as number) / data.length * 100).toFixed(1)
      }));
  };

  // Get column types
  const getColumnTypes = () => {
    if (!data.length) return {};
    return Object.entries(data[0]).reduce((acc, [key, value]) => {
      acc[key] = typeof value;
      return acc;
    }, {} as Record<string, string>);
  };

  const columnTypes = getColumnTypes();
  const numericColumns = Object.entries(columnTypes)
    .filter(([, type]) => type === 'number')
    .map(([name]) => name);
  const categoricalColumns = Object.entries(columnTypes)
    .filter(([, type]) => type === 'string')
    .map(([name]) => name);

  // Generate statistics HTML
  const statsHtml = `
    <div class="stats-section">
      <h3>Data Statistics</h3>
      ${numericColumns.map(col => {
        const stats = calculateStats(col);
        if (!stats) return '';
        return `
          <div class="stat-group">
            <h4>${col}</h4>
            <ul>
              <li>Count: ${stats.count}</li>
              <li>Min: ${stats.min.toFixed(2)}</li>
              <li>Max: ${stats.max.toFixed(2)}</li>
              <li>Average: ${stats.avg.toFixed(2)}</li>
              <li>Sum: ${stats.sum.toFixed(2)}</li>
            </ul>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Generate distribution HTML
  const distributionHtml = `
    <div class="distribution-section">
      <h3>Top Categories</h3>
      ${categoricalColumns.map(col => {
        const dist = calculateDistribution(col);
        return `
          <div class="dist-group">
            <h4>${col}</h4>
            <ul>
              ${dist.map(({ value, count, percentage }) => `
                <li>${value}: ${count} (${percentage}%)</li>
              `).join('')}
            </ul>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Generate metadata HTML
  const metadataHtml = `
    <div class="metadata-section">
      <h3>Report Metadata</h3>
      <ul>
        <li>Generated: ${new Date().toLocaleString()}</li>
        <li>Total Records: ${data.length}</li>
        <li>Chart Type: ${chartType}</li>
        <li>Data Source: ${exportOptions.dataSource || 'Not specified'}</li>
      </ul>
    </div>
  `;

  // Generate insights HTML
  const insightsHtml = `
    <div class="insights-section">
      <h3>Key Insights</h3>
      <ul>
        ${numericColumns.map(col => {
          const stats = calculateStats(col);
          if (!stats) return '';
          return `
            <li>${col} ranges from ${stats.min.toFixed(2)} to ${stats.max.toFixed(2)} with an average of ${stats.avg.toFixed(2)}</li>
          `;
        }).join('')}
        ${categoricalColumns.map(col => {
          const dist = calculateDistribution(col);
          if (dist.length > 0) {
            return `
              <li>${col} is dominated by "${dist[0].value}" (${dist[0].percentage}% of total)</li>
            `;
          }
          return '';
        }).join('')}
      </ul>
    </div>
  `;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>${exportTitle}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            ${exportOptions.showHeader ? '' : 'display: none;'}
          }
          .logo {
            max-width: 200px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .description {
            font-size: 14px;
            color: #666;
            margin-bottom: 20px;
          }
          .chart-container {
            margin: 20px 0;
            text-align: center;
          }
          .chart-image {
            max-width: 100%;
            height: auto;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
            ${exportOptions.showFooter ? '' : 'display: none;'}
          }
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 48px;
            color: rgba(0, 0, 0, 0.1);
            pointer-events: none;
            ${exportOptions.showWatermark ? '' : 'display: none;'}
          }
          .stats-section, .distribution-section, .metadata-section, .insights-section {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 5px;
          }
          .stat-group, .dist-group {
            margin: 10px 0;
            padding: 10px;
            background: white;
            border-radius: 3px;
          }
          h3 {
            color: #2c3e50;
            border-bottom: 2px solid #eee;
            padding-bottom: 5px;
          }
          h4 {
            color: #34495e;
            margin: 10px 0;
          }
          ul {
            list-style: none;
            padding-left: 0;
          }
          li {
            margin: 5px 0;
            padding: 3px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          ${exportOptions.logo ? `<img src="${exportOptions.logo}" alt="Logo" class="logo">` : ''}
          <div class="title">${exportTitle}</div>
          <div class="description">${exportDescription}</div>
        </div>
        
        <div class="chart-container">
          ${exportOptions.chartImage ? `<img src="${exportOptions.chartImage}" alt="Chart" class="chart-image">` : ''}
        </div>

        ${statsHtml}
        ${distributionHtml}
        ${insightsHtml}
        ${metadataHtml}
        
        <div class="footer">
          ${exportOptions.footerText || 'Generated by Insight Bridge'}
        </div>
        
        ${exportOptions.watermarkText ? `
          <div class="watermark">
            ${exportOptions.watermarkText}
          </div>
        ` : ''}
      </body>
    </html>
  `;
};

const ChartDisplay = React.memo(({
  chartData,
  chartType,
  isLoading,
  error,
  chartRef,
  onExport,
  data,
  columns
}: {
  chartData: any;
  chartType: string;
  isLoading: boolean;
  error: string | null;
  chartRef: React.RefObject<any>;
  onExport: (format: 'pdf' | 'excel', title: string, description: string, options: ExportOptions) => void;
  data: any[];
  columns: string[];
}) => {
  const theme = useTheme();
  const api = useApi();
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [annotationText, setAnnotationText] = useState('');
  const [annotationPoint, setAnnotationPoint] = useState<{ x: number; y: number } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportTitle, setExportTitle] = useState('');
  const [exportDescription, setExportDescription] = useState('');
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    title: 'Report',
    description: 'Generated report',
    quality: 'medium',
    pageSize: 'A4',
    orientation: 'portrait',
    includeMetadata: true,
    includePageNumbers: true,
    includeLogo: false,
    logoUrl: '',
    customHeader: '',
    customFooter: '',
    includeWatermark: false,
    watermarkText: '',
    dataSource: 'Insight Bridge',
    showHeader: true,
    showFooter: true,
    showWatermark: false,
    logo: '',
    footerText: 'Generated by Insight Bridge',
    sendViaEmail: false,
    recipientEmail: '',
    emailSubject: '',
    emailMessage: ''
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewMode, setPreviewMode] = useState<'pdf' | 'excel'>('pdf');
  const ChartComponent = chartTypeMap[chartType as keyof typeof chartTypeMap];
  const chartInstanceRef = useRef<any>(null);

  // Add chart instance reference
  const handleChartRef = (ref: any) => {
    if (ref) {
      chartInstanceRef.current = ref;
    }
  };

  // Add feature toggle handler
  const handleFeatureToggle = (featureId: string) => {
    setSelectedFeatures(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  // Chart options configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 20
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          boxWidth: 10,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: theme.palette.background.paper,
        titleColor: theme.palette.text.primary,
        bodyColor: theme.palette.text.secondary,
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        titleFont: {
          size: 14,
          weight: 'bold' as const
        },
        bodyFont: {
          size: 13
        }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      intersect: false,
      axis: 'x' as const
    }
  };

  const handleExportClick = (format: 'pdf' | 'excel') => {
    if (format === 'excel') {
      // Direct Excel export without dialog
      onExport(format, 'Data Export', 'Exported data', {
        ...exportOptions,
        format: 'excel',
        title: 'Data Export',
        description: 'Exported data'
      });
    } else {
      // Show dialog for PDF export
      setExportFormat(format);
      setPreviewMode(format);
      setExportDialogOpen(true);
    }
  };

  const handleExportConfirm = () => {
    if (chartInstanceRef.current) {
      const chartImage = chartInstanceRef.current.toBase64Image();
      onExport(exportFormat, exportTitle, exportDescription, {
        ...exportOptions,
        chartImage
      });
    }
    setExportDialogOpen(false);
    setExportTitle('');
    setExportDescription('');
  };

  return (
    <Box sx={{ 
      mt: 2,
      p: 2, 
      bgcolor: theme.palette.background.paper,
      borderRadius: 2,
      border: `2px solid ${theme.palette.divider}`,
      boxShadow: theme.shadows[2],
      flex: 1,
      minHeight: 300,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Feature Controls */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {chartFeatures
          .filter(feature => feature.applicableTypes.includes(chartType))
          .map(feature => (
            <Chip
              key={feature.id}
              label={feature.name}
              onClick={() => handleFeatureToggle(feature.id)}
              color={selectedFeatures.includes(feature.id) ? 'primary' : 'default'}
              variant={selectedFeatures.includes(feature.id) ? 'filled' : 'outlined'}
              sx={{ 
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: theme => alpha(theme.palette.primary.main, 0.1)
                }
              }}
            />
          ))}
      </Box>

      {isLoading && (
        <Box sx={{ 
          position: 'absolute', 
          inset: 0, 
          bgcolor: 'rgba(255,255,255,0.9)', 
          zIndex: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <CircularProgress size={40} thickness={4} />
        </Box>
      )}
      {error && (
        <Fade in={!!error}>
          <Alert 
            severity="error" 
            sx={{ 
              mb: 2,
              border: `1px solid ${theme.palette.error.main}`,
              '& .MuiAlert-icon': {
                color: theme.palette.error.main
              }
            }}
          >
            {error}
          </Alert>
        </Fade>
      )}
      {!isLoading && !chartData && !error && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center" 
          sx={{ 
            mt: 4,
            p: 4,
            bgcolor: theme.palette.background.default,
            borderRadius: 1,
            border: `1px dashed ${theme.palette.divider}`
          }}
        >
          No data to display. Enter a query and click Visualize.
        </Typography>
      )}
      {chartData && ChartComponent && !isLoading && (
        <Box sx={{ 
          width: '100%', 
          height: '100%',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }}>
          <Box sx={{ 
            flex: 1,
            p: 2,
            bgcolor: theme.palette.background.default,
            borderRadius: 1
          }}>
            {(() => {
              const chartOptions = {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                  padding: {
                    top: 20,
                    right: 20,
                    bottom: 20,
                    left: 20
                  }
                },
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom' as const,
                    labels: {
                      padding: 20,
                      usePointStyle: true,
                      boxWidth: 10,
                      font: {
                        size: 12
                      }
                    }
                  },
                  tooltip: {
                    backgroundColor: theme.palette.background.paper,
                    titleColor: theme.palette.text.primary,
                    bodyColor: theme.palette.text.secondary,
                    borderColor: theme.palette.divider,
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    titleFont: {
                      size: 14,
                      weight: 'bold' as const
                    },
                    bodyFont: {
                      size: 13
                    }
                  }
                },
                interaction: {
                  mode: 'nearest' as const,
                  intersect: false,
                  axis: 'x' as const
                }
              };

              return (
            <ChartComponent 
                  ref={handleChartRef}
              data={chartData} 
              options={chartOptions}
            />
              );
            })()}
          </Box>
          {data && columns && (
            <StatisticsPanel data={data} columns={columns} />
          )}
        </Box>
      )}
      {chartData && (
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            onClick={() => handleExportClick('pdf')} 
            size="small"
            fullWidth
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}
          >
            Export PDF
          </Button>
          {chartData.datasets && chartData.datasets.length > 0 && (
            <Button 
              variant="contained" 
              onClick={() => handleExportClick('excel')} 
              size="small"
              fullWidth
              sx={{
                bgcolor: theme.palette.secondary.main,
                '&:hover': {
                  bgcolor: theme.palette.secondary.dark,
                }
              }}
            >
              Export Excel
            </Button>
          )}
        </Stack>
      )}

      {/* Export Dialog - Only for PDF */}
      <Dialog 
        open={exportDialogOpen} 
        onClose={() => setExportDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: theme.shadows[8],
            bgcolor: theme.palette.background.paper,
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          borderBottom: `2px solid ${theme.palette.primary.dark}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Export {exportFormat.toUpperCase()}
          </Typography>
          <IconButton 
            onClick={() => setShowPreview(!showPreview)}
            sx={{ color: theme.palette.primary.contrastText }}
          >
            <VisibilityIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={showPreview ? 6 : 12}>
              <Stack spacing={3}>
                <TextField
                  label="Title"
                  value={exportTitle}
                  onChange={(e) => setExportTitle(e.target.value)}
                  fullWidth
                  required
                  placeholder="Enter a title for your export"
                />
                <TextField
                  label="Description"
                  value={exportDescription}
                  onChange={(e) => setExportDescription(e.target.value)}
                  fullWidth
                  multiline
                  rows={4}
                  placeholder="Describe what this chart shows and any important insights"
                />
                
                <Divider />
                
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Export Options
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Quality</InputLabel>
                      <Select
                        value={exportOptions.quality}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          quality: e.target.value as 'low' | 'medium' | 'high'
                        }))}
                        label="Quality"
                      >
                        <MenuItem value="low">Low</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Page Size</InputLabel>
                      <Select
                        value={exportOptions.pageSize}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          pageSize: e.target.value as 'A4' | 'Letter' | 'Legal'
                        }))}
                        label="Page Size"
                      >
                        <MenuItem value="A4">A4</MenuItem>
                        <MenuItem value="Letter">Letter</MenuItem>
                        <MenuItem value="Legal">Legal</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Orientation</InputLabel>
                      <Select
                        value={exportOptions.orientation}
                        onChange={(e) => setExportOptions(prev => ({
                          ...prev,
                          orientation: e.target.value as 'portrait' | 'landscape'
                        }))}
                        label="Orientation"
                      >
                        <MenuItem value="portrait">Portrait</MenuItem>
                        <MenuItem value="landscape">Landscape</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeMetadata}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeMetadata: e.target.checked
                      }))}
                    />
                  }
                  label="Include Chart Metadata"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includePageNumbers}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includePageNumbers: e.target.checked
                      }))}
                    />
                  }
                  label="Include Page Numbers"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeLogo}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeLogo: e.target.checked
                      }))}
                    />
                  }
                  label="Include Logo"
                />
                {exportOptions.includeLogo && (
                  <TextField
                    label="Logo URL"
                    value={exportOptions.logoUrl}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      logoUrl: e.target.value
                    }))}
                    fullWidth
                    placeholder="Enter logo URL"
                  />
                )}

                <TextField
                  label="Custom Header"
                  value={exportOptions.customHeader}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    customHeader: e.target.value
                  }))}
                  fullWidth
                  placeholder="Enter custom header text"
                />

                <TextField
                  label="Custom Footer"
                  value={exportOptions.customFooter}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    customFooter: e.target.value
                  }))}
                  fullWidth
                  placeholder="Enter custom footer text"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.includeWatermark}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeWatermark: e.target.checked
                      }))}
                    />
                  }
                  label="Include Watermark"
                />
                {exportOptions.includeWatermark && (
                  <TextField
                    label="Watermark Text"
                    value={exportOptions.watermarkText}
                    onChange={(e) => setExportOptions(prev => ({
                      ...prev,
                      watermarkText: e.target.value
                    }))}
                    fullWidth
                    placeholder="Enter watermark text"
                  />
                )}

                <TextField
                  label="Data Source"
                  value={exportOptions.dataSource}
                  onChange={(e) => setExportOptions(prev => ({
                    ...prev,
                    dataSource: e.target.value
                  }))}
                  fullWidth
                  placeholder="Enter data source"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.showHeader}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        showHeader: e.target.checked
                      }))}
                    />
                  }
                  label="Show Header"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.showFooter}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        showFooter: e.target.checked
                      }))}
                    />
                  }
                  label="Show Footer"
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.showWatermark}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        showWatermark: e.target.checked
                      }))}
                    />
                  }
                  label="Show Watermark"
                />

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Email Options
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.sendViaEmail}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        sendViaEmail: e.target.checked
                      }))}
                    />
                  }
                  label="Send via Email"
                />

                {exportOptions.sendViaEmail && (
                  <Stack spacing={2}>
                    <TextField
                      label="Recipient Email"
                      value={exportOptions.recipientEmail}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        recipientEmail: e.target.value
                      }))}
                      fullWidth
                      type="email"
                      required
                      placeholder="Enter recipient email address"
                    />

                    <TextField
                      label="Email Subject"
                      value={exportOptions.emailSubject}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        emailSubject: e.target.value
                      }))}
                      fullWidth
                      placeholder="Enter email subject"
                    />

                    <TextField
                      label="Email Message"
                      value={exportOptions.emailMessage}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        emailMessage: e.target.value
                      }))}
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Enter email message"
                    />
                  </Stack>
                )}

                {/* Excel-specific options */}
                {exportFormat === 'excel' && (
                  <>
                    <Divider />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Excel Options
                    </Typography>

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.includeChart}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includeChart: e.target.checked
                          }))}
                        />
                      }
                      label="Include Chart"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.includeDataTable}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includeDataTable: e.target.checked
                          }))}
                        />
                      }
                      label="Include Data Table"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.includeFormulas}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includeFormulas: e.target.checked
                          }))}
                        />
                      }
                      label="Include Formulas"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.includeFilters}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includeFilters: e.target.checked
                          }))}
                        />
                      }
                      label="Include Filters"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.includePivotTable}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includePivotTable: e.target.checked
                          }))}
                        />
                      }
                      label="Include Pivot Table"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.autoFitColumns}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            autoFitColumns: e.target.checked
                          }))}
                        />
                      }
                      label="Auto-fit Columns"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.freezeHeader}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            freezeHeader: e.target.checked
                          }))}
                        />
                      }
                      label="Freeze Header Row"
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={exportOptions.includeSummary}
                          onChange={(e) => setExportOptions(prev => ({
                            ...prev,
                            includeSummary: e.target.checked
                          }))}
                        />
                      }
                      label="Include Summary Sheet"
                    />

                    <TextField
                      label="Sheet Name"
                      value={exportOptions.sheetName}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        sheetName: e.target.value
                      }))}
                      fullWidth
                      placeholder="Enter sheet name"
                    />
                  </>
                )}

                {/* Email options */}
                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Email Options
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={exportOptions.sendViaEmail}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        sendViaEmail: e.target.checked
                      }))}
                    />
                  }
                  label="Send via Email"
                />

                {exportOptions.sendViaEmail && (
                  <Stack spacing={2}>
                    <TextField
                      label="Recipient Email"
                      value={exportOptions.recipientEmail}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        recipientEmail: e.target.value
                      }))}
                      fullWidth
                      type="email"
                      required
                      placeholder="Enter recipient email address"
                    />

                    <TextField
                      label="Email Subject"
                      value={exportOptions.emailSubject}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        emailSubject: e.target.value
                      }))}
                      fullWidth
                      placeholder="Enter email subject"
                    />

                    <TextField
                      label="Email Message"
                      value={exportOptions.emailMessage}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        emailMessage: e.target.value
                      }))}
                      fullWidth
                      multiline
                      rows={4}
                      placeholder="Enter email message"
                    />
                  </Stack>
                )}
              </Stack>
            </Grid>

            {showPreview && (
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 2, 
                    height: '100%',
                    overflow: 'auto',
                    bgcolor: '#f5f5f5'
                  }}
                >
                  <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
                    Preview
                  </Typography>
                  <div 
                    dangerouslySetInnerHTML={{ __html: generatePreviewHtml(chartRef, exportOptions, exportTitle, exportDescription, chartType, data) }}
                    style={{ 
                      transform: exportOptions.orientation === 'landscape' ? 'rotate(90deg)' : 'none',
                      transformOrigin: 'center',
                      width: exportOptions.orientation === 'landscape' ? '100vh' : '100%',
                      height: exportOptions.orientation === 'landscape' ? '100vw' : 'auto'
                    }}
                  />
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: theme.palette.background.default }}>
          <Button 
            onClick={() => setExportDialogOpen(false)}
            sx={{ 
              color: theme.palette.text.secondary,
              '&:hover': {
                bgcolor: alpha(theme.palette.text.secondary, 0.1)
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleExportConfirm}
            variant="contained"
            disabled={!exportTitle.trim()}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}
          >
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});

const ChartWidget = React.memo(({
  id,
  title,
  type,
  query: initialQuery,
  color,
  connectionString,
  aiPrompt,
  data: initialData,
  columns: initialColumns,
  seriesColors: initialSeriesColors,
  valueColumns: initialValueColumns,
  onChange,
  onRemove,
  onVisualize,
  loading: parentLoading
}: {
  id: string;
  title: string;
  type: string;
  query: string;
  color: string;
  connectionString: string;
  aiPrompt: string;
  data?: any[];
  columns?: string[];
  seriesColors?: string[];
  valueColumns?: string[];
  onChange: (changes: Partial<ChartConfig>) => void;
  onRemove: () => void;
  onVisualize: (chartId: string) => void;
  loading: boolean;
}) => {
  const theme = useTheme();
  const [data, setData] = useState<any[]>(initialData || []);
  const [columns, setColumns] = useState<string[]>(initialColumns || []);
  const [valueColumns, setValueColumns] = useState<string[]>(initialValueColumns || []);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [localQuery, setLocalQuery] = useState(initialQuery);
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSeriesColors, setLocalSeriesColors] = useState<string[]>(initialSeriesColors || []);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const api = useApi();
  const chartRef = useRef<any>(null);
  const [selectedColumns, setSelectedColumns] = useState<ColumnSelection>({
    xAxis: [],
    yAxis: []
  });

  // Memoize handlers
  const handleConnectionChange = useCallback((connectionId: string) => {
    const connection = connections.find(c => c.databaseConnectionId?.toString() === connectionId);
    setSelectedConnection(connection || null);
    onChange({ connectionString: connectionId });
  }, [connections, onChange]);

  const handleColorChange = useCallback((idx: number, newColor: string) => {
    const newColors = [...localSeriesColors];
    newColors[idx] = newColor;
    setLocalSeriesColors(newColors);
    onChange({ seriesColors: newColors });
  }, [localSeriesColors, onChange]);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setLocalQuery(newQuery);
    onChange({ query: newQuery });
  }, [onChange]);

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ title: e.target.value });
  }, [onChange]);

  const handleTypeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ type: e.target.value });
  }, [onChange]);

  const handleAIPromptChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ aiPrompt: e.target.value });
  }, [onChange]);

  // Memoize chart data
  const chartData = useMemo(() => {
    if (!data || !columns || columns.length < 2) return null;

    const { numeric, nonNumeric } = categorizeColumns(data, columns);

    switch (type) {
      case 'pie':
      case 'doughnut':
      case 'polarArea':
        // For circular charts, use first non-numeric column for labels and first numeric column for values
      const labelColumn = nonNumeric[0] || columns[0];
      const valueColumn = numeric[0] || columns[1];
      
      return {
          labels: data.map((row: any) => row[labelColumn]),
          datasets: [{
            label: valueColumn,
            data: data.map((row: any) => row[valueColumn]),
            backgroundColor: data.map((_, idx) => localSeriesColors[idx] || generateStableColors(data.length)[idx]),
            borderColor: data.map((_, idx) => localSeriesColors[idx] || generateStableColors(data.length)[idx]),
            borderWidth: 1,
          }],
        };

      case 'scatter':
      case 'bubble':
        // For scatter/bubble plots, use first two numeric columns for x and y
        const xColumn = numeric[0] || columns[0];
        const yColumn = numeric[1] || columns[1];
        const sizeColumn = type === 'bubble' ? (numeric[2] || columns[2]) : undefined;
        
        return {
          datasets: [{
            label: `${yColumn} vs ${xColumn}`,
            data: data.map((row: any) => ({
              x: row[xColumn],
              y: row[yColumn],
              r: sizeColumn ? row[sizeColumn] : 5, // radius for bubble chart
            })),
            backgroundColor: localSeriesColors[0] || generateStableColors(1)[0],
          }],
        };

      case 'radar':
        // For radar charts, use first non-numeric column for labels and multiple numeric columns for values
        const radarLabels = data.map((row: any) => row[nonNumeric[0] || columns[0]]);
        const radarDatasets = numeric.map((col, idx) => ({
          label: col,
          data: data.map((row: any) => row[col]),
          backgroundColor: alpha(localSeriesColors[idx] || generateStableColors(numeric.length)[idx], 0.2),
          borderColor: localSeriesColors[idx] || generateStableColors(numeric.length)[idx],
          borderWidth: 1,
        }));

        return {
          labels: radarLabels,
          datasets: radarDatasets,
        };

      default:
      // For bar/line charts, create a series for each combination of X and Y columns
      const xColumns = selectedColumns.xAxis.length > 0 ? selectedColumns.xAxis : [nonNumeric[0] || columns[0]];
      const yColumns = selectedColumns.yAxis.length > 0 ? selectedColumns.yAxis : [numeric[0] || columns[1]];
      
      const datasets = [];
      let colorIndex = 0;

      for (const yColumn of yColumns) {
        for (const xColumn of xColumns) {
          const dataPoints = data.map((row: any) => ({
            x: row[xColumn],
            y: row[yColumn]
          }));

          datasets.push({
            label: `${yColumn} vs ${xColumn}`,
            data: dataPoints,
            backgroundColor: data.map((_, idx) => localSeriesColors[idx] || generateStableColors(data.length)[idx]),
            borderColor: data.map((_, idx) => localSeriesColors[idx] || generateStableColors(data.length)[idx]),
            borderWidth: 1,
          });
          colorIndex++;
        }
      }

      return {
        datasets,
      };
    }
  }, [data, columns, type, selectedColumns, localSeriesColors]);

  // Load connections
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await api.get<DatabaseConnection[]>('/api/UserPermission/my-connections');
        setConnections(response.data);
        if (connectionString) {
          const connection = response.data.find(c => c.databaseConnectionId?.toString() === connectionString);
          if (connection) {
            setSelectedConnection(connection);
          }
        }
      } catch (err) {
        console.error('Error loading connections:', err);
      }
    };
    loadConnections();
  }, [api, connectionString]);

  // Update local state when props change
  useEffect(() => {
    if (initialData) setData(initialData);
    if (initialColumns) setColumns(initialColumns);
    if (initialValueColumns) setValueColumns(initialValueColumns);
    if (initialSeriesColors) setLocalSeriesColors(initialSeriesColors);
  }, [initialData, initialColumns, initialValueColumns, initialSeriesColors]);

  // Update when new data is loaded
  useEffect(() => {
    if (columns && columns.length > 0 && data && data.length > 0) {
      const { numeric, nonNumeric } = categorizeColumns(data, columns);
      
      if (type === 'pie') {
        // For pie charts, don't set any selected columns
        setSelectedColumns({
          xAxis: [],
          yAxis: []
        });
      } else {
        // For other charts, set default selections
        setSelectedColumns({
          xAxis: nonNumeric.length > 0 ? [nonNumeric[0]] : [],
          yAxis: numeric.length > 0 ? [numeric[0]] : []
        });
      }
    }
  }, [columns, data, type]);

  const handleVisualizeWithAI = useCallback(async () => {
    if (!aiPrompt || !selectedConnection) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/visualization/visualize', {
        query: '',
        databaseConnectionId: selectedConnection?.databaseConnectionId ? parseInt(selectedConnection.databaseConnectionId.toString()) : undefined,
        aiPrompt: aiPrompt,
      });

      const updates: Partial<ChartConfig> = {
        data: res.data.data,
        columns: res.data.columns,
        query: res.data.generatedQuery || localQuery,
      };

      if (res.data.columns.length > 2 && (type === 'bar' || type === 'line')) {
        updates.valueColumns = res.data.columns.slice(1);
        updates.seriesColors = generateStableColors(res.data.columns.length - 1);
      } else if (type === 'pie' && res.data.data && res.data.columns.length >= 2) {
        updates.valueColumns = [res.data.columns[1]];
        updates.seriesColors = generateStableColors(res.data.data.length);
      } else {
        updates.valueColumns = res.data.columns.length > 1 ? [res.data.columns[1]] : [];
        updates.seriesColors = generateStableColors(1);
      }

      if (res.data.chartTypes && res.data.chartTypes.length > 0) {
        updates.type = res.data.chartTypes[0];
      }

      onChange(updates);

      setData(res.data.data);
      setColumns(res.data.columns);
      setLocalQuery(res.data.generatedQuery || localQuery);
      setValueColumns(updates.valueColumns || []);
      setLocalSeriesColors(updates.seriesColors || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred';
      setError(errorMessage);
      console.error('Error visualizing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [aiPrompt, selectedConnection, type, localQuery, onChange]);

  const handleVisualizeWithSQL = useCallback(async () => {
    if (!localQuery || !selectedConnection) {
      setError('Please enter a SQL query and select a database connection');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/visualization/visualize', {
        query: localQuery,
        databaseConnectionId: selectedConnection?.databaseConnectionId ? parseInt(selectedConnection.databaseConnectionId.toString()) : undefined,
        aiPrompt: '',
      });

      if (!res.data || !res.data.data) {
        throw new Error('Invalid response from server');
      }

      const updates: Partial<ChartConfig> = {
        data: res.data.data,
        columns: res.data.columns,
        type: type,
      };

      if (res.data.columns.length > 2 && (type === 'bar' || type === 'line')) {
        updates.valueColumns = res.data.columns.slice(1);
        updates.seriesColors = generateStableColors(res.data.columns.length - 1);
      } else if (type === 'pie' && res.data.data && res.data.columns.length >= 2) {
        updates.valueColumns = [res.data.columns[1]];
        updates.seriesColors = generateStableColors(res.data.data.length);
      } else {
        updates.valueColumns = res.data.columns.length > 1 ? [res.data.columns[1]] : [];
        updates.seriesColors = generateStableColors(1);
      }

      if (res.data.chartTypes?.[0] && res.data.chartTypes[0] !== type) {
        updates.type = res.data.chartTypes[0];
      }

      onChange(updates);

      setData(res.data.data);
      setColumns(res.data.columns);
      setValueColumns(updates.valueColumns || []);
      setLocalSeriesColors(updates.seriesColors || []);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'An error occurred while visualizing the data';
      setError(errorMessage);
      console.error('Error visualizing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [localQuery, selectedConnection, type, onChange]);

  const handleExport = async (
    format: 'pdf' | 'excel', 
    exportTitle: string, 
    exportDescription: string,
    exportOptions: ExportOptions
  ) => {
    if (!data || !columns || data.length === 0 || columns.length === 0) {
      alert('Please visualize the chart before exporting.');
      return;
    }

    try {
    if (format === 'pdf') {
        const exportHtml = generatePreviewHtml(chartRef, exportOptions, exportTitle, exportDescription, type, data);
        
        if (exportOptions.sendViaEmail) {
          // Send via email
          const emailResponse = await api.post('/api/export/email', {
            Html: exportHtml,
            Options: {
              ...exportOptions,
              format: 'pdf',
              title: exportTitle,
              description: exportDescription
            },
            Email: {
              to: exportOptions.recipientEmail,
              subject: exportOptions.emailSubject || exportTitle,
              message: exportOptions.emailMessage
            }
          });
          
          if (emailResponse.data.success) {
            alert('Report has been sent via email!');
          } else {
            throw new Error(emailResponse.data.message || 'Failed to send email');
          }
    } else {
          // Download PDF
          const res = await api.post('/api/export/pdf', { 
            Html: exportHtml,
            Options: {
              ...exportOptions,
              format: 'pdf',
              title: exportTitle,
              description: exportDescription
            }
          }, { responseType: 'blob' });
          
          if (res.data instanceof Blob) {
            FileSaver.saveAs(res.data, `${exportTitle || 'report'}.pdf`);
          } else {
            throw new Error('Invalid response format from server');
          }
        }
      } else {
        // Excel export with enhanced options
      const excelData = data.map((row: any) => columns.map(col => row[col]));
        
        // Get chart image if available
        let chartImage = null;
        if (chartRef.current && chartRef.current.chartInstance) {
          chartImage = chartRef.current.chartInstance.toBase64Image();
        }

        // Prepare Excel options
        const excelOptions = {
          ...exportOptions,
          format: 'excel',
          title: exportTitle,
          description: exportDescription,
          // Data Formatting
          autoFitColumns: true,
          freezeHeader: true,
          includeFilters: true,
          numberFormats: columns.reduce((acc: any, col: string) => {
            // Determine number format based on column data
            const sampleValue = data[0][col];
            if (typeof sampleValue === 'number') {
              if (col.toLowerCase().includes('price') || col.toLowerCase().includes('cost')) {
                acc[col] = 'currency';
              } else if (col.toLowerCase().includes('percentage') || col.toLowerCase().includes('rate')) {
                acc[col] = 'percentage';
              } else {
                acc[col] = 'number';
              }
            }
            return acc;
          }, {}),
          cellStyles: {
            header: {
              fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } },
              font: { color: { argb: 'FFFFFFFF' }, bold: true },
              alignment: { horizontal: 'center' },
              border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
              }
            },
            data: {
              border: {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
              }
            }
          },
          // Additional Features
          includeSummary: true,
          includePivotTable: true,
          includeChart: true,
          chartImage: chartImage,
          dataValidation: columns.reduce((acc: any, col: string) => {
            // Add data validation based on column type
            const values = data.map(row => row[col]);
            const uniqueValues = Array.from(new Set(values));
            if (uniqueValues.length < 10) {
              acc[col] = {
                type: 'list',
                values: uniqueValues
              };
            }
            return acc;
          }, {}),
          formulas: {
            summary: {
              total: 'SUM',
              average: 'AVERAGE',
              min: 'MIN',
              max: 'MAX'
            }
          }
        };
        
        if (exportOptions.sendViaEmail) {
          // Send via email
          const emailResponse = await api.post('/api/export/email', {
            Data: excelData,
            Columns: columns,
            Options: excelOptions,
            Email: {
              to: exportOptions.recipientEmail,
              subject: exportOptions.emailSubject || exportTitle,
              message: exportOptions.emailMessage
            }
          });
          
          if (emailResponse.data.success) {
            alert('Report has been sent via email!');
          } else {
            throw new Error(emailResponse.data.message || 'Failed to send email');
          }
        } else {
          // Download Excel
          const res = await api.post('/api/export/excel', { 
            Columns: columns, 
            Data: excelData,
            Title: exportTitle,
            Description: exportDescription,
            Options: excelOptions
          }, { responseType: 'blob' });
          
          if (res.data instanceof Blob) {
            FileSaver.saveAs(res.data, `${exportTitle || 'report'}.xlsx`);
          } else {
            throw new Error('Invalid response format from server');
          }
        }
      }
    } catch (error: any) {
      console.error('Export error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to export. Please try again.';
      alert(`Export failed: ${errorMessage}`);
    }
  };

  return (
    <Card 
      elevation={3}
      sx={{
        height: '100%',
        minHeight: 1000,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'visible',
        transition: 'box-shadow 0.3s ease',
        '&:hover': {
          boxShadow: theme.shadows[8]
        },
      }}
    >
      <ChartHeader
        title={title}
        onTitleChange={handleTitleChange}
        onRemove={() => setConfirmRemove(true)}
        onAdvancedToggle={() => setShowAdvanced(true)}
      />

      <CardContent sx={{ 
        flex: 1, 
        p: 2, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 2,
        overflow: 'visible',
        position: 'relative'
      }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Left Column - Controls */}
          <Grid item xs={12} md={4} sx={{ 
            height: '100%',
            overflowY: 'auto',
            pr: 2,
            borderRight: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }}>
            <ChartControls
              type={type}
              onTypeChange={handleTypeChange}
              aiPrompt={aiPrompt}
              onAIPromptChange={handleAIPromptChange}
              connections={connections}
              selectedConnection={selectedConnection}
              onConnectionChange={handleConnectionChange}
              query={localQuery}
              onQueryChange={handleQueryChange}
              onVisualizeAI={handleVisualizeWithAI}
              onVisualizeSQL={handleVisualizeWithSQL}
              isLoading={isLoading}
              parentLoading={parentLoading}
              chartData={chartData}
              data={data}
              columns={columns}
              selectedColumns={selectedColumns}
              onColumnChange={setSelectedColumns}
            />
          </Grid>

          {/* Right Column - Chart */}
          <Grid item xs={12} md={8} sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <ChartDisplay
              chartData={chartData}
              chartType={type}
              isLoading={isLoading}
              error={error}
              chartRef={chartRef}
              onExport={handleExport}
              data={data}
              columns={columns}
            />
          </Grid>
        </Grid>

        {/* Color Customization Modal */}
        <Dialog 
          open={showAdvanced} 
          onClose={() => setShowAdvanced(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 2,
              boxShadow: theme.shadows[8],
              bgcolor: theme.palette.background.paper,
            }
          }}
        >
          <DialogTitle sx={{ 
            bgcolor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            borderBottom: `2px solid ${theme.palette.primary.dark}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Customize Colors
              </Typography>
          </DialogTitle>
          <DialogContent sx={{ p: 3 }}>
              {data && columns.length >= 2 && (
                <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: 2,
                maxHeight: '60vh',
                  overflowY: 'auto',
                p: 1,
                bgcolor: theme.palette.background.default,
                borderRadius: 1
                }}>
                  {data.map((row: any, idx: number) => {
                    const label = row[columns[0]];
                    const currentColor = localSeriesColors[idx] || generateStableColors(data.length)[idx];
                    
                    return (
                      <Box 
                        key={label} 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                        p: 2,
                          borderRadius: 1,
                        bgcolor: theme.palette.background.paper,
                        border: `1px solid ${theme.palette.divider}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: theme.shadows[2],
                          transform: 'translateY(-1px)'
                        }
                        }}
                      >
                        <Box 
                          sx={{ 
                          width: 40, 
                          height: 40, 
                            borderRadius: 1,
                            bgcolor: currentColor,
                          border: `2px solid ${theme.palette.divider}`,
                          boxShadow: `0 2px 4px ${alpha(currentColor, 0.3)}`,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            transform: 'scale(1.1)',
                            boxShadow: `0 4px 8px ${alpha(currentColor, 0.4)}`
                          }
                        }} 
                      />
                      <Typography variant="body1" sx={{ 
                        flex: 1,
                        fontWeight: 500,
                        color: theme.palette.text.primary
                      }}>
                        {label}
                      </Typography>
                        <TextField
                          type="color"
                          value={currentColor}
                          onChange={e => handleColorChange(idx, e.target.value)}
                          size="small"
                          sx={{ 
                          width: 70,
                            '& .MuiInputBase-input': {
                            p: 0.5,
                            cursor: 'pointer'
                          },
                          '& .MuiInputBase-root': {
                            borderRadius: 1,
                            border: `1px solid ${theme.palette.divider}`,
                            '&:hover': {
                              borderColor: theme.palette.primary.main
                            }
                            }
                          }}
                          InputLabelProps={{ shrink: true }}
                        />
                      </Box>
                    );
                  })}
                </Box>
              )}
          </DialogContent>
        </Dialog>

      <Dialog open={confirmRemove} onClose={() => setConfirmRemove(false)}>
        <DialogTitle>Remove Chart</DialogTitle>
        <DialogContent>
          Are you sure you want to remove this chart?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRemove(false)}>Cancel</Button>
          <Button onClick={onRemove} color="error">Remove</Button>
        </DialogActions>
      </Dialog>
      </CardContent>
    </Card>
  );
});

ChartWidget.displayName = 'ChartWidget';

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

// Add interface for export history item
interface ExportHistoryItem {
  Type: string;
  FileName: string;
  Timestamp: string;
}

const DashboardPage: React.FC = () => {
  const theme = useTheme();
  const [charts, setCharts] = useState<ChartConfig[]>(initialCharts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleDatabaseConnectionId, setScheduleDatabaseConnectionId] = useState(0);
  const [scheduleSqlQuery, setScheduleSqlQuery] = useState('');
  const [scheduleEmail, setScheduleEmail] = useState('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const api = useApi();
  const [scheduleOptions, setScheduleOptions] = useState<ScheduleOptions>({
    frequency: 'once',
    timezone: 'UTC',
  });
  const [scheduleEndDate, setScheduleEndDate] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  // Add state variables for history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [exportHistory, setExportHistory] = useState<ExportHistoryItem[]>([]);

  // Load connections
  useEffect(() => {
    const loadConnections = async () => {
      try {
        const response = await api.get<DatabaseConnection[]>('/api/UserPermission/my-connections');
        setConnections(response.data);
      } catch (err) {
        console.error('Error loading connections:', err);
        setError('Failed to load database connections');
      }
    };
    loadConnections();
  }, [api]);

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

  const handleVisualize = async (chartId: string) => {
    const chart = charts.find(c => c.id === chartId);
    if (!chart) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/api/visualization/visualize', {
        query: chart.query,
        databaseConnectionId: parseInt(chart.connectionString),
        aiPrompt: chart.aiPrompt,
      });

      handleChartChange(chartId, {
        data: res.data.data,
        columns: res.data.columns,
      });

      if (res.data.generatedQuery) {
        handleChartChange(chartId, { query: res.data.generatedQuery });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to visualize data');
      console.error('Error visualizing data:', err);
    } finally {
      setLoading(false);
    }
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

  const handleSchedule = () => {
    const chart = charts[0];
    setScheduleDatabaseConnectionId(parseInt(chart?.connectionString || '0'));
    setScheduleSqlQuery(chart?.query || '');
    setScheduleEmail('');
    setScheduleDateTime('');
    setScheduleDialogOpen(true);
  };

  const handleScheduleConfirm = async () => {
    setScheduleDialogOpen(false);
    if (!scheduleDatabaseConnectionId || !scheduleSqlQuery || !scheduleEmail || !scheduleDateTime) {
      alert('Please fill in all required fields.');
      return;
    }

    if (scheduleOptions.frequency === 'weekly' && selectedDays.length === 0) {
      alert('Please select at least one day of the week.');
      return;
    }

    try {
      const scheduleData = {
        databaseConnectionId: scheduleDatabaseConnectionId,
        sqlQuery: scheduleSqlQuery,
        format: exportFormat,
        scheduledTimeUtc: scheduleDateTime,
        email: scheduleEmail,
        frequency: scheduleOptions.frequency,
        timezone: scheduleOptions.timezone,
        endDate: scheduleEndDate || undefined,
        daysOfWeek: scheduleOptions.frequency === 'weekly' ? selectedDays : undefined,
        dayOfMonth: scheduleOptions.frequency === 'monthly' ? dayOfMonth : undefined
      };

      await api.post('/api/schedule/schedule', scheduleData);
      alert('Report scheduled successfully! You will receive an email at the scheduled time.');
    } catch (err: any) {
      alert('Failed to schedule report: ' + (err?.response?.data?.error || err.message));
    }
  };

  const handleHistory = async () => {
    setHistoryDialogOpen(true);
    try {
      const res = await api.get<ExportHistoryItem[]>('/api/export/history');
      setExportHistory(res.data);
    } catch (err) {
      console.error('Error fetching export history:', err);
      setError('Failed to load export history');
    }
  };

  const layout: Layout[] = charts.map(c => ({ ...c.layout, i: c.id }));

  return (
    <Box sx={{ 
      width: '100%',
      minHeight: '100vh',
      bgcolor: alpha(theme.palette.background.default, 0.8),
    }}>
      <Paper 
        elevation={4}
        sx={{ 
          p: 3, 
          borderRadius: 0, 
          mb: 4,
          background: `linear-gradient(45deg, ${alpha(theme.palette.primary.main, 0.05)} 30%, ${alpha(theme.palette.secondary.main, 0.05)} 90%)`,
        }}
      >
        <Stack 
          direction={{ xs: 'column', md: 'row' }} 
          alignItems={{ md: 'center' }} 
          justifyContent="space-between" 
          spacing={2}
        >
          <Box>
            <Typography variant="h4" sx={{ mb: 0.5, fontWeight: 600 }}>
              Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Visualize your data with customizable charts. Drag, resize, and edit widgets as needed.
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Schedule Report">
              <Button 
                variant="outlined" 
                color="secondary" 
                startIcon={<ScheduleIcon />} 
                onClick={handleSchedule} 
                disabled={loading}
              >
                Schedule
              </Button>
            </Tooltip>
            <Tooltip title="Save Dashboard">
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<SaveIcon />} 
                onClick={handleSaveDashboard} 
                disabled={loading}
              >
                Save
              </Button>
            </Tooltip>
            <Tooltip title="Load Dashboard">
              <Button 
                variant="outlined" 
                color="primary" 
                startIcon={<RestoreIcon />} 
                onClick={handleLoadDashboard} 
                disabled={loading}
              >
                Load
              </Button>
            </Tooltip>
            <Tooltip title="Reset Dashboard">
              <Button 
                variant="outlined" 
                color="secondary" 
                startIcon={<RefreshIcon />} 
                onClick={handleResetDashboard} 
                disabled={loading}
              >
                Reset
              </Button>
            </Tooltip>
            <Tooltip title="Add Chart">
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />} 
                onClick={handleAddChart} 
                disabled={loading}
              >
                Add Chart
              </Button>
            </Tooltip>
          </Stack>
        </Stack>
        {error && (
          <Fade in={!!error}>
            <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
          </Fade>
        )}
      </Paper>

      <Box sx={{ width: '100%', px: 0 }}>
        <GridLayout
          className="layout"
          layout={layout}
          cols={5}
          rowHeight={120}
          width={window.innerWidth}
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
                onVisualize={handleVisualize}
                loading={loading}
              />
            </div>
          ))}
        </GridLayout>
      </Box>

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

      <Dialog open={scheduleDialogOpen} onClose={() => setScheduleDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Schedule Report</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
          <TextField 
            select 
            label="Format" 
            value={exportFormat} 
            onChange={e => setExportFormat(e.target.value as 'pdf' | 'excel')} 
            fullWidth
          >
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="excel">Excel</MenuItem>
          </TextField>
            </Grid>

            <Grid item xs={12}>
          <TextField
                select
                label="Database Connection"
            value={scheduleDatabaseConnectionId}
            onChange={e => setScheduleDatabaseConnectionId(Number(e.target.value))}
            fullWidth
              >
                <MenuItem value="">
                  <em>Select a connection</em>
                </MenuItem>
                {(connections as DatabaseConnection[]).map((connection) => (
                  <MenuItem 
                    key={connection.databaseConnectionId || connection.name} 
                    value={connection.databaseConnectionId?.toString() || ''}
                  >
                    {connection.name} ({connection.databaseType})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12}>
          <TextField
            label="SQL Query"
            value={scheduleSqlQuery}
            onChange={e => setScheduleSqlQuery(e.target.value)}
            fullWidth
            multiline
            rows={2}
          />
            </Grid>

            <Grid item xs={12}>
          <TextField
            label="Recipient Email"
            value={scheduleEmail}
            onChange={e => setScheduleEmail(e.target.value)}
            fullWidth
            type="email"
          />
            </Grid>

            <Grid item xs={12} sm={6}>
          <TextField
                select
                label="Schedule Frequency"
                value={scheduleOptions.frequency}
                onChange={e => setScheduleOptions(prev => ({ ...prev, frequency: e.target.value as ScheduleOptions['frequency'] }))}
                fullWidth
              >
                <MenuItem value="once">Once</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                select
                label="Timezone"
                value={scheduleOptions.timezone}
                onChange={e => setScheduleOptions(prev => ({ ...prev, timezone: e.target.value }))}
                fullWidth
              >
                {timezones.map(tz => (
                  <MenuItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date & Time"
            type="datetime-local"
            value={scheduleDateTime}
            onChange={e => setScheduleDateTime(e.target.value)}
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
            </Grid>

            {scheduleOptions.frequency !== 'once' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  label="End Date"
                  type="date"
                  value={scheduleEndDate}
                  onChange={e => setScheduleEndDate(e.target.value)}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            )}

            {scheduleOptions.frequency === 'weekly' && (
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Days of Week</FormLabel>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                      <FormControlLabel
                        key={day}
                        control={
                          <Checkbox
                            checked={selectedDays.includes(index)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDays([...selectedDays, index]);
                              } else {
                                setSelectedDays(selectedDays.filter(d => d !== index));
                              }
                            }}
                          />
                        }
                        label={day}
                      />
                    ))}
                  </Box>
                </FormControl>
              </Grid>
            )}

            {scheduleOptions.frequency === 'monthly' && (
              <Grid item xs={12}>
                <TextField
                  select
                  label="Day of Month"
                  value={dayOfMonth}
                  onChange={e => setDayOfMonth(Number(e.target.value))}
                  fullWidth
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <MenuItem key={day} value={day}>
                      {day}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleScheduleConfirm} 
            variant="contained"
            disabled={!scheduleDatabaseConnectionId || !scheduleSqlQuery || !scheduleEmail || !scheduleDateTime || 
                     (scheduleOptions.frequency === 'weekly' && selectedDays.length === 0)}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Export History</DialogTitle>
        <DialogContent>
          {exportHistory.length === 0 ? (
            <Typography variant="body2">No export history yet.</Typography>
          ) : (
            <Box>
              {exportHistory.map((item: ExportHistoryItem, idx: number) => (
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
          <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardPage; 