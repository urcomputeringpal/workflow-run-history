import { GitHubScriptArguments } from "@urcomputeringpal/github-script-ts";
import { getWorkflowRuns } from "./src/workflowGroup";

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

export enum EnvInput {
    TARGET_SECONDS = "target-seconds",
}

export async function summarizeHistory(args: GitHubScriptArguments): Promise<void> {
    const { github, context, core } = args;
    if (github === undefined || context == undefined || core === undefined) {
        throw new Error("");
    }

    const defaultBranch = context.payload.repository?.default_branch ?? "main";

    const run = await github.rest.actions.getWorkflowRun({
        ...context.repo,
        run_id: context.runId,
    });
    const workflow_id = run.data.workflow_id;

    // TODO link to the workflow history
    // const workflowResponse = await github.rest.actions.getWorkflow({
    //     ...context.repo,
    //     workflow_id,
    // });

    getWorkflowRuns(workflow_id, { github, context, core }).then(groupedWorkflowRuns => {
        const totalRuns = Array.from(groupedWorkflowRuns.values()).reduce(
            (total, group) => total + group.runs.length,
            0
        );

        if (totalRuns > 0) {
            core.summary.addHeading(`History of ${totalRuns} runs over the last week`);

            // const table = Array.from(groupedWorkflowRuns.keys())
            //     .map(status => {
            //         return {
            //             status: status,
            //             percent: Math.ceil((groupedWorkflowRuns.get(status)!.runs.length / totalRuns) * 100),
            //         };
            //     })
            //     .sort((a, b) => b.percent - a.percent);
            // core.summary.addTable([
            //     [
            //         { data: "Status", header: true },
            //         { data: "Percent", header: true },
            //     ],
            //     ...table.map(row => [row.status, `${row.percent}%`]),
            // ]);

            const success = groupedWorkflowRuns.get("success");
            const failure = groupedWorkflowRuns.get("failure");

            // If we have both success and failures, report on the relative success
            if (success !== undefined && failure !== undefined && success.runs.length + failure.runs.length > 0) {
                core.summary.addHeading("Success Rate", 2);

                const successPR = success.ignoringRefsMatchingPrefixes([`refs/heads/${defaultBranch}`, "refs/tag"]);
                const successDefault = success.byRef(defaultBranch);
                const failurePR = failure.ignoringRefsMatchingPrefixes([`refs/heads/${defaultBranch}`, "refs/tag"]);
                const failureDefault = failure.byRef(defaultBranch);

                // TODO targets
                if (successDefault.runs.length + failureDefault.runs.length > 0) {
                    const defaultRate = Math.ceil(
                        (successDefault.runs.length / (successDefault.runs.length + failureDefault.runs.length)) * 100
                    );
                    core.summary.addHeading(`${defaultRate}% successful on ${defaultBranch}`, 3);
                }
                if (successPR.runs.length + failurePR.runs.length > 0) {
                    const prRate = Math.ceil(
                        (successPR.runs.length / (successPR.runs.length + failurePR.runs.length)) * 100
                    );
                    core.summary.addHeading(`${prRate}% successful on PRs`, 3);
                }
            } else if (success !== undefined && success.runs.length > 0) {
                core.summary.addHeading(`All ${success.runs.length} runs have completed successfully!`, 2);
                core.summary.addImage(
                    "https://github-production-user-asset-6210df.s3.amazonaws.com/47/239895139-7c91b1f5-7e0a-4123-86d7-6b92aa879de2.jpg",
                    "my codes are perfect"
                );
            } else if (failure !== undefined && failure.runs.length > 0) {
                core.summary.addHeading(`All ${failure.runs.length} runs have failed.`, 2);
            }

            core.summary.addSeparator();
            core.summary.addHeading("Performance", 2);

            const startedAt = new Date(run.data.run_started_at!);
            const now = new Date();
            const thisRunSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

            let targetSeconds: number | undefined = undefined;
            const target = process.env.TARGET_SECONDS ?? "60";

            if (target !== undefined) {
                targetSeconds = parseInt(target);
                if (thisRunSeconds < targetSeconds) {
                    core.summary.addHeading(`This run: ${thisRunSeconds}s elapsed (✅ target ${target}s)`, 3);
                } else {
                    core.summary.addHeading(`This run: ${thisRunSeconds}s elapsed (⚠️ target ${target}s)`, 3);
                }
            } else {
                core.summary.addHeading(`This run: ${thisRunSeconds}s elapsed`, 3);
                console.log(`Warning: no target-seconds value found`);
                core.summary.addRaw(
                    `> :warning: No target runtime configured. Add \`${EnvInput.TARGET_SECONDS}: <seconds>\` to the \`with\` arguments provided to \`urcomputeringpal/workflow-run-history\` in this workflow to set a target runtime.`
                );
            }

            if (success !== undefined && success.runs.length) {
                const successPR = success.ignoringRefsMatchingPrefixes([`refs/heads/${defaultBranch}`, "refs/tag"]);
                const successDefault = success.byRef(defaultBranch);
                core.summary
                    .addHeading(`Compared to ${success.runs.length} successful runs`, 4)
                    .addList(
                        [
                            successPR.runs.length > 0
                                ? [
                                      describePercentile(
                                          successPR.getPercentileForDuration(thisRunSeconds),
                                          "successful runs of this workflow on PRs"
                                      ),
                                  ]
                                : [],
                            successDefault.runs.length > 0
                                ? [
                                      describePercentile(
                                          successDefault.getPercentileForDuration(thisRunSeconds),
                                          `successful runs of this workflow on ${defaultBranch}`
                                      ),
                                  ]
                                : [],
                        ].flat()
                    )
                    .addTable([
                        [
                            { data: "Percentile", header: true },
                            { data: "Seconds", header: true },
                        ],
                        ["99th", `${success.getNthPercentileDuration(99)}`],
                        ["90th", `${success.getNthPercentileDuration(90)}`],
                        ["50th", `${success.getNthPercentileDuration(50)}`],
                        ["10th", `${success.getNthPercentileDuration(10)}`],
                        ["1st", `${success.getNthPercentileDuration(1)}`],
                    ]);
            }
            if (failure !== undefined && failure.runs.length > 0) {
                const failurePR = failure.ignoringRefsMatchingPrefixes([`refs/heads/${defaultBranch}`, "refs/tag"]);
                const failureDefault = failure.byRef(defaultBranch);
                core.summary
                    .addHeading(`Compared to ${failure.runs.length} failing runs`, 4)
                    .addList(
                        [
                            failurePR.runs.length > 0
                                ? [
                                      describePercentile(
                                          failurePR.getPercentileForDuration(thisRunSeconds),
                                          "failing runs of this workflow on PRs"
                                      ),
                                  ]
                                : [],
                            failureDefault.runs.length > 0
                                ? [
                                      describePercentile(
                                          failureDefault.getPercentileForDuration(thisRunSeconds),
                                          `failing runs of this workflow on ${defaultBranch}`
                                      ),
                                  ]
                                : [],
                        ].flat()
                    )
                    .addTable([
                        [
                            { data: "Percentile", header: true },
                            { data: "Seconds", header: true },
                        ],
                        ["99th", `${failure.getNthPercentileDuration(99)}`],
                        ["90th", `${failure.getNthPercentileDuration(90)}`],
                        ["50th", `${failure.getNthPercentileDuration(50)}`],
                        ["10th", `${failure.getNthPercentileDuration(10)}`],
                        ["1st", `${failure.getNthPercentileDuration(1)}`],
                    ]);
            }
        } else {
            core.summary.addHeading(`🎉 First run!`);
        }
        core.summary.write();
    });

    return;
}
