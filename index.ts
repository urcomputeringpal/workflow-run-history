import { GitHubScriptArguments } from "@urcomputeringpal/github-script-ts";

export async function summarizeHistory(args: GitHubScriptArguments): Promise<void> {
  const { github, context, core } = args;
  if (github === undefined || context == undefined || core === undefined) {
    throw new Error("")
  }

  // FIXME selectable 'created' param to ensure we're using the same time period
  // FIXME paginate
  // FIXME also lookup default branch stats for the each of the same
  try {

    const successful = await github.rest.actions.listWorkflowRuns({
      ...context.repo,
      workflow_id: context.workflow,
      conclusion: "success",
      exclude_pull_requests: true,
    });

    const failure = await github.rest.actions.listWorkflowRuns({
      ...context.repo,
      workflow_id: context.workflow,
      conclusion: "failure",
      exclude_pull_requests: true,
    });
  
    const successfulDurations = successful.data.workflow_runs.map((run) => {
      const created = new Date(run.created_at);
      const updated = new Date(run.updated_at);
      const diff = updated.getTime() - created.getTime();
      return Math.floor(diff / 1000);
    });
  
    const successfulDurationsSorted = successfulDurations.sort((a, b) => a - b);
    const successfulDurations99thPercentile = successfulDurationsSorted[Math.floor(successfulDurationsSorted.length * 0.99)];
    const successfulDurations90thPercentile = successfulDurationsSorted[Math.floor(successfulDurationsSorted.length * 0.90)];
    const successfulDurations50thPercentile = successfulDurationsSorted[Math.floor(successfulDurationsSorted.length * 0.50)];  

    core.summary
      .addHeading(`Success rate: ${Math.round(successful.data.total_count / (successful.data.total_count + failure.data.total_count) * 100)}%`)
      .addTable([
        [{data: 'Percentile', header: true}, {data: 'Success duration in seconds', header: true}],
        ["99th", `${successfulDurations99thPercentile}`],
        ["90th", `${successfulDurations90thPercentile}`],
        ["50th", `${successfulDurations50thPercentile}`],
      ]).
    write()

    const failureDurations = failure.data.workflow_runs.map((run) => {
      const created = new Date(run.created_at);
      const updated = new Date(run.updated_at);
      const diff = updated.getTime() - created.getTime();
      return Math.floor(diff / 1000);
    });
    
    const failureDurationsSorted = failureDurations.sort((a, b) => a - b);
    const failureDurations99thPercentile = failureDurationsSorted[Math.floor(failureDurationsSorted.length * 0.99)];
    const failureDurations90thPercentile = failureDurationsSorted[Math.floor(failureDurationsSorted.length * 0.90)];
    const failureDurations50thPercentile = failureDurationsSorted[Math.floor(failureDurationsSorted.length * 0.50)];

    core.summary
      .addHeading(`Failure rate: ${Math.round(failure.data.total_count / (successful.data.total_count + failure.data.total_count) * 100)}%`)
      .addTable([
      [{data: 'Percentile', header: true}, {data: 'Failure duration in seconds', header: true}],
      ["99th", `${failureDurations99thPercentile}`],
      ["90th", `${failureDurations90thPercentile}`],
      ["50th", `${failureDurations50thPercentile}`],
    ])

  } catch(err) {
    core.setFailed(`${err}`);
  }






  return;
}
