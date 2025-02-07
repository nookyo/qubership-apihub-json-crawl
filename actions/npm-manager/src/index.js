const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
const exec = require('@actions/exec');


// filePatch = './.github/npm-template.yml';

const defaultPath = './actions/npm-template.yml';

let configDefault = {
    version: '2.0.0',
}


async function loadConfig(filePatch) {

    let config = { ...configDefault };

    if (fs.existsSync(filePatch)) {
        try {
            const fileConfig = yaml.load(fs.readFileSync(filePatch, 'utf8'));
            config = { ...config, ...fileConfig };

            core.info(`Config: ${JSON.stringify(fileConfig)}`);
            core.info(`Config: ${JSON.stringify(config)}`);

        } catch (error) {
            core.error(`Error loading config file: ${error}`);
        }
    }

    config.version = core.getInput('version') || config.version;
    return config;
}

async function runCommand(command, args) {
    const options = {
        env: {
            ...process.env,
            // Pass NODE_AUTH_TOKEN to npm (using NODE_AUTH_TOKEN or falling back to GITHUB_TOKEN)
            NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN || process.env.GITHUB_TOKEN,
        },
        listeners: {
            stdout: (data) => {
                process.stdout.write(data.toString());
            },
            stderr: (data) => {
                process.stderr.write(data.toString());
            }
        }
    };
    try {
        await exec.exec(command, args, options);
    } catch (error) {
        core.error(`Error executing command: ${error}`);
        process.exit(1);
    }
}

async function projectBuild() {
    core.info('Building project');
    runCommand('npm', ['run', 'build']);
}

async function installDependency() {
    core.info('Installing dependencies');
    runCommand('npm', ['ci', '--legacy-peer-deps']);
}

async function run() {


    let filePath = core.getInput('filePath') || defaultPath;

    let result = await loadConfig(filePath);

    core.info(`Config: ${JSON.stringify(result)}`);

    await installDependency();

    // await projectBuild();



}

run();