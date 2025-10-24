
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../ui/Card';

interface PerformanceChartProps {
    data: any[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ data }) => {
    return (
        <Card>
            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">Training Completion Trends</h3>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                    <BarChart
                        data={data}
                        margin={{
                            top: 5,
                            right: 20,
                            left: -10,
                            bottom: 5,
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fill: '#a0aec0' }}/>
                        <YAxis tick={{ fill: '#a0aec0' }}/>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#2d3748',
                                border: 'none',
                                borderRadius: '0.5rem'
                            }}
                            labelStyle={{ color: '#e2e8f0' }}
                        />
                        <Legend />
                        <Bar dataKey="scheduled" fill="#4299e1" name="Scheduled" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completed" fill="#38b2ac" name="Completed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </Card>
    );
};

export default PerformanceChart;
