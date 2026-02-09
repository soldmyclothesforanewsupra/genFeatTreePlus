const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "genFeatTreePlus.config.json");

/** @param {string} p */
const toPosix = (p) => p.replace(/\\/g, "/");

/** @param {string} str */
const toPascalCase = (str) => str.replace(/(^|[_\-\s])(\w)/g, (_, __, c) => c.toUpperCase());

/** @param {string} str */
const toCamelCase = (str) => { const p = toPascalCase(str); return p.charAt(0).toLowerCase() + p.slice(1); };

/** @param {string} str */
const toSnakeCase = (str) => str.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\-\s]+/g, "_").toLowerCase();

/** @param {string} str */
const toLowerCase = (str) => str.toLowerCase();

/** @param {string} str */
const asIs = (str) => str;

const namingFunctions = {
    PascalCase: toPascalCase,
    camelCase: toCamelCase,
    snake_case: toSnakeCase,
    lowercase: toLowerCase,
    none: asIs,
};

/**
 * @param {string} convention
 * @returns {(str: string) => string}
 */
function getNamingFn(convention) {
    const fn = namingFunctions[convention];
    if (!fn) {
        const valid = Object.keys(namingFunctions).join(", ");
        console.error(`invalid folderCasing "${convention}". valid options: ${valid}`);
        process.exit(1);
    }
    return fn;
}

/**
 * @typedef {Object} Config
 * @property {string} basePath - Source directory (relative to script location)
 * @property {string} sourceRoot - Path prefix for $path values in output
 * @property {string} outputFile - Output JSON filename
 * @property {string} projectName - Rojo project name
 * @property {string[]} blacklistedDirs - Subdirectories to skip (relative to basePath)
 * @property {string} fileExtension - File extension to scan for
 * @property {string[]} serverKeywords - Substrings that route files to serverRoot
 * @property {string[]} promotedNames - Filenames that promote their parent folder (e.g. "init")
 * @property {string[]} compoundNames - Filenames prefixed with parent folder name
 * @property {string} [folderCasing] - Casing for generated names: PascalCase, camelCase, snake_case, lowercase, UPPERCASE, kebab-case, none (default: PascalCase)
 * @property {string[]} sharedRoot - Key path to shared root node in tree
 * @property {string[]} serverRoot - Key path to server root node in tree
 */

/** @returns {Config} */
function loadConfig() {
    if (!fs.existsSync(CONFIG_PATH)) {
        console.error(`config not found: ${CONFIG_PATH}`);
        process.exit(1);
    }
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
}

/**
 * @param {Record<string, any>} obj
 * @param {string[]} keys
 * @returns {Record<string, any>}
 */
const resolveKeyPath = (obj, keys) => keys.reduce((acc, k) => acc[k], obj);

/** Find an existing key in obj matching `key` case-insensitively, or return `key` as-is. */
const findKey = (obj, key) =>
    Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase()) ?? key;

/**
 * @param {string} dir
 * @param {string} ext
 * @param {Set<string>} blacklist
 * @param {string[]} [results]
 * @returns {string[]}
 */
function walk(dir, ext, blacklist, results = []) {
    for (const entry of fs.readdirSync(dir, {
            withFileTypes: true
        })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!blacklist.has(toPosix(full))) walk(full, ext, blacklist, results);
        } else if (entry.name.endsWith(ext)) {
            results.push(full);
        }
    }
    return results;
}

function main() {
    const config = loadConfig();
    const basePath = path.resolve(__dirname, config.basePath);

    if (!fs.existsSync(basePath)) {
        console.error(`base path not found: ${basePath}`);
        process.exit(1);
    }

    const blacklist = new Set(
        config.blacklistedDirs.map((d) => toPosix(path.join(basePath, d)))
    );
    const promotedSet = new Set(config.promotedNames);
    const compoundSet = new Set(config.compoundNames);
    const claimedFolders = new Set();

    const base = { name: config.projectName, tree: config.tree };

    const output = {
        name: base.name,
        tree: structuredClone(base.tree),
    };

    const sharedRoot = resolveKeyPath(output.tree, config.sharedRoot);
    const serverRoot = resolveKeyPath(output.tree, config.serverRoot);

    const nameFn = getNamingFn(config.folderCasing ?? "PascalCase");

    for (const filepath of walk(basePath, config.fileExtension, blacklist)) {
        const parts = path.relative(basePath, filepath).split(path.sep);
        const filename = path.basename(filepath, config.fileExtension);
        const lower = filename.toLowerCase();

        const isServer = config.serverKeywords.some((kw) => lower.includes(kw));
        const isPromoted = promotedSet.has(lower);

        const folders = parts.slice(0, -1).map(nameFn);
        const parentName = folders.at(-1) ?? "";
        const folderKey = folders.join("/");

        const name = isPromoted ?
            parentName :
            compoundSet.has(lower) ?
            parentName + nameFn(filename) :
            filename;

        const $path = toPosix(
            path.join(config.sourceRoot, ...parts.slice(0, isPromoted ? -1 : parts.length))
        );

        const root = isServer ? serverRoot : sharedRoot;

        if (isPromoted) {
            const parent = folders.slice(0, -1).reduce((acc, part) => {
                const k = findKey(acc, part);
                acc[k] ??= {
                    $className: "Folder"
                };
                return acc[k];
            }, root);
            parent[name] = {
                $path
            };
            claimedFolders.add(folderKey);
            continue;
        }

        if (claimedFolders.has(folderKey)) continue;

        let current = root;
        for (const part of folders) {
            const k = findKey(current, part);
            current[k] ??= {
                $className: "Folder"
            };
            current = current[k];
        }
        current[name] = {
            $path
        };
    }

    fs.writeFileSync(config.outputFile, JSON.stringify(output, null, 2));
    console.log(`${config.outputFile} generated`);
}

main();
