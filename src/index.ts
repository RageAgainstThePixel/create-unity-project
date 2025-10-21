import core = require('@actions/core');
import { UnityEditor } from '@rage-against-the-pixel/unity-cli';

async function main() {
    try {
        if (!process.env.UNITY_EDITOR_PATH) {
            throw new Error('UNITY_EDITOR_PATH environment variable must be set!');
        }

        const unityEditor = new UnityEditor(process.env.UNITY_EDITOR_PATH);
        core.info(`Using Unity Editor at path:\n  > ${unityEditor.editorPath}`);

        let templatePath: string | undefined = undefined;

        if (this.version.isGreaterThan('2018.0.0')) {
            const availableTemplates = unityEditor.GetAvailableTemplates();
            core.startGroup('Available Unity Project Templates:');

            for (const template of availableTemplates) {
                core.info(`  - ${template}`);
            }

            core.endGroup();
            templatePath = unityEditor.GetTemplatePath(core.getInput('template-name'));
            core.info(`Using Unity template at path:\n  > ${templatePath}`);
        } else {
            core.info('Unity Project Templates are not supported for Unity versions below 2018');
        }

        const projectNameInput = core.getInput('project-name', { required: true });
        const projectDirectoryInput = core.getInput('project-directory') || process.cwd();
        const projectPath = `${projectDirectoryInput}/${projectNameInput}`;
        core.info(`Creating Unity project at:\n  > ${projectPath}`);

        const args: string[] = [
            '-quit',
            '-nographics',
            '-batchmode',
            '-createProject', projectPath,
        ];

        if (templatePath) {
            args.push('-projectTemplate', templatePath);
        }

        const logPath = unityEditor.GenerateLogFilePath(projectPath, 'create-unity-project');
        args.push('-logFile', logPath);
        await unityEditor.Run({ args: [...args] });
        core.setOutput('project-path', projectPath);
    } catch (error) {
        core.setFailed(error);
    }
}

main();