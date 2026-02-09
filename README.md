# genFeatTreePlus

A Rojo project tree generator for feature-first programming. Scans your source directory and builds a `default.project.json` automatically. A fork of [leifstout/genFeatureTree](https://github.com/leifstout/genFeatureTree/).

## Usage
Place in a folder that's in the same location as your rojo project and run this to create a brand new project.json file!
```bash
npm start genFeatTreePlus.js
```

## Configuration
All options live in `genFeatTreePlus.config.json`.

| Key               | Type           | Purpose                                                                               |
| ----------------- | -------------- | ------------------------------------------------------------------------------------- |
| `basePath`        | `string`       | Source directory (relative to script location)                                        |
| `sourceRoot`      | `string`       | Prefix for `$path` values in the output (e.g. `"src"`)                                |
| `outputFile`      | `string`       | Where to write the generated JSON                                                     |
| `projectName`     | `string`       | Rojo project name                                                                     |
| `blacklistedDirs` | `string[]`     | Subdirectories to skip (relative to `basePath`)                                       |
| `fileExtension`   | `string`       | File extension to scan for                                                            |
| `serverKeywords`  | `string[]`     | Substrings that route a file to the server root                                       |
| `promotedNames`   | `string[]`     | Filenames (like `"init"`) that promote their parent folder                            |
| `compoundNames`   | `string[]`     | Filenames (like `"server"`, `"client"`) that get prefixed with the parent folder name |
| `sharedRoot`      | `string[]`     | Key path into the tree where shared files are placed                                  |
| `serverRoot`      | `string[]`     | Key path into the tree where server files are placed                                  |
| `tree`            | `object`       | The base Rojo tree structure                                                          |
