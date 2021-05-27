const core = require('@actions/core');

const s3Output = core.getInput('sync-output');
const bucket = core.getInput('s3-bucket');
const prefix = core.getInput('prefix');

const searchTerm = `s3://${bucket}${prefix}`;

const lines = s3Output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => ['upload', 'copy', 'delete'].some((searchTerm) => line.startsWith(searchTerm)))
    .filter((line) => line.includes(searchTerm))
    .map((line) => line.split(searchTerm).pop());

const indexFiles = lines
    .filter((line) => line.endsWith('index.html'))
    .map((line) => line.substr(0, line.length - 10));

const files = [...new Set([...lines, ...indexFiles])].sort();

const githubRunId = process.env.GITHUB_RUN_ID;
const githubRunNumber = process.env.GITHUB_RUN_NUMBER;

const invalidationBatch = {
    "Paths": {
        "Quantity": files.length,
        "Items": files,
    },
    "CallerReference": `github-action-${githubRunId}-${githubRunNumber}`,
};

const json = JSON.stringify(invalidationBatch);

core.setOutput('quantity', files.length);
core.setOutput('json', json);
core.setOutput('json_escaped', json.replace('"', '\"'));
