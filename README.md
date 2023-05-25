# workflow-run-history

Adds a Markdown Step Summary explaining the historical performance and success rate of a workflow over the previous week.

-   Compares performance / success rate against other workflows runs on the default branch, PRs, and tags
-   Allows setting performance and success rate targets
-   Outputs values that indicate whether or not the workflow is meeting its targets

## Example

https://github.com/urcomputeringpal/workflow-run-history/actions/runs/5079482931

## Usage

```yaml
name: test
on:
    pull_request:
    push:
        branches:
            - main
    schedule:
        - cron: "0 * * * *"

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - run: sleep 5
    performance:
        needs: test
        runs-on: ubuntu-latest
        steps:
            - uses: urcomputeringpal/workflow-run-history@v0
              id: history
              timeout-minutes: 2
              with:
                  # # Target performance
                  # Target an average workflow runtime of 60 seconds.
                  target-seconds: "60"
                  target-percentile: "50"

                  # # Target success rates
                  # This workflow should complete 99% of the time on the default branch.
                  target-default-success-rate: "99"
                  # This workflow should complete 90% of the time on PRs.
                  target-pr-success-rate: "90"
            - run: |
                  echo "This workflow run hit its target performance: ${{ steps.history.outputs.hit-target-seconds }}"
                  echo "This workflow has historically hit its target performance on PRs: ${{ steps.history.outputs.hit-target-pr-success-percentile }}"
                  echo "This workflow has historically hit its target success rate on main: ${{ steps.history.outputs.hit-target-default-success-rate }}"
```
