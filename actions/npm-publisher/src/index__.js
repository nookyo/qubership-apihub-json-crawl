const core = require('@actions/core');
const ConfigLoader = require('./configLoader');
const VersionManager = require('./versionManager');
const NpmPublisher = require('./npmPublisher');
const CmdManager = require('./cmdManager');

async function run() {
    try {
        core.info('🔹 Starting NPM Build and Publish Action...');

        // Читаем входные параметры GitHub Actions
        const packageVersion = core.getInput('package-version');
        const configFilePath = core.getInput('config-file') || './.github/npm-template.yml';
        const runTestsInput = core.getInput('run-tests');
        const runTests = runTestsInput.toLowerCase() === 'true';
        const publishTag = core.getInput('publish-tag') || 'latest';
        const releaseType = core.getInput('release-type') || 'patch';

        core.info(`📦 Package Version: ${packageVersion || 'Auto-detect'}`);
        core.info(`🛠 Config File Path: ${configFilePath}`);
        core.info(`🧪 Run Tests: ${runTests}`);
        core.info(`🏷 Publish Tag: ${publishTag}`);
        core.info(`🔄 Release Type: ${releaseType}`);

        const configLoader = new ConfigLoader();
        const config = await configLoader.load(configFilePath);
        const cmdManager = new CmdManager();
        const versionManager = new VersionManager(cmdManager);
        const npmPublisher = new NpmPublisher(config, cmdManager);

        const isLerna = await npmPublisher.detectLerna();

        const version = await versionManager.getNewVersion(packageVersion, releaseType);

        await npmPublisher.installDependency();
        await versionManager.changeVersion(version, isLerna);
        await npmPublisher.buildPackages();

        if (runTests) {
            await npmPublisher.runTests();
        }

        await npmPublisher.commitAndPush();
        await npmPublisher.publishPackages(isLerna, publishTag);

        core.info('✅ NPM package successfully built and published!');

    } catch (error) {
        core.setFailed(`❌ Action failed: ${error.message}`);
    }
}

run();
