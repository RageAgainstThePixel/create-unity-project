import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';
import { UnityCli, UnityEditor } from '@rage-against-the-pixel/unity-cli';

/** A template entry from `unity templates list --format json`. */
interface UnityTemplate {
    name?: string;
    id?: string;
    type?: string;
    version?: string;
}

/**
 * Parse the template-name input into an ordered list of template id prefixes.
 * @param input A comma or newline separated list, such as `com.unity.template.3d, com.unity.template.urp-blank`.
 * @returns The prefixes, in the order they were given.
 * @throws If an entry has no template id in it.
 */
export function ParseTemplatePrefixes(input: string): string[] {
    const prefixes: string[] = [];

    for (const entry of input.split(/[,\n]/).map(e => e.trim()).filter(e => e.length > 0)) {
        // v3 took a regex; its leading literal part, such as com.unity.template.3d, is matched as an id prefix
        const prefix = /^[\w.-]+/.exec(entry)?.[0];

        if (!prefix) {
            throw new Error(`Invalid template name: ${entry}. Use a template id such as com.unity.template.3d.`);
        }

        if (prefix !== entry) {
            core.warning(`Template patterns are no longer supported; matching templates that start with ${prefix}.`);
        }

        prefixes.push(prefix);
    }

    return prefixes;
}

/**
 * Pick the template for the first prefix that matches: an exact id first, then the first id that starts with it.
 * @param ids The available template ids, in the order they were listed.
 * @param prefixes The template id prefixes, in order of preference.
 * @returns The matching template id, or undefined when no prefix matches.
 */
export function MatchTemplate(ids: string[], prefixes: string[]): string | undefined {
    for (const prefix of prefixes) {
        const id = ids.find(i => i === prefix) ?? ids.find(i => i.startsWith(prefix));

        if (id) {
            return id;
        }
    }

    return undefined;
}

/**
 * Get the ids of the project templates the official Unity CLI offers for an editor version.
 * @param cli The official Unity CLI.
 * @param unityEditor The Unity Editor the project is created with.
 * @returns The template ids, in the order they were listed.
 * @throws If the templates could not be listed.
 */
export async function ListTemplates(cli: UnityCli, unityEditor: UnityEditor): Promise<string[]> {
    const templates = await cli.ExecJson<UnityTemplate[]>(['templates', 'list', '--editor', unityEditor.version.version, '--non-interactive']);
    return (templates ?? [])
        // entries without a type, such as 7000.0's 3d and 2d at version 0.0.0, are the Hub's blank projects, not template packages
        .filter(t => !!t.type)
        .map(t => t.name || t.id)
        .filter((id): id is string => !!id);
}

/**
 * Get a list of the project templates bundled with a Unity Editor, for editors the official Unity CLI cannot create projects with.
 * @param unityEditor The Unity Editor to look in.
 * @returns The full paths of the available template packages.
 */
export function GetBundledTemplates(unityEditor: UnityEditor): string[] {
    const editorRoot = path.dirname(unityEditor.editorPath);
    const templateDir = process.platform === 'darwin'
        ? path.join(path.dirname(editorRoot), 'Resources', 'PackageManager', 'ProjectTemplates')
        : path.join(editorRoot, 'Data', 'Resources', 'PackageManager', 'ProjectTemplates');

    core.debug(`Looking for templates in: ${templateDir}`);

    if (!fs.existsSync(templateDir) || !fs.statSync(templateDir).isDirectory()) {
        return [];
    }

    const templates: string[] = [];

    for (const entry of fs.readdirSync(templateDir, { withFileTypes: true })) {
        if (entry.isFile() && (entry.name.endsWith('.tgz') || entry.name.endsWith('.tar.gz'))) {
            templates.push(path.join(templateDir, entry.name));
        }
    }

    return templates;
}

/**
 * Get the template id of a bundled template package.
 * @param templatePath The template package path, such as `.../com.unity.template.3d-1.2.3.tgz`.
 * @returns The template id, such as `com.unity.template.3d`.
 */
export function GetBundledTemplateId(templatePath: string): string {
    return path.basename(templatePath).replace(/(?:-\d+\.\d+\.\d+[\w.-]*?)?\.(?:tgz|tar\.gz)$/, '');
}
