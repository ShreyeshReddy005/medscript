import React from 'react';
import { LineChart, Line, YAxis, ResponsiveContainer } from 'recharts';

export default function TrendSparkline({ data }) {
    if (!data || data.length < 2) return null;

    // Calculate delta to color the line
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const isUp = last > first;
    const isDown = last < first;
    
    // Default to gray, but can be customized later based on whether "up" is good or bad
    const strokeColor = "#3B82F6"; // Blue theme

    return (
        <div className="w-16 h-8">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <YAxis domain={['dataMin', 'dataMax']} hide />
                    <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke={strokeColor} 
                        strokeWidth={2} 
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
