const core = require('@actions/core');
const exec = require('@actions/exec');

class CmdManager {


    async runCommand(command, args) {
        const options = {
            env: {
                ...process.env,
                NODE_AUTH_TOKEN: process.env.NODE_AUTH_TOKEN || process.env.GITHUB_TOKEN,
            },
        };
        await exec.exec(command, args, options);
    }

    async runHook(hookName, hooks) {
        if (hooks && hooks[hookName]) {
            core.info(`Running hook: ${hookName}: ${hooks[hookName]}`);
            await runCommand("sh", ["-c", hooks[hookName]]);
        }
    }
}

module.exports = CmdManager