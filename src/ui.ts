function describePercentile(percentile: number, suffix: string): string {
    if (percentile == 100) {
        return `💎💎💎 Faster than all ${suffix}`;
    } else if (percentile == 50) {
        return `👍 Perfectly average among ${suffix}`;
    } else if (percentile == 0) {
        return `🥱🥱🥱 Slower than all ${suffix}`;
    } else if (percentile >= 90) {
        return `🐎🐎🐎 Faster than ${percentile}% of ${suffix}`;
    } else if (percentile <= 90 && percentile >= 80) {
        return `🐎🐎 Faster than ${percentile}% of ${suffix}`;
    } else if (percentile < 80 && percentile >= 70) {
        return `🐎 Faster than ${percentile}% of ${suffix}`;
    } else if (percentile < 70 && percentile >= 40) {
        return `👍 Faster than ${percentile}% of ${suffix}`;
    } else if (percentile < 40 && percentile >= 20) {
        return `🐌 Slower than ${100 - percentile}% of ${suffix}`;
    } else if (percentile <= 20 && percentile >= 10) {
        return `🐌 Slower than ${100 - percentile}% of ${suffix}`;
    } else {
        return `🐌🐌🐌 Slower than ${100 - percentile}% of ${suffix}`;
    }
}
