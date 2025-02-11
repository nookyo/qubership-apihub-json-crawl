const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
const exec = require('@actions/exec');
const execSync = require('child_process').execSync;
const semver = require('semver')
const merge = require('lodash.merge');

const defaultPath = './npm-template.yml';

let configDefault = {
    runTests: false,
    tag: 'latest',
};

async function loadConfig(filePath) {
    let config = {};

    if (fs.existsSync(filePath)) {
        try {
            const fileConfig = yaml.load(fs.readFileSync(filePath, 'utf8'));
            // config = { ...config, ...fileConfig };
            config = merge({}, configDefault, fileConfig);
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


function validateVersion(version) {
    if (typeof version !== 'string' || version.trim() === '') {
        return false;
    }
    // semver.valid возвращает null, если версия некорректна
    return semver.valid(version) !== null;
}



async function getNewVersion(version, releaseType, skipIncrement = false) {

    core.warning('Calculation version');

    try {
        const data = await fs.promises.readFile('./package.json', 'utf-8');
        const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
    }
    catch (error) {
        core.error(`Error reading ./package.json: ${error}`);
        throw error;
    }

    const currentVersion = packageJson.version;

    if (version || version.trim()) {
        core.warning(`Use provided version ${version}`)
        return { currentVersion, version };
    }

    let newVersion;
    core.info('Version not set. Try to auto increment version');
    newVersion = semver.inc(currentVersion, releaseType);

    if (!newVersion) {
        const errorMessage = `Failed to increment version from ${currentVersion} using release type ${releaseType}`;
        core.error(errorMessage);
        throw new Error(errorMessage);
    }

    return { currentVersion, newVersion }

}

async function publishPackages2(isLerna, config, tag) {
    core.warning('Publishing packages');
    let command, args;
    //const tag = core.getInput('tag') || config.tag || 'latest';

    if (config.publish?.command && config.publish?.args) {
        command = config.publish.command;
        args = config.publish.args.map(arg => (arg === '${tag}' ? tag : arg));

    } else if (isLerna) {
        command = 'npx';
        args = [
            'lerna',
            'publish',
            'from-package',
            '--yes',
            '--no-push',
            '--no-git-reset',
            '--no-git-tag-version',
            '--dist-tag', tag
        ];
    } else {
        command = 'npm';
        args = ['publish', '--tag', tag];
    }

    await runCommand(command, args);
}




async function changeVersion(version, isLerna) {
    core.warning('Changing version');

    if (isLerna) {
        const args = [
            'lerna',
            'version',
            version.newVersion,
            '--yes',
            '--no-git-tag-version',
            '--no-push'
        ];
        await runCommand('npx', args);
    }
    else {
        await runCommand('npm', ['version', version.newVersion, '--no-git-tag-version']);
    }

    core.warning(`Version changed ${version.currentVersion} -> ${version.newVersion}`);
}


async function commitAndPush(config, commitMessage = 'chore[skip ci]: commit changes', commit = false) {
    core.warning('Commit and Push')
    try {

        const userName = config?.user?.name || 'qubership-action[bot]';
        const userEmail = config?.user?.email || 'qubership-action[bot]@qubership.com';

        await runCommand('git', ['config', 'user.name', userName]);
        await runCommand('git', ['config', 'user.email', userEmail]);

        core.info(`Git config set: user.name=${userName}, user.email=${userEmail}`);

        await runCommand('git', ['add', '.']);
        await runCommand('git', ['reset', 'node_modules']);
        await runCommand('git', ['commit', '-m', commitMessage]);

        if (commit) {
            await runCommand('git', ['push', 'origin', 'HEAD']);
        }

    } catch (error) {

        if (error.message.includes('nothing to commit')) {
            core.info('Nothing to commit.');
        } else {
            core.error('Error with commit and push action: ' + error);
            throw error;
        }
    }
}

async function detectLerna() {
    if (fs.existsSync('lerna.json')) {
        core.warning('Detected Lerna project');
        return true;
    }
    return false;
}


async function installDependency(config) {
    core.warning('Installing dependencies');
    if (config.ci?.command && config.ci?.args)
        await runCommand(config.ci.command, config.ci.args)
    else {
        await runCommand('npm', ['ci', '--legacy-peer-deps']);
    }
}


async function buildPackages(config) {
    core.warning('Building project');
    core.info(`Show config: ${JSON.stringify(config)}`)

    if (config.build?.command && config.build?.args) {
        await runCommand(config.build.command, config.build.args);
    } else {
        await runCommand('npm', ['run', 'build', '--if-present']);
    }
}


async function projectTest(runTests) {
    if (runTests) {
        core.warning('Testing project');
        await runCommand('npm', ['run', 'test', '--if-present']);
    }
}

async function run() {
    try {

        let configFile = core.getInput('config-file') || defaultPath;
        let config = await loadConfig(configFile);

        const runTestsInput = core.getInput('run-tests');
        const runTests = runTestsInput.toLowerCase() === 'true' || config.runTests;

        let packageVersion = core.getInput('package-version');
        let releaseType = core.getInput('release-type') || 'patch';

        let publishTag = core.getInput('publish-tag') || config.tag || 'latest';

        const version = await getNewVersion(packageVersion, releaseType);

        core.info(`Version is: ${JSON.stringify(version)}`);
        core.info(`Config: ${JSON.stringify(config)}`);

        let isLerna = await detectLerna();

        await installDependency(config);
        await changeVersion(version, isLerna);
        await buildPackages(config);
        await projectTest(runTests);
        await commitAndPush(config);
        await publishPackages2(isLerna, config, publishTag);
    }
    catch (error) {
        core.error(error);
    }
}

run();
