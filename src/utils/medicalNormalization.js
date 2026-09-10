// Grouping maps for common lab tests
const PANELS = {
    VITALS: ['bmi', 'bp', 'blood pressure', 'heart rate', 'pulse', 'spo2', 'temperature', 'respiratory rate', 'height', 'weight'],
    LIPIDS: ['cholesterol', 'ldl', 'hdl', 'triglycerides', 'vldl', 'lipid profile'],
    METABOLIC: ['glucose', 'sugar', 'hba1c', 'a1c', 'fasting', 'ppbs', 'insulin'],
    CBC: ['hemoglobin', 'rbc', 'wbc', 'platelet', 'hematocrit', 'mcv', 'mch', 'mchc', 'eosinophils', 'lymphocytes', 'neutrophils', 'monocytes'],
    LIVER: ['sgot', 'ast', 'sgpt', 'alt', 'bilirubin', 'alp', 'albumin', 'protein'],
    KIDNEY: ['creatinine', 'urea', 'bun', 'uric acid', 'gfr'],
    THYROID: ['tsh', 't3', 't4', 'thyroid'],
};

export function categorizeTest(testName) {
    if (!testName) return 'OTHER';
    const lower = testName.toLowerCase();
    
    for (const [panel, keywords] of Object.entries(PANELS)) {
        if (keywords.some(k => lower.includes(k))) {
            return panel;
        }
    }
    return 'OTHER';
}

export function parseNumericValue(valueStr) {
    if (!valueStr) return null;
    
    // Handle blood pressure (e.g. 120/80)
    if (valueStr.includes('/')) {
        const parts = valueStr.split('/');
        const sys = parseFloat(parts[0]);
        const dia = parseFloat(parts[1]);
        if (!isNaN(sys) && !isNaN(dia)) return { type: 'bp', sys, dia, raw: valueStr };
    }

    // Extract first valid float from string
    const match = valueStr.match(/-?\d+(\.\d+)?/);
    if (match) {
        return { type: 'single', value: parseFloat(match[0]), raw: valueStr };
    }
    
    return { type: 'string', raw: valueStr };
}

export function parseReferenceRange(rangeStr) {
    if (!rangeStr) return null;
    
    // Handle "A - B" or "A to B"
    const rangeMatch = rangeStr.match(/(-?\d+(\.\d+)?)\s*(?:-|to)\s*(-?\d+(\.\d+)?)/i);
    if (rangeMatch) {
        return {
            min: parseFloat(rangeMatch[1]),
            max: parseFloat(rangeMatch[3])
        };
    }
    
    // Handle "< X" or "Up to X"
    const maxMatch = rangeStr.match(/(?:<|up to|less than)\s*(-?\d+(\.\d+)?)/i);
    if (maxMatch) {
        return {
            min: 0,
            max: parseFloat(maxMatch[1])
        };
    }

    // Handle "> X" or "More than X"
    const minMatch = rangeStr.match(/(?:>|more than|greater than)\s*(-?\d+(\.\d+)?)/i);
    if (minMatch) {
        return {
            min: parseFloat(minMatch[1]),
            max: Infinity
        };
    }

    return null;
}
