const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
const merge = require('lodash.merge');

class ConfigLoader {
    constructor(defaultPath = './.github/npm-template.yml') {
        this.defaultPath = defaultPath;
        this.configDefault = {
            runTests: false,
            tag: 'latest',
        };
    }

    async load(filePath = this.defaultPath) {
        let config = {};

        if (fs.existsSync(filePath)) {
            try {
                const fileConfig = yaml.load(fs.readFileSync(filePath, 'utf8'));
                config = merge({}, this.configDefault, fileConfig);
                core.info(`Loaded config: ${JSON.stringify(fileConfig)}`);
            } catch (error) {
                core.error(`Error loading config file: ${error}`);
            }
        } else {
            core.warning(`Config file ${filePath} not found. Using defaults.`);
        }

        config.version = core.getInput('version') || config.version;
        return config;
    }
}

module.exports = ConfigLoader;
