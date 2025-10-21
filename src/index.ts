import core = require('@actions/core');
import { UnityEditor } from '@rage-against-the-pixel/unity-cli';

async function main() {
    try {
        if (!process.env.UNITY_EDITOR_PATH) {
            throw new Error('UNITY_EDITOR_PATH environment variable must be set!');
        }

        const unityEditor = new UnityEditor(process.env.UNITY_EDITOR_PATH);
        core.debug(`Using Unity Editor at path:\n  > ${unityEditor.editorPath}`);

        const templateNameInput = core.getInput('template-name');
        const templatePath = unityEditor.GetTemplatePath(templateNameInput);
        core.debug(`Using Unity template at path:\n  > ${templatePath}`);

        const projectNameInput = core.getInput('project-name', { required: true });
        const projectDirectoryInput = core.getInput('project-directory') || process.cwd();
        const projectPath = `${projectDirectoryInput}/${projectNameInput}`;
        core.debug(`Creating Unity project at:\n  > ${projectPath}`);
        await unityEditor.Run({
            args: [
                '-quit',
                '-nographics',
                '-batchmode',
                '-createProject', projectPath,
                '-cloneFromTemplate', templatePath,
            ]
        });
        core.setOutput('project-path', projectPath);
    } catch (error) {
        core.setFailed(error);
    }
}

main();