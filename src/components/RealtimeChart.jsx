// Real-Time Chart Component using Recharts
// Displays analytics data with smooth animations and real-time updates

import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = [
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#6366f1', // indigo
  '#14b8a6', // teal
];

const RealtimeChart = ({ data, type = 'bar', title, dataKey, xAxisKey, yAxisKey }) => {
  // Handle empty data for both arrays and objects
  const isEmpty = type === 'heatmap'
    ? !data || Object.keys(data).length === 0
    : !data || data.length === 0;

  if (isEmpty) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <div className="text-center">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-500 font-medium">No data available yet</p>
          <p className="text-sm text-gray-400 mt-1">Generate some queries to see analytics</p>
        </div>
      </div>
    );
  }

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={xAxisKey}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey={dataKey}
              fill={COLORS[0]}
              radius={[8, 8, 0, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'line':
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={xAxisKey}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={COLORS[0]}
              strokeWidth={3}
              dot={{ fill: COLORS[0], r: 5 }}
              activeDot={{ r: 7 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          </LineChart>
        );

      case 'multi-bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey={xAxisKey}
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey="query_count"
              fill={COLORS[0]}
              radius={[8, 8, 0, 0]}
              animationDuration={800}
            />
            <Bar
              dataKey="unique_users"
              fill={COLORS[1]}
              radius={[8, 8, 0, 0]}
              animationDuration={800}
            />
          </BarChart>
        );

      case 'horizontal-bar':
        return (
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              stroke="#6b7280"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              type="category"
              dataKey={xAxisKey}
              stroke="#6b7280"
              style={{ fontSize: '11px' }}
              width={200}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar
              dataKey={dataKey}
              fill={COLORS[0]}
              radius={[0, 8, 8, 0]}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              innerRadius={40}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={xAxisKey}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
          </PieChart>
        );

      case 'heatmap':
        // Transform popularByYear object to heatmap grid
        // data format: { "1": [{query_text, total_count}, ...], "2": [...], ... }

        console.log('🔥 Heatmap data:', data);

        // Get all unique questions across all years
        const allQuestions = new Set();
        const years = Object.keys(data).sort((a, b) => parseInt(a) - parseInt(b)); years.forEach(year => {
          (data[year] || []).forEach(item => {
            const truncated = item.query_text?.substring(0, 30) || '';
            allQuestions.add(truncated);
          });
        });

        const questions = Array.from(allQuestions).slice(0, 5); // Top 5 questions

        // Build heatmap data
        const heatmapData = years.map(year => {
          const row = { year: `Năm ${year}` };
          const yearQuestions = data[year] || [];

          questions.forEach((q, qIdx) => {
            const found = yearQuestions.find(item => item.query_text?.substring(0, 30) === q);
            row[`q${qIdx}`] = found ? found.total_count : 0;
          });

          return row;
        });

        // Find max value for color scaling
        const maxValue = Math.max(...heatmapData.flatMap(row =>
          Object.values(row).filter(v => typeof v === 'number')
        ));

        // Color scale function (green gradient)
        const getColor = (value) => {
          if (value === 0) return '#f3f4f6'; // gray-100
          const intensity = Math.min(value / maxValue, 1);
          const greenValue = Math.round(16 + (185 - 16) * intensity); // 16 to 185
          return `rgb(${greenValue}, ${220 - greenValue * 0.3}, ${greenValue})`;
        };

        return (
          <div className="overflow-auto">
            <div className="min-w-[600px]">
              {/* Questions header */}
              <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: `120px repeat(${questions.length}, 1fr)` }}>
                <div className="font-semibold text-xs text-gray-600 p-2"></div>
                {questions.map((q, idx) => (
                  <div key={idx} className="font-semibold text-xs text-gray-700 p-2 text-center">
                    {q}...
                  </div>
                ))}
              </div>

              {/* Heatmap grid */}
              {heatmapData.map((row, rowIdx) => (
                <div key={rowIdx} className="grid gap-2 mb-2" style={{ gridTemplateColumns: `120px repeat(${questions.length}, 1fr)` }}>
                  <div className="font-semibold text-sm text-gray-700 p-2 flex items-center">
                    {row.year}
                  </div>
                  {questions.map((_, qIdx) => {
                    const value = row[`q${qIdx}`];
                    return (
                      <div
                        key={qIdx}
                        className="p-3 rounded-lg text-center font-bold text-sm transition-all hover:scale-105 cursor-pointer"
                        style={{
                          backgroundColor: getColor(value),
                          color: value > maxValue * 0.5 ? 'white' : '#374151'
                        }}
                        title={`${questions[qIdx]}: ${value} queries`}
                      >
                        {value > 0 ? value : '-'}
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Legend */}
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-600">
                <span>Ít</span>
                <div className="flex gap-1">
                  {[0, 0.25, 0.5, 0.75, 1].map((intensity, idx) => (
                    <div
                      key={idx}
                      className="w-8 h-4 rounded"
                      style={{ backgroundColor: getColor(maxValue * intensity) }}
                    ></div>
                  ))}
                </div>
                <span>Nhiều</span>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className="w-full" style={{ minHeight: '300px', height: '300px' }}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      <div style={{ width: '100%', height: title ? '250px' : '300px', minHeight: '250px', position: 'relative' }}>
        {type === 'heatmap' ? (
          renderChart()
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={250}>
            {renderChart()}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default RealtimeChart;
