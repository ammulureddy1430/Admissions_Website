export const AnalyticsService = { average: (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 };
