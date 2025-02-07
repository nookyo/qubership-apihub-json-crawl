const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
const exec = require('@actions/exec');
const execSync = require('child_process').execSync;

const defaultPath = './actions/npm-template.yml';

let configDefault = {
    version: '2.0.0',
    runTests: false,
    tag: 'latest',
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

async function updateDependency() {
    core.warning('Updating dependencies');
    let dependency = execSync('npm ls --json');

}

async function runHook(hookName, hooks) {
    if (hooks && hooks[hookName]) {
        core.info(`Запуск хука ${hookName}: ${hooks[hookName]}`);
        await runCommand("sh", ["-c", hooks[hookName]]);
    }
}

async function runCommand(command, args) {
    const options = {
        env: {
            ...process.env,
            NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN || process.env.GITHUB_TOKEN,
        },
    };
    try {
        await exec.exec(command, args, options);
    } catch (error) {
        core.setFailed(`Error executing command: ${error}`);
        throw error;
    }
}


async function publishPackages(isLerna, tagName) {
    core.warning('Publishing packages');

    const tagName = process.env.TAG_NAME || 'latest';

    if (isLerna) {
        await runCommand('npx', [
            'lerna',
            'publish',
            'from-package',
            '--yes',
            '--no-push',
            '--no-git-reset',
            '--no-git-tag-version',
            '--dist-tag', tagName
        ]);
    }

    await runCommand('npm', ['publish', '--tag', tagName]);
    return;

}

async function changeVersion(version, isLerna) {
    core.warning('Changing version');
    if(isLerna){
        const args = [
            'lerna',
            'version',
            version,
            '--yes',
            '--no-git-tag-version',
            '--no-push'
        ];
        await runCommand('npx', args);
    }
    else{
        await runCommand('npm', ['version', version, '--no-git-tag-version']);
    }
}



async function detectLerna() {
    if (fs.existsSync('lerna.json')) {
        core.warning('Detected Lerna project');
        return true;
    }
    return false;
}

async function buildPackages() {
    core.warning('Building project');
    await runCommand('npm', ['run', 'build', '--if-present']);
}

async function projectTest(runTests) {
    if (runTests) {
        core.warning('Testing project');
        await runCommand('npm', ['run', 'test', '--if-present']);
    }
}

async function installDependency() {
    core.warning('Installing dependencies');
    await runCommand('npm', ['ci', '--legacy-peer-deps']);
}

async function run() {

    let filePath = core.getInput('filePath') || defaultPath;
    let result = await loadConfig(filePath);

    let runTests = core.getInput('runTests') || result.runTests;
    let version = core.getInput('version') || result.version;
    let tag = core.getInput('tag') || result.tag;


    core.info(`Config: ${JSON.stringify(result)}`);

    let isLerna = await detectLerna();

    await installDependency();

    await changeVersion(version, isLerna);

    await buildPackages();

    await projectTest(runTests);

    await publishPackages(isLerna, tag);
}

run();
