# GitHub Action: Automated Version Management and npm Package Publishing

A GitHub Action for automating the process of managing package versions and publishing npm packages.

---

## 📌 Features

- **Configuration Loading**: Reads and merges settings from a YAML configuration file.
- **Version Management**:
  - Uses a provided version or auto-increments based on release type (`patch`, `minor`, `major`).
  - Supports versioning in `package.json` and monorepos with Lerna.
- **Dependency Management**: Installs project dependencies with npm or custom commands.
- **Build and Test Automation**: Builds the project and runs tests if enabled.
- **Git Commit and Push**:
  - Commits changes with a predefined message.
  - Pushes updates to the repository if enabled.
- **Package Publishing**: Publishes the package to npm with a specified tag.

---

## Inputs

| Name             | Description                                                              | Default Value                        | Required |
| --------------- | ------------------------------------------------------------------------ | ------------------------------------ | -------- |
| `config-file`   | Path to the YAML configuration file.                                    | `./.github/npm-template.yml`         | No       |
| `run-tests`     | Whether to run tests before publishing (`true`/`false`).                 | `false`                              | No       |
| `package-version` | The package version to use. If omitted, auto-increment is applied.   | (none)                               | No       |
| `release-type`  | Type of version bump (`patch`, `minor`, `major`).                      | `patch`                              | No       |
| `publish-tag`   | npm tag for package publishing.                                        | `latest` (or from config file)       | No       |

---

## 🚀 Usage

To use this GitHub Action in your workflow, add the following step to your `.github/workflows/your-workflow.yml` file:

### Basic Example

```yaml
name: Publish npm Package

on:
  push:
    branches:
      - main

jobs:
  publish:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          registry-url: 'https://npm.pkg.github.com'

      - name: Run npm Publisher Action
        uses: your-org/npm-publisher-action@v1
        with:
          config-file: .github/npm-template.yml
          run-tests: 'true'
          package-version: '1.0.1'
          release-type: patch
          publish-tag: latest

      - name: Publish to npm
        run: npm publish --tag latest
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## ⚙️ How It Works

1. **Configuration Loading**: Reads settings from `.github/npm-template.yml` (if available).
2. **Version Handling**:
   - If `package-version` is provided, it uses that version.
   - Otherwise, it increments the version based on `release-type`.
3. **Dependency Installation**: Runs `npm ci` or a custom command defined in the configuration file.
4. **Build Process**: Runs `npm run build` or a custom build command specified in the template.
5. **Testing**: Runs `npm test` if `run-tests` is set to `true`, or executes a custom test command from the configuration.
6. **Git Commit and Push**:
   - Configures Git user info.
   - Commits changes with a predefined message.
   - Pushes updates if configured.
7. **Publishing**:
   - Uses `npm publish` with the specified `publish-tag`, or a custom publish command from the configuration file.
   - Supports Lerna for monorepos.

💡 **Customization**:
All commands (installing dependencies, building, testing, publishing) can be overridden by defining custom commands and arguments in `.github/npm-template.yml`.  
Example:
```yaml
ci:
  command: npm
  args:
    - ci
    - --legacy-peer-deps

build:
  command: npm
  args:
    - run
    - build
    - --if-present

publish:
  command: npm
  args:
    - publish
    - --tag
    - '${tag}'
```
