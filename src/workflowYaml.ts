import { GitHubScriptArguments } from "@urcomputeringpal/github-script-ts";
import yaml from "js-yaml";

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

export enum ConfigOption {
    target = "workflow_target_seconds",
}

// fetch a ConfigOption value from the `env` section of the workflow YAML
export function configOption(configOption: ConfigOption, workflowYaml: WorkflowYaml): string | undefined {
    if (workflowYaml.env !== undefined && workflowYaml.env[configOption] !== undefined) {
        return `${workflowYaml.env[configOption]}`;
    }
    return undefined;
}

export async function fetchWorkflowYaml(
    workflow_id: string,
    args: GitHubScriptArguments
): Promise<WorkflowYaml | undefined> {
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
