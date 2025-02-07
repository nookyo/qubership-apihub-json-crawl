const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
const exec = require('@actions/exec');

const defaultPath = './actions/npm-template.yml';

let configDefault = {
    version: '2.0.0',
};

async function loadConfig(filePath) {
    let config = { ...configDefault };

    if (fs.existsSync(filePath)) {
        try {
            const fileConfig = yaml.load(fs.readFileSync(filePath, 'utf8'));
            config = { ...config, ...fileConfig };
            core.info(`Config: ${JSON.stringify(fileConfig)}`);
        } catch (error) {
            core.error(`Error loading config file: ${error}`);
        }
    } else {
        core.warning(`Config file ${filePath} not found. Using defaults.`);
    }

    config.version = core.getInput('version') || config.version;
    return config;
}

async function runCommand(command, args) {
    const options = {
        env: {
            ...process.env,
            NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN || process.env.GITHUB_TOKEN,
        }
        // listeners: {
        //     stdout: (data) => process.stdout.write(data.toString()),
        //     stderr: (data) => process.stderr.write(data.toString()),
        // },
    };
    try {
        await exec.exec(command, args, options);
    } catch (error) {
        core.setFailed(`Error executing command: ${error}`);
        throw error;
    }
}


async function detectLerna() {
    let isLerna = false;
    if(fs.existsSync('lerna.json')) {
        isLerna = true;
        core.warning('Detected Lerna project');
    }
    return isLerna;
}

async function projectBuild() {
    core.warning('Building project');
    await runCommand('npm', ['run', 'build']);
}

async function installDependency() {
    core.warning('Installing dependencies');
    await runCommand('npm', ['ci', '--legacy-peer-deps']);
}

async function run() {
    let filePath = core.getInput('filePath') || defaultPath;
    let result = await loadConfig(filePath);

    core.info(`Config: ${JSON.stringify(result)}`);

    await installDependency();
    await detectLerna();
    await projectBuild();
}

run();
