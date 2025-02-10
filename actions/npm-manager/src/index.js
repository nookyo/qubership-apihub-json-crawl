const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
const exec = require('@actions/exec');
const execSync = require('child_process').execSync;
const semver = require('semver')
const merge = require('lodash.merge');

const defaultPath = './actions/npm-template.yml';

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



async function getNewVersion(version, releaseType) {

    if (!version || version.trim() === '') {
        try {

            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
            const currentVersion = packageJson.version;

            // if(semver.valid(currentVersion))
            if (!validateVersion(currentVersion)) {
                core.setFailed(`Version cant validate. Current value: ${currentVersion}`)
                throw new Error(`Version cant validate. Current value: ${currentVersion}`)
            }

            core.warning('Version not set. Try to auto increment version');
            const newVersion = semver.inc(currentVersion, releaseType);
            return newVersion;
        }
        catch (error) {
            core.error(`Error read ./package.json  ${error}`);
            throw error
        }
    }
    else {
        if (!validateVersion(version)) {
            core.setFailed(`Version cant validate. Current value: ${version}`)
            throw new Error(`Version cant validate. Current value: ${version}`)
        }
        core.warning(`Use provided version ${version}`)
        return version;
    }
}

async function getNewVersion(version, releaseType) {

    if (!version || version.trim() === '') {
        try {
            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf-8'))
            const currentVersion = packageJson.version;

            if (!validateVersion(currentVersion)) {
                core.setFailed(`Version cant validate. Current value: ${currentVersion}`)
                throw new Error(`Version cant validate. Current value: ${currentVersion}`)
            }

            core.warning('Version not set. Try to auto increment version');
            const newVersion = semver.inc(currentVersion, releaseType);
            return newVersion;
        }
        catch (error) {
            core.error(`Error read ./package.json  ${error}`);
            throw error;
        }
    }
    else {
        if (!validateVersion(version)) {
            core.setFailed(`Version cant validate. Current value: ${version}`)
            throw new Error(`Version cant validate. Current value: ${version}`)
        }
        core.warning(`Use provided version ${version}`)
        return version;
    }
}





// async function publishPackages(isLerna, tagName) {
//     core.warning('Publishing packages');

//     //const tagName = process.env.TAG_NAME || 'latest';

//     if (isLerna) {
//         await runCommand('npx', [
//             'lerna',
//             'publish',
//             'from-package',
//             '--yes',
//             '--no-push',
//             '--no-git-reset',
//             '--no-git-tag-version',
//             '--dist-tag', tagName
//         ]);
//     }
//     else {
//         await runCommand('npm', ['publish', '--tag', tagName]);
//     }
//     return;
//}


async function publishPackages2(isLerna, config, tag) {
    core.info('Publishing packages');

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
            version,
            '--yes',
            '--no-git-tag-version',
            '--no-push'
        ];
        await runCommand('npx', args);
    }
    else {
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


async function installDependency() {
    core.warning('Installing dependencies');
    await runCommand('npm', ['ci', '--legacy-peer-deps']);
}


async function buildPackages(config) {
    core.info('Building project');
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
        let filePath = core.getInput('filePath') || defaultPath;
        let config = await loadConfig(filePath);


        const runTestsInput = core.getInput('runTests');
        const runTests = runTestsInput.toLowerCase() === 'true' || config.runTests;

        let versionInput = core.getInput('version');

        //let tag = core.getInput('tag') || config.tag;
        const tag = core.getInput('tag') || config.tag || 'latest';

        const version = await getNewVersion(versionInput, 'patch');

        core.info(`Version is: ${version}`);
        core.info(`Config: ${JSON.stringify(config)}`);

        let isLerna = await detectLerna();

        await installDependency();

        await changeVersion(version, isLerna);

        await buildPackages(config);

        await projectTest(runTests);

        await publishPackages2(isLerna, config, tag);
    }
    catch (error) {
        core.error(error)
    }
}

run();