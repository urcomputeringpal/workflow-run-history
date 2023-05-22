import { WorkflowGroup, WorkflowRun, getWorkflowRuns } from "./workflowGroup";
import { GitHubScriptArguments } from "@urcomputeringpal/github-script-ts";
import { Context } from "@actions/github/lib/context";
import * as core from "./__mocks__/core";

const emptyContext: Context = {
    payload: {
        pull_request: undefined,
    },
    issue: {
        number: 0,
        owner: "",
        repo: "",
    },
    repo: {
        owner: "status",
        repo: "status",
    },
    eventName: "",
    sha: "",
    ref: "",
    workflow: "",
    action: "",
    actor: "",
    job: "",
    runNumber: 0,
    runId: 0,
    apiUrl: "",
    serverUrl: "",
    graphqlUrl: "",
};

describe("WorkflowGroup", () => {
    describe("getNthPercentileDuration", () => {
        it("should return the correct nth percentile duration", () => {
            const runs: WorkflowRun[] = [
                {
                    id: 1,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:01:00Z",
                    durationSeconds: 5,
                    ref: "",
                },
                {
                    id: 2,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:02:00Z",
                    durationSeconds: 5,
                    ref: "",
                },
                {
                    id: 3,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:03:00Z",
                    durationSeconds: 30,
                    ref: "",
                },
                {
                    id: 4,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:04:00Z",
                    durationSeconds: 40,
                    ref: "",
                },
                {
                    id: 5,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:05:00Z",
                    durationSeconds: 50,
                    ref: "",
                },
            ];
            const group = new WorkflowGroup(runs);
            const p90 = group.getNthPercentileDuration(90);
            expect(p90).toBe(5);
            const p99 = group.getNthPercentileDuration(99);
            expect(p99).toBe(5);
        });
    });

    describe("getPercentileForDuration", () => {
        it("should return the correct percentile for the given duration", () => {
            const runs: WorkflowRun[] = [
                {
                    id: 1,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:01:00Z",
                    durationSeconds: 10,
                    ref: "",
                },
                {
                    id: 2,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:02:00Z",
                    durationSeconds: 20,
                    ref: "",
                },
                {
                    id: 3,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:03:00Z",
                    durationSeconds: 30,
                    ref: "",
                },
                {
                    id: 4,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:04:00Z",
                    durationSeconds: 40,
                    ref: "",
                },
                {
                    id: 5,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:05:00Z",
                    durationSeconds: 50,
                    ref: "",
                },
            ];
            const group = new WorkflowGroup(runs);
            expect(group.getPercentileForDuration(25)).toBe(60);
            expect(group.getPercentileForDuration(100)).toBe(0);
            expect(group.getPercentileForDuration(1)).toBe(100);
        });
    });

    describe("byRef", () => {
        it("should return runs filtered by ref", () => {
            const runs: WorkflowRun[] = [
                {
                    id: 1,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:01:00Z",
                    durationSeconds: 10,
                    ref: "main",
                },
                {
                    id: 2,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:02:00Z",
                    durationSeconds: 20,
                    ref: "main",
                },
                {
                    id: 3,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:03:00Z",
                    durationSeconds: 30,
                    ref: "main",
                },
                {
                    id: 4,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:04:00Z",
                    durationSeconds: 40,
                    ref: "",
                },
                {
                    id: 5,
                    status: "success",
                    created_at: "2022-01-01T00:00:00Z",
                    updated_at: "2022-01-01T00:05:00Z",
                    durationSeconds: 50,
                    ref: "",
                },
            ];
            const group = new WorkflowGroup(runs);
            const main = group.byRef("main");
            expect(main.runs.length).toBe(3);
            const percentile = main.getNthPercentileDuration(50);
            expect(percentile).toBe(20);
        });
    });
});

const mockWorkflowRunResponse = {
    total_count: 4,
    workflow_runs: [
        {
            id: 1,
            conclusion: "success",
            status: "completed",
            head_branch: "branch-1",
            created_at: "2022-01-01T00:00:00Z",
            updated_at: "2022-01-01T00:10:00Z",
        },
        {
            id: 2,
            conclusion: "failure",
            status: "completed",
            head_branch: "branch-2",
            created_at: "2022-01-01T00:00:00Z",
            updated_at: "2022-01-01T00:20:00Z",
        },
        {
            id: 3,
            conclusion: "success",
            status: "completed",
            head_branch: "branch-1",
            created_at: "2022-01-01T00:00:00Z",
            updated_at: "2022-01-01T00:30:00Z",
        },
        {
            id: 4,
            conclusion: "failure",
            status: "completed",
            head_sha: "c0cda0d",
            created_at: "2022-01-01T00:00:00Z",
            updated_at: "2022-01-01T00:40:00Z",
        },
    ],
};

describe("getWorkflowRuns", () => {
    beforeEach(() => {
        jest.resetModules();
        jest.doMock("@octokit/rest", () => {
            const Octokit = class MockOctokit {
                paginate = {
                    iterator: jest.fn(() => {
                        return {
                            async *[Symbol.asyncIterator]() {
                                yield { data: mockWorkflowRunResponse };
                            },
                        };
                    }),
                };
                rest = {
                    actions: jest.fn().mockResolvedValue(mockWorkflowRunResponse),
                };
            };

            return { Octokit };
        });
    });
    afterEach(() => {
        jest.resetAllMocks();
    });

    it("should fetch and group workflow runs correctly", async () => {
        const Mocktokit = require("@octokit/rest").Octokit;
        const mockGithub = new Mocktokit();
        const mockArgs: GitHubScriptArguments = {
            github: mockGithub,
            context: emptyContext,
            core,
        };

        const groupedRuns = await getWorkflowRuns(1234, mockArgs);

        expect(mockGithub.paginate.iterator).toHaveBeenCalledWith(mockGithub.rest.actions.listWorkflowRuns, {
            owner: "status",
            repo: "status",
            workflow_id: 1234,
            created: expect.any(String),
        });

        expect(groupedRuns.size).toBe(2);

        const successGroup = groupedRuns.get("success");
        const failureGroup = groupedRuns.get("failure");

        expect(successGroup).toBeDefined();
        expect(failureGroup).toBeDefined();

        expect(successGroup!.runs.length).toBe(2);
        expect(failureGroup!.runs.length).toBe(2);

        expect(successGroup!.runs[0].ref).toBe("branch-1");
        expect(successGroup!.runs[1].ref).toBe("branch-1");
        expect(failureGroup!.runs[0].ref).toBe("branch-2");
        expect(failureGroup!.runs[1].ref).toBe("c0cda0d");
    });

    it("should fetch and group workflow runs correctly even when the paginated response is weird", async () => {
        jest.resetModules();
        jest.doMock("@octokit/rest", () => {
            const Octokit = class PaginatedMocktokit {
                paginate = {
                    iterator: jest.fn(() => {
                        return {
                            async *[Symbol.asyncIterator]() {
                                yield { data: mockWorkflowRunResponse.workflow_runs };
                            },
                        };
                    }),
                };
                rest = {
                    actions: jest.fn().mockResolvedValue(mockWorkflowRunResponse),
                };
            };

            return { Octokit };
        });

        const PaginatedMocktokit = require("@octokit/rest").Octokit;
        const mockGithub = new PaginatedMocktokit();
        const mockArgs: GitHubScriptArguments = {
            github: mockGithub,
            context: emptyContext,
            core,
        };

        const groupedRuns = await getWorkflowRuns(1234, mockArgs);

        expect(mockGithub.paginate.iterator).toHaveBeenCalledWith(mockGithub.rest.actions.listWorkflowRuns, {
            owner: "status",
            repo: "status",
            workflow_id: 1234,
            created: expect.any(String),
        });

        expect(groupedRuns.size).toBe(2);
    });
});
