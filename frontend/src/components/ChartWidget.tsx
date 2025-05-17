import React, { useState, useEffect } from 'react';

interface ColumnSelection {
    xAxis: string[];
    yAxis: string[];
}

interface ChartWidgetProps {
    columns: string[];
    data: any[];
    type: string;
    // ... other existing props ...
}

const categorizeColumns = (data: any[], columns: string[]) => {
    const numeric: string[] = [];
    const nonNumeric: string[] = [];

    columns.forEach(column => {
        const sampleValue = data[0]?.[column];
        if (typeof sampleValue === 'number') {
            numeric.push(column);
        } else {
            nonNumeric.push(column);
        }
    });

    return { numeric, nonNumeric };
};

const ChartWidget: React.FC<ChartWidgetProps> = ({ 
    columns,
    data,
    type,
    // ... other existing props ...
}) => {
    // ... existing state ...
    const [xAxisField, setXAxisField] = useState<string>('');
    const [yAxisField, setYAxisField] = useState<string>('');
    const [selectedColumns, setSelectedColumns] = useState<ColumnSelection>({ xAxis: [], yAxis: [] });

    // ... existing code ...

    // Update when new data is loaded
    useEffect(() => {
        if (columns && columns.length > 0 && data && data.length > 0) {
            const { numeric, nonNumeric } = categorizeColumns(data, columns);
            
            if (type === 'pie' || type === 'doughnut' || type === 'polarArea') {
                // For circular charts, don't set any selected columns
                setSelectedColumns({
                    xAxis: [],
                    yAxis: []
                });
            } else if (type === 'scatter' || type === 'bubble') {
                // For scatter/bubble plots, use first two numeric columns
                setSelectedColumns({
                    xAxis: numeric.length > 0 ? [numeric[0]] : [],
                    yAxis: numeric.length > 1 ? [numeric[1]] : []
                });
            } else if (type === 'radar') {
                // For radar charts, use first non-numeric for labels and all numeric for values
                setSelectedColumns({
                    xAxis: nonNumeric.length > 0 ? [nonNumeric[0]] : [],
                    yAxis: numeric
                });
            } else {
                // For bar/line charts, allow any column for X-axis
                // Prefer non-numeric for X if available, but allow numeric
                const xAxisColumn = nonNumeric.length > 0 ? nonNumeric[0] : (numeric.length > 0 ? numeric[0] : '');
                const yAxisColumn = numeric.length > 0 ? numeric[0] : '';
                
                setSelectedColumns({
                    xAxis: xAxisColumn ? [xAxisColumn] : [],
                    yAxis: yAxisColumn ? [yAxisColumn] : []
                });
            }
        }
    }, [columns, data, type]);

    const handleColumnChange = (selection: ColumnSelection) => {
        // Ensure no column is selected in both X and Y axes
        const xAxis = selection.xAxis.filter(col => !selection.yAxis.includes(col));
        const yAxis = selection.yAxis.filter(col => !selection.xAxis.includes(col));
        
        setSelectedColumns({ xAxis, yAxis });
    };

    const handleXAxisChange = (field: string) => {
        setXAxisField(field);
        // If the same field was selected in Y-axis, clear it
        if (yAxisField === field) {
            setYAxisField('');
        }
    };

    const handleYAxisChange = (field: string) => {
        setYAxisField(field);
        // If the same field was selected in X-axis, clear it
        if (xAxisField === field) {
            setXAxisField('');
        }
    };

    // ... existing code ...

    return (
        <div className="chart-widget">
            {/* ... existing code ... */}
            
            <div className="chart-config">
                <div className="axis-selection">
                    <div className="axis-group">
                        <label>X-Axis:</label>
                        <select 
                            value={selectedColumns.xAxis[0] || ''} 
                            onChange={(e) => handleColumnChange({
                                xAxis: [e.target.value],
                                yAxis: selectedColumns.yAxis
                            })}
                        >
                            <option value="">Select X-Axis</option>
                            {columns.map((column: string) => (
                                <option 
                                    key={column} 
                                    value={column}
                                    disabled={selectedColumns.yAxis.includes(column)}
                                >
                                    {column}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="axis-group">
                        <label>Y-Axis:</label>
                        <select 
                            value={selectedColumns.yAxis[0] || ''} 
                            onChange={(e) => handleColumnChange({
                                xAxis: selectedColumns.xAxis,
                                yAxis: [e.target.value]
                            })}
                        >
                            <option value="">Select Y-Axis</option>
                            {columns.map((column: string) => (
                                <option 
                                    key={column} 
                                    value={column}
                                    disabled={selectedColumns.xAxis.includes(column)}
                                >
                                    {column}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {/* ... rest of the chart configuration ... */}
            </div>

            {/* ... rest of the component ... */}
        </div>
    );
};

export default ChartWidget; 