const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
// const { version } = require('os');


// filePatch = './.github/npm-template.yml';

let configDefault = {
    version: 'latest',
}


async function loadConfig(filePatch) {

    let config = { ...configDefault };

    if (fs.existsSync(filePatch)) {
        try {
            const fileConfig = yaml.load(fs.readFileSync(filePatch, 'utf8'));
            config = { ...config, ...fileConfig };
            core.info(`Config: ${JSON.stringify(config)}`);

        } catch (error) {
            core.error(`Error loading config file: ${error}`);
        }
    }

    config.version = core.getInput('version') || config.version;
    return config;
}



async function run() {

    let filePatch = core.getInput('filePatch');
    let result = await loadConfig(filePatch);
    core.info(`Config: ${JSON.stringify(result)}`);
}

run();