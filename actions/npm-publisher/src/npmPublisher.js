const core = require('@actions/core');
const fs = require('fs');
const CmdManager = require('./cmdManager');

class NpmPublisher {
    constructor(config) {
        this.config = config;
        this.cmdManager = new CmdManager();
    }

    async detectLerna() {
        if (fs.existsSync('lerna.json')) {
            core.warning('💡 Detected Lerna project');
            return true;
        }
        return false;
    }

    async installDependency() {
        core.warning('💡 Installing dependencies...');
        if (this.config.ci?.command && this.config.ci?.args) {
            await this.cmdManager.runCommand(this.config.ci.command, this.config.ci.args);
        } else {
            await this.cmdManager.runCommand('npm', ['ci', '--legacy-peer-deps']);
        }
    }

    async buildPackages() {
        core.warning('💡 Building project...');
        if (this.config.build?.command && this.config.build?.args) {
            await this.cmdManager.runCommand(this.config.build.command, this.config.build.args);
        } else {
            await this.cmdManager.runCommand('npm', ['run', 'build', '--if-present']);
        }
    }

    async publishPackages(isLerna, tag) {
        core.warning('💡 Publishing packages...');
        let command, args;

        if (this.config.publish?.command && this.config.publish?.args) {
            command = this.config.publish.command;
            args = this.config.publish.args.map(arg => (arg === '${tag}' ? tag : arg));
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

        try {
            await this.cmdManager.runCommand(command, args);
        }
        catch (error) {
            core.setFailed(error);
            throw error
        }
    }

    async commitAndPush(commitMessage = 'chore[skip ci]: commit changes', commit = false) {
        core.warning('💡 Committing and pushing changes...');
        try {
            const userName = this.config?.user?.name || 'qubership-action[bot]';
            const userEmail = this.config?.user?.email || 'qubership-action[bot]@qubership.com';

            await this.cmdManager.runCommand('git', ['config', 'user.name', userName]);
            await this.cmdManager.runCommand('git', ['config', 'user.email', userEmail]);

            await this.cmdManager.runCommand('git', ['add', '.']);
            await this.cmdManager.runCommand('git', ['reset', 'node_modules']);
            await this.cmdManager.runCommand('git', ['commit', '-m', commitMessage]);

            if (commit) {
                await this.cmdManager.runCommand('git', ['push', 'origin', 'HEAD']);
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
}

module.exports = NpmPublisher;
