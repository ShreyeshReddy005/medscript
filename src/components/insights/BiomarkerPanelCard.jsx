import React from 'react';
import BiomarkerRangeBar from './BiomarkerRangeBar';
import TrendSparkline from './TrendSparkline';

export default function BiomarkerPanelCard({ title, icon: Icon, results, colorClass }) {
    if (!results || results.length === 0) return null;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${colorClass.bg}`}>
                    <Icon className={`w-5 h-5 ${colorClass.text}`} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">{title}</h3>
                    <p className="text-xs text-gray-500">{results.length} markers tracked</p>
                </div>
            </div>
            
            <div className="divide-y divide-gray-50">
                {results.map((item, idx) => {
                    const isAbnormal = item.current.is_abnormal || false;
                    
                    // Historical data points for sparkline (reverse so chronological)
                    const history = item.history ? [...item.history].reverse().map(h => ({ value: h.value })) : [];
                    
                    return (
                        <div key={idx} className="px-5 py-4">
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{item.test_name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">{item.current.reportName}</p>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <p className={`text-base font-bold ${isAbnormal ? 'text-red-600' : 'text-gray-900'}`}>
                                        {item.current.value} <span className="text-xs font-normal text-gray-500">{item.current.units}</span>
                                    </p>
                                    {item.delta !== null && (
                                        <p className={`text-[10px] font-bold mt-1 ${item.delta > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                            {item.delta > 0 ? '?' : '?'} {Math.abs(item.delta)} since last
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-end justify-between gap-4">
                                <div className="flex-1">
                                    <BiomarkerRangeBar 
                                        value={item.current.value} 
                                        referenceRange={item.current.reference_range} 
                                        isAbnormal={isAbnormal}
                                    />
                                </div>
                                {history.length > 1 && (
                                    <div className="flex-shrink-0">
                                        <TrendSparkline data={history} />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
