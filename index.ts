import { GitHubScriptArguments } from "@urcomputeringpal/github-script-ts";
import yaml from "js-yaml";

interface WorkflowRun {
    id: number;
    status: string;
    created_at: string;
    updated_at: string;
    durationSeconds: number;
    // Add other properties as needed
}

class WorkflowGroup {
    runs: WorkflowRun[];

    constructor(runs: WorkflowRun[]) {
        this.runs = runs;
    }

    getNthPercentileDuration = (percentile: number): number => {
        const durations = this.runs.map(run => run.durationSeconds);
        const sortedDurations = durations.sort((a, b) => b - a);
        const index = Math.floor((percentile / 100) * sortedDurations.length);
        return sortedDurations[index];
    };

    getPercentileForDuration = (durationSeconds: number): number => {
        const durations = this.runs.map(run => run.durationSeconds);
        const sortedDurations = durations.sort((a, b) => b - a);
        const index = sortedDurations.findIndex(value => value >= durationSeconds);
        const percentile = (index / sortedDurations.length) * 100;
        return Math.ceil(percentile);
    };
}

type GroupedWorkflowRuns = Map<string, WorkflowGroup>;

async function getWorkflowRuns(workflow_id: number, args: GitHubScriptArguments): Promise<GroupedWorkflowRuns> {
    const workflowRuns: WorkflowRun[] = [];
    const { github, context, core } = args;
    if (github === undefined || context == undefined || core === undefined) {
        throw new Error("need github, context, and core");
    }

    const now = new Date();
    // FIXME allow users to specify date range
    // get the date 1 month ago today
    const startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()).toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    // Create the `created` parameter for the API request
    const created = `${startDate}..${endDate}`;

    try {
        // FIXME also lookup default branch stats, make appropriate comparisons
        for await (const { data: responseWorkflowRuns } of github.paginate.iterator(
            github.rest.actions.listWorkflowRuns,
            {
                ...context.repo,
                workflow_id,
                created,
            }
        )) {
            for (const responseWorkflowRun of responseWorkflowRuns) {
                if (responseWorkflowRun.conclusion === undefined) {
                    continue;
                }
                const status = responseWorkflowRun.status as string;

                // ignore a few statuses that also don't count as "finished"
                if (["in_progress", "queued", "requested", "waiting", "pending"].includes(status)) {
                    continue;
                }
                const createdAt = new Date(responseWorkflowRun.created_at);
                const updatedAt = new Date(responseWorkflowRun.updated_at);
                const durationSeconds = Math.floor((updatedAt.getTime() - createdAt.getTime()) / 1000);

                const workflowRun: WorkflowRun = {
                    id: responseWorkflowRun.id,
                    status: status,
                    created_at: responseWorkflowRun.created_at,
                    updated_at: responseWorkflowRun.updated_at,
                    durationSeconds: durationSeconds,
                };
                if (responseWorkflowRun.conclusion !== null) {
                    workflowRun.status = responseWorkflowRun.conclusion;
                }
                workflowRuns.push(workflowRun);
            }
        }
    } catch (error) {
        core.error(`Error loading workflow runs: ${error}`);
    }

    const groupedRuns = new Map<string, WorkflowGroup>();
    workflowRuns.forEach(groupRun => {
        const status = groupRun.status;

        if (!groupedRuns.has(status)) {
            const runs: WorkflowRun[] = [];
            const group = new WorkflowGroup(runs);

            groupedRuns.set(status, group);
        }

        const group = groupedRuns.get(status);
        if (group) {
            group.runs.push(groupRun);
        }
    });

    return groupedRuns;
}

interface WorkflowYaml {
    name: string;
    env?: {
        [envName: string]: string | number;
    };
    on: {
        [eventName: string]: {
            [eventProperty: string]: string;
        };
    };
    jobs: {
        [jobName: string]: {
            name: string;
            runs_on: string;
            steps: string[];
        };
    };
}

enum ConfigOption {
    target = "workflow_target_seconds",
}

// fetch a ConfigOption value from the `env` section of the workflow YAML
function configOption(configOption: ConfigOption, workflowYaml: WorkflowYaml): string | undefined {
    if (workflowYaml.env !== undefined && workflowYaml.env[configOption] !== undefined) {
        return `${workflowYaml.env[configOption]}`;
    }
    return undefined;
}

async function fetchWorkflowYaml(workflow_id: string, args: GitHubScriptArguments): Promise<WorkflowYaml | undefined> {
    const { github, context } = args;
    if (github === undefined || context == undefined) {
        throw new Error("Error: need github and context");
    }
    try {
        // Get the workflow information
        const workflowResponse = await github.rest.actions.getWorkflow({
            ...context.repo,
            workflow_id,
        });

        if (workflowResponse.data.path) {
            // Get the raw workflow YAML content
            const yamlContent = await github.rest.repos.getContent({
                ...context.repo,
                path: workflowResponse.data.path,
                mediaType: {
                    format: "raw",
                },
                ref: context.ref,
            });
            if (typeof yamlContent.data === "string") {
                const parsedYaml = yaml.load(yamlContent.data);
                return parsedYaml as WorkflowYaml;
            } else {
                console.error(`Error: yamlContent.data is not a string: ${yamlContent.data}`);
            }
        }
    } catch (error) {
        console.error("Error:", error);
    }

    return undefined;
}

export async function summarizeHistory(args: GitHubScriptArguments): Promise<void> {
    const { github, context, core } = args;
    if (github === undefined || context == undefined || core === undefined) {
        throw new Error("");
    }

    core.summary.addHeading("History over the last month");

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

        if (success !== undefined && failure !== undefined && success.runs.length + failure.runs.length > 0) {
            core.summary.addHeading(
                `Success rate: ${Math.round(
                    (success.runs.length / (success.runs.length + failure.runs.length)) * 100
                )}% (${success.runs.length} successes out of ${success.runs.length + failure.runs.length} runs)`
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
