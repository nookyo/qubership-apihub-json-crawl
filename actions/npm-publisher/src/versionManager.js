const fs = require('fs').promises;
const semver = require('semver');
const core = require('@actions/core');
const CmdManager = require('./cmdManager');

class VersionManager {

    constructor(){
        this.cmdManager = new CmdManager();
    }
    async getNewVersion(version, releaseType) {
        core.warning('Determining new version...');
        let packageJson;

        try {
            const data = await fs.readFile('./package.json', 'utf-8');
            packageJson = JSON.parse(data);
        } catch (error) {
            core.error(`Error reading ./package.json: ${error}`);
            throw error;
        }

        const currentVersion = packageJson.version;

        if (version && version.trim()) {
            core.warning(`Using provided version: ${version}`);
            return { currentVersion, newVersion: version };
        }

        core.info('Auto-incrementing version...');
        const newVersion = semver.inc(currentVersion, releaseType);

        if (!newVersion) {
            throw new Error(`Failed to increment version from ${currentVersion} using release type ${releaseType}`);
        }

        return { currentVersion, newVersion };
    }

    async changeVersion(version, isLerna) {
        core.warning('Changing version...');
        const command = isLerna ? 'npx' : 'npm';
        const args = isLerna
            ? ['lerna', 'version', version.newVersion, '--yes', '--no-git-tag-version', '--no-push']
            : ['version', version.newVersion, '--no-git-tag-version'];

        // await NpmPublisher.runCommand(command, args);

        await this.cmdManager.runCommand(command, args);
        core.info(`Version updated: ${version.currentVersion} -> ${version.newVersion}`);
    }
}

module.exports = VersionManager;
