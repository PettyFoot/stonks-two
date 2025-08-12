'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PieChartData {
  name: string;
  value: number;
  percentage?: number;
  color: string;
}

interface PieChartProps {
  data: PieChartData[];
  title: string;
  height?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  innerRadius?: number;
  outerRadius?: number;
}

export default function CustomPieChart({ 
  data, 
  title, 
  height = 200,
  showLegend = false,
  showTooltip = true,
  innerRadius = 40,
  outerRadius = 80
}: PieChartProps) {
  const formatTooltipValue = (value: number, name: string) => {
    const item = data.find(d => d.name === name);
    const percentage = item?.percentage || ((value / data.reduce((sum, d) => sum + Math.abs(d.value), 0)) * 100);
    return [`$${Math.abs(value).toFixed(2)} (${percentage.toFixed(1)}%)`, name];
  };

  return (
    <Card className="bg-surface border-default">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium text-primary">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            {showTooltip && (
              <Tooltip 
                formatter={formatTooltipValue}
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  fontSize: '12px'
                }}
              />
            )}
            {showLegend && (
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}