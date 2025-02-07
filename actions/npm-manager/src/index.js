const fs = require('fs');
const yaml = require('js-yaml');
const core = require('@actions/core');
const exec = require('@actions/exec');


// filePatch = './.github/npm-template.yml';

const defaultPath = './actions/npm-template.yml';

let configDefault = {
    version: '2.0.0',
}


async function loadConfig(filePatch) {

    let config = { ...configDefault };

    if (fs.existsSync(filePatch)) {
        try {
            const fileConfig = yaml.load(fs.readFileSync(filePatch, 'utf8'));
            config = { ...config, ...fileConfig };

            core.info(`Config: ${JSON.stringify(fileConfig)}`);
            core.info(`Config: ${JSON.stringify(config)}`);

        } catch (error) {
            core.error(`Error loading config file: ${error}`);
        }
    }

    config.version = core.getInput('version') || config.version;
    return config;
}

async function runCommand(command, arg){
    const options = {
        listeners: {
          stdout: (data) => {
            process.stdout.write(data.toString());
          },
          stderr: (data) => {
            process.stderr.write(data.toString());
          }
        }
      };
      try {
        await exec.exec(command,arg, options);
      }
      catch(error){
        core.error(`Error building project: ${error}`);
      }
}


async function projectBuild(){
    runCommand('npm', ['run', 'build']);
}

async function installDependency(){
    runCommand('npm', ['ci', '--legacy-peer-deps']);
}

async function run() {


    let filePath =  core.getInput('filePath') || defaultPath;

    let result = await loadConfig(filePath);

    core.info(`Config: ${JSON.stringify(result)}`);

    await installDependency();
    await projectBuild();



}

run();