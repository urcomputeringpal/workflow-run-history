import { GitHubScriptArguments } from "@urcomputeringpal/github-script-ts";
import { getWorkflowRuns } from "./src/workflowGroup";
import { fetchWorkflowYaml, configOption, ConfigOption } from "./src/workflowYaml";

export async function summarizeHistory(args: GitHubScriptArguments): Promise<void> {
    const { github, context, core } = args;
    if (github === undefined || context == undefined || core === undefined) {
        throw new Error("");
    }

    core.summary.addHeading("History over the last week");

    let targetSeconds: number | undefined = undefined;

    const run = await github.rest.actions.getWorkflowRun({
        ...context.repo,
        run_id: context.runId,
    });
    const workflow_id = run.data.workflow_id;
    const workflowYaml = await fetchWorkflowYaml(workflow_id.toString(), { github, context });
    if (workflowYaml !== undefined) {
        const target = configOption(ConfigOption.target, workflowYaml);

        if (target !== undefined) {
            core.summary.addHeading(`Target runtime ${target}s`, 2);
            targetSeconds = parseInt(target);
        } else {
            console.log(`Warning: no target runtime specified in workflow YAML: ${workflowYaml}`);
            core.summary.addRaw(
                `> :warning: No target runtime specified in workflow YAML. Add \`${ConfigOption.target}: <seconds>\` to the \`env\` section to add a target.`
            );
        }
    }

    getWorkflowRuns(workflow_id, { github, context, core }).then(groupedWorkflowRuns => {
        const totalRuns = Array.from(groupedWorkflowRuns.values()).reduce(
            (total, group) => total + group.runs.length,
            0
        );
        core.summary.addHeading(`${totalRuns} total runs`, 2);

        const success = groupedWorkflowRuns.get("success");
        const failure = groupedWorkflowRuns.get("failure");

        // time in seconds since run
        const updatedAt = new Date(run.data.created_at);
        const now = new Date();
        const thisRunSeconds = Math.floor((now.getTime() - updatedAt.getTime()) / 1000);

        if (success !== undefined && failure !== undefined && success.runs.length + failure.runs.length > 0) {
            core.summary.addHeading(
                `Success rate: ${Math.round(
                    (success.runs.length / (success.runs.length + failure.runs.length)) * 100
                )}% (${success.runs.length} successes out of ${success.runs.length + failure.runs.length} runs)`
            );

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
            core.summary.addList([
                `Faster than ${successPR}% of successful runs for this workflow on PRs.`,
                `Faster than ${failurePR}% of failing runs for this workflow on PRs.`,
                `Faster than ${successDefault}% of successful runs for this workflow on the default branch.`,
                `Faster than ${failureDefault}% of failing runs for this workflow on the default branch.`,
            ]);
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
            ]);
        }
        if (totalRuns > 0) {
            const table = Array.from(groupedWorkflowRuns.keys()).map(status => {
                return [status, `${Math.ceil((groupedWorkflowRuns.get(status)!.runs.length / totalRuns) * 100)}%`];
            });
            core.summary.addHeading("Run status breakdown").addTable([
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
