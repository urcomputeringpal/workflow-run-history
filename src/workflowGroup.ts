import { GitHubScriptArguments } from "@urcomputeringpal/github-script-ts";
import { Endpoints } from "@octokit/types";

export interface WorkflowRun {
    id: number;
    status: string;
    created_at: string;
    updated_at: string;
    durationSeconds: number;
    ref: string;
}
export class WorkflowGroup {
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
        const index = sortedDurations.findIndex(value => value <= durationSeconds);
        if (index == -1) {
            return 100;
        } else {
            const percentile = (index / sortedDurations.length) * 100;
            return Math.ceil(percentile);
        }
    };

    byRef = (ref: string): WorkflowGroup => {
        return new WorkflowGroup(this.runs.filter(run => run.ref === ref));
    };

    tags = (): WorkflowGroup => {
        return new WorkflowGroup(this.runs.filter(run => run.ref.startsWith("refs/tags/")));
    };

    ignoringRefsMatchingPrefixes = (refs: string[]): WorkflowGroup => {
        return new WorkflowGroup(this.runs.filter(run => !refs.some(ref => run.ref.startsWith(ref))));
    };

    setTargetPercentileOutput = (name: string, targetSeconds: number, targetPercentile: number, core: any): void => {
        if (this.runs.length > 0) {
            const targetPercentileCandidate = this.getNthPercentileDuration(targetPercentile);
            if (targetSeconds < targetPercentileCandidate) {
                core.setOutput(`hit-target-${name}-percentile`, true);
            } else {
                core.setOutput(`hit-target-${name}-percentile`, false);
            }
        }
    };
}

export type GroupedWorkflowRuns = Map<string, WorkflowGroup>;

type ListWorkflowRunsResponse =
    Endpoints["GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs"]["response"]["data"]["workflow_runs"];

export async function getWorkflowRuns(workflow_id: number, args: GitHubScriptArguments): Promise<GroupedWorkflowRuns> {
    const workflowRuns: WorkflowRun[] = [];
    const { github, context, core } = args;
    if (github === undefined || context == undefined || core === undefined) {
        throw new Error("need github, context, and core");
    }

    const now = new Date();
    // FIXME allow users to specify date range
    // get the date 1 week
    const startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const endDate = new Date().toISOString().split("T")[0];

    // Create the `created` parameter for the API request
    const created = `${startDate}..${endDate}`;

    // FIXME also lookup default branch stats, make appropriate comparisons
    for await (const response of github.paginate.iterator(github.rest.actions.listWorkflowRuns, {
        ...context.repo,
        workflow_id,
        created,
    })) {
        const workflowRunResponse: ListWorkflowRunsResponse =
            response.data.length === undefined ? (response.data as any).workflow_runs : response.data;
        if (workflowRunResponse !== undefined) {
            for (const responseWorkflowRun of workflowRunResponse) {
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
                    ref:
                        responseWorkflowRun.head_branch !== undefined && responseWorkflowRun.head_branch !== null
                            ? responseWorkflowRun.head_branch
                            : responseWorkflowRun.head_sha,
                };
                if (responseWorkflowRun.conclusion !== null) {
                    workflowRun.status = responseWorkflowRun.conclusion;
                }
                workflowRuns.push(workflowRun);
            }
        }
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
