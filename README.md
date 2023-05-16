# workflow-run-history

Adds a Markdown Step Summary explaining the historical performance and success rate of a workflow over the previous month.

### Not yet implemented

-   Compare performance / success rate against default branch
-   Custom date rages

## Example

<h1>Workflow Run History over the last month (20 total runs)</h1>
<h1>Success rate: 75% (15 successes out of 20 runs)</h1>
<h1>15 successful runs</h1>
<table><tr><th>Percentile</th><th>Success duration in seconds</th></tr><tr><td>99th</td><td>25</td></tr><tr><td>90th</td><td>35</td></tr><tr><td>50th</td><td>41</td></tr></table>
<h1>5 failing runs</h1>
<table><tr><th>Percentile</th><th>Success duration in seconds</th></tr><tr><td>99th</td><td>29</td></tr><tr><td>90th</td><td>29</td></tr><tr><td>50th</td><td>39</td></tr></table>
<h1>Run status breakdown</h1>
<table><tr><th>Status</th><th>Percent of total</th></tr><tr><td>success</td><td>75%</td></tr><tr><td>failure</td><td>25%</td></tr></table>


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
            - name: Checkout
              uses: actions/checkout@v3
            - uses: urcomputeringpal/workflow-run-history@v0
              timeout-minutes: 2
```
