const exec = require('@actions/exec');

class CmdManager {


    async runCommand(command, args) {
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
}

module.exports = CmdManager