const core = require('@actions/core');
const exec = require('@actions/exec');

class CmdManager {


    async runCommand(command, args) {
        const options = {
            env: {
                ...process.env,
                NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN || process.env.GITHUB_TOKEN,
            },
            listeners: {
                stdout: (data) => this.stdout += data.toString(),
                stderr: (data) => this.stderr += data.toString(),
            },
        };
        try {
            await exec.exec(command, args, options);
        } catch (error) {
            core.error(`Error executing command: ${error}`);
            throw error;
        }
    }
}

module.exports = CmdManager