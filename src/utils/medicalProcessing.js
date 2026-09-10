import { categorizeTest, parseNumericValue } from './medicalNormalization';

export function processLabReports(reports) {
    if (!reports || reports.length === 0) return {};

    // Sort reports chronologically (newest first)
    const sortedReports = [...reports].sort((a, b) => {
        const dateA = new Date(a.report_date || a.created_date);
        const dateB = new Date(b.report_date || b.created_date);
        return dateB - dateA; // descending
    });

    // Map test names to their historical values
    const testHistory = {};

    sortedReports.forEach(report => {
        if (!report.results) return;
        
        report.results.forEach(res => {
            const parsedVal = parseNumericValue(res.value);
            if (!parsedVal || parsedVal.type !== 'single') return; // We only chart numeric values

            const rawName = res.test_name;
            const category = categorizeTest(rawName);
            
            // Normalize the name slightly for grouping (e.g. "Fasting Blood Sugar" and "Fasting Sugar" map together if they are the same category)
            // For now, we group by exact lowercased name.
            const key = rawName.toLowerCase().trim();

            if (!testHistory[category]) {
                testHistory[category] = {};
            }

            if (!testHistory[category][key]) {
                testHistory[category][key] = {
                    test_name: rawName,
                    history: []
                };
            }

            testHistory[category][key].history.push({
                ...res,
                value: parsedVal.value, // use parsed float
                reportName: report.report_name || "Health Report",
                date: report.report_date || report.created_date
            });
        });
    });

    // Flatten into arrays and calculate deltas
    const panels = {};
    for (const [category, tests] of Object.entries(testHistory)) {
        panels[category] = Object.values(tests).map(test => {
            // History is newest first. 
            // current is history[0], previous is history[1]
            const current = test.history[0];
            let delta = null;
            
            if (test.history.length > 1) {
                const prev = test.history[1];
                delta = parseFloat((current.value - prev.value).toFixed(2));
            }

            return {
                test_name: test.test_name,
                current,
                history: test.history,
                delta
            };
        });
    }

    return panels;
}
