export enum EnvInputName {
    TARGET_SECONDS = "target-seconds",
    TARGET_PERCENTILE = "target-percentile",

    TARGET_DEFAULT_SECONDS = "target-default-seconds",
    TARGET_DEFAULT_PERCENTILE = "target-default-percentile",
    TARGET_TAG_SECONDS = "target-tag-seconds",
    TARGET_TAG_PERCENTILE = "target-tag-percentile",

    TARGET_PR_PERCENTILE = "target-pr-percentile",
    TARGET_PR_SECONDS = "target-pr-seconds",
    TARGET_PR_FAILURE_PERCENTILE = "target-pr-failure-percentile",
    TARGET_PR_FAILURE_SECONDS = "target-pr-failure-seconds",

    TARGET_DEFAULT_SUCCESS_RATE = "target-default-success-rate",
    TARGET_TAG_SUCCESS_RATE = "target-tag-success-rate",
    TARGET_PR_SUCCESS_RATE = "target-pr-success-rate",
}

export enum EnvInputValue {
    targetSeconds = parseInt(process.env.TARGET_SECONDS ?? "60"),
    targetPercentile = parseInt(process.env.TARGET_PERCENTILE ?? "50"),

    targetDefaultSeconds = parseInt(process.env.TARGET_DEFAULT_SECONDS ?? `${targetSeconds}`),
    targetDefaultPercentile = parseInt(process.env.TARGET_DEFAULT_PERCENTILE ?? `${targetPercentile}`),
    targetTagSeconds = parseInt(process.env.TARGET_TAG_SECONDS ?? `${targetDefaultSeconds}`),
    targetTagPercentile = parseInt(process.env.TARGET_TAG_PERCENTILE ?? `${targetDefaultPercentile}`),

    targetPrPercentile = parseInt(process.env.TARGET_PR_PERCENTILE ?? `${targetPercentile}`),
    targetPrSeconds = parseInt(process.env.TARGET_PR_SECONDS ?? `${targetSeconds}`),
    targetPrFailurePercentile = parseInt(process.env.TARGET_PR_FAILURE_PERCENTILE ?? `${targetPrPercentile}`),
    targetPrFailureSeconds = parseInt(process.env.TARGET_PR_FAILURE_SECONDS ?? `${targetPrSeconds}`),

    targetDefaultSuccessRate = parseInt(process.env.TARGET_DEFAULT_SUCCESS_RATE ?? "99"),
    targetTagSuccessRate = parseInt(process.env.TARGET_TAG_SUCCESS_RATE ?? `${targetDefaultSuccessRate}`),
    targetPrSuccessRate = parseInt(process.env.TARGET_PR_SUCCESS_RATE ?? "90"),
}
