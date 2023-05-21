import { GitHubScriptArguments } from "@urcomputeringpal/github-script-ts";
import { getWorkflowRuns } from "./src/workflowGroup";
import { fetchWorkflowYaml, configOption, ConfigOption } from "./src/workflowYaml";

export async function summarizeHistory(args: GitHubScriptArguments): Promise<void> {
    const { github, context, core } = args;
    if (github === undefined || context == undefined || core === undefined) {
        throw new Error("");
    }

    const run = await github.rest.actions.getWorkflowRun({
        ...context.repo,
        run_id: context.runId,
    });
    const workflow_id = run.data.workflow_id;

    const workflowYaml = await fetchWorkflowYaml(workflow_id.toString(), { github, context });

    getWorkflowRuns(workflow_id, { github, context, core }).then(groupedWorkflowRuns => {
        const totalRuns = Array.from(groupedWorkflowRuns.values()).reduce(
            (total, group) => total + group.runs.length,
            0
        );

        const startedAt = new Date(run.data.run_started_at!);
        const now = new Date();
        const thisRunSeconds = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

        let targetSeconds: number | undefined = undefined;
        if (workflowYaml !== undefined) {
            const target = configOption(ConfigOption.target, workflowYaml);

            if (target !== undefined) {
                const intTarget = parseInt(target);
                if (thisRunSeconds < intTarget) {
                    core.summary.addHeading(`✅ ${thisRunSeconds}s elapsed (target ${target}s)`, 2);
                } else {
                    core.summary.addHeading(`⚠️ ${thisRunSeconds}s elapsed (target ${target}s)`, 2);
                }
            } else {
                core.summary.addHeading(`${thisRunSeconds} elapsed`, 2);
                console.log(`Warning: no target runtime specified in workflow YAML: ${workflowYaml}`);
                core.summary.addRaw(
                    `> :warning: No target runtime specified in workflow YAML. Add \`${ConfigOption.target}: <seconds>\` to the \`env\` section to add a target.`
                );
            }
        }

        const success = groupedWorkflowRuns.get("success");
        const failure = groupedWorkflowRuns.get("failure");

        if (success !== undefined && failure !== undefined && success.runs.length + failure.runs.length > 0) {
            core.summary.addHeading(`Compared against ${totalRuns} over the last week`, 3);
            const successPR = success
                .ignoringRefsMatchingPrefixes([`refs/heads/${process.env.DEFAULT_BRANCH ?? "main"}`, "refs/tag"])
                .getPercentileForDuration(thisRunSeconds);
            const failurePR = failure
                .ignoringRefsMatchingPrefixes([`refs/heads/${process.env.DEFAULT_BRANCH ?? "main"}`, "refs/tag"])
                .getPercentileForDuration(thisRunSeconds);
            const successDefault = success
                .byRef(process.env.DEFAULT_BRANCH ?? "main")
                .getPercentileForDuration(thisRunSeconds);
            const failureDefault = failure
                .byRef(process.env.DEFAULT_BRANCH ?? "main")
                .getPercentileForDuration(thisRunSeconds);
            core.summary.addList(
                [
                    successPR > 0 ? [`Faster than ${successPR}% of successful runs for this workflow on PRs.`] : [],
                    failurePR > 0 ? [`Faster than ${failurePR}% of failing runs for this workflow on PRs.`] : [],
                    successDefault > 0
                        ? [`Faster than ${successDefault}% of successful runs for this workflow on the default branch.`]
                        : [],
                    failureDefault > 0
                        ? [`Faster than ${failureDefault}% of failing runs for this workflow on the default branch.`]
                        : [],
                ].flat()
            );

            core.summary.addHeading(
                `${Math.round((success.runs.length / (success.runs.length + failure.runs.length)) * 100)}% successful`
            );
        }
        if (success !== undefined && success.runs.length > 0) {
            core.summary.addHeading(`${success.runs.length} successful runs`).addTable([
                [
                    { data: "Percentile", header: true },
                    { data: "Success duration in seconds", header: true },
                ],
                ["99th", `${success.getNthPercentileDuration(99)}`],
                ["90th", `${success.getNthPercentileDuration(90)}`],
                ["50th", `${success.getNthPercentileDuration(50)}`],
                ["10th", `${success.getNthPercentileDuration(10)}`],
            ]);
        }
        if (failure !== undefined && failure.runs.length > 0) {
            core.summary.addHeading(`${failure.runs.length} failing runs`).addTable([
                [
                    { data: "Percentile", header: true },
                    { data: "Success duration in seconds", header: true },
                ],
                ["99th", `${failure.getNthPercentileDuration(99)}`],
                ["90th", `${failure.getNthPercentileDuration(90)}`],
                ["50th", `${failure.getNthPercentileDuration(50)}`],
                ["10th", `${failure.getNthPercentileDuration(10)}`],
            ]);
        }
        if (totalRuns > 0) {
            const table = Array.from(groupedWorkflowRuns.keys()).map(status => {
                return [status, `${Math.ceil((groupedWorkflowRuns.get(status)!.runs.length / totalRuns) * 100)}%`];
            });
            core.summary.addHeading("Status breakdown").addTable([
                [
                    { data: "Status", header: true },
                    { data: "Percent of total", header: true },
                ],
                ...table,
            ]);
        }
        core.summary.write();
    });

    return;
}
