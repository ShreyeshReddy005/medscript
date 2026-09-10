import React from 'react';
import { parseNumericValue, parseReferenceRange } from '../../utils/medicalNormalization';

export default function BiomarkerRangeBar({ value, referenceRange, isAbnormal }) {
    if (!value || !referenceRange) return null;

    const parsedVal = parseNumericValue(value);
    const parsedRange = parseReferenceRange(referenceRange);

    // If we can't parse it into a standard range, don't show the bar
    if (!parsedVal || parsedVal.type !== 'single' || !parsedRange) {
        return null;
    }

    const val = parsedVal.value;
    let min = parsedRange.min;
    let max = parsedRange.max;

    // Handle Infinity max (e.g. "> 50")
    if (max === Infinity) {
        max = min * 2; // Arbitrary visualization bound
    }
    
    // Prevent divide by zero
    if (min === max) {
        min = max - 1;
        max = max + 1;
    }

    // Calculate position percentage (0 to 100)
    // We add 20% padding on both sides to show out-of-bounds clearly
    const visualSpan = max - min;
    const padding = visualSpan * 0.2;
    const visualMin = min - padding;
    const visualMax = max + padding;
    
    let positionPct = ((val - visualMin) / (visualMax - visualMin)) * 100;
    // Clamp between 5% and 95% so the dot doesn't overflow visually
    positionPct = Math.max(5, Math.min(95, positionPct));

    const isLow = val < min;
    const isHigh = val > max;
    const isOut = isLow || isHigh || isAbnormal;

    // The visual "normal" range is bounded by where min and max land on our padded scale
    const normalStartPct = ((min - visualMin) / (visualMax - visualMin)) * 100;
    const normalEndPct = ((max - visualMin) / (visualMax - visualMin)) * 100;

    return (
        <div className="mt-2 w-full max-w-xs">
            <div className="relative h-2 bg-gray-100 rounded-full w-full">
                {/* Normal Range Indicator */}
                <div 
                    className="absolute h-full bg-green-200 rounded-full"
                    style={{ left: `${normalStartPct}%`, width: `${normalEndPct - normalStartPct}%` }}
                />
                
                {/* Patient Value Dot */}
                <div 
                    className={`absolute w-4 h-4 rounded-full -mt-1 shadow-sm border-2 border-white transition-all duration-500 z-10 ${
                        isOut ? (isHigh ? 'bg-red-500' : 'bg-orange-500') : 'bg-green-500'
                    }`}
                    style={{ left: `calc(${positionPct}% - 8px)` }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                <span>{min}</span>
                <span>{max === Infinity ? '' : max}</span>
            </div>
        </div>
    );
}
