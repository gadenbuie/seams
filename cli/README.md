# @grrrck/seams

The seams CLI: optional commands for navigating and checking seams documentation.

seams is a set of conventions and agent skills for building software with coding agents.
The CLI installs the skills into a project and runs the project's mechanical checks.
You do not need the CLI to use seams, but it makes both easier.

## Start a project

Run this in your project:

```sh
npx @grrrck/seams init
```

The command installs the bundled skills and hands adoption to your agent, which walks you through the rest.

## Commands

| Command    | What it does                                                                    |
| ---------- | ------------------------------------------------------------------------------- |
| `check`    | Run the project's mechanical checks                                             |
| `doctor`   | Report the seams setup state of the project                                     |
| `find`     | Search the project's documents for text                                         |
| `impact`   | Report documents that name or link to paths                                     |
| `init`     | Install the seams skills and hand adoption to the agent                         |
| `install`  | Install the bundled skills (today: exactly `seams skills install`)              |
| `list`     | List the documents in the project's documentation homes                         |
| `new`      | Create a new proposal, plan, or overview                                        |
| `read`     | Read a whole document, one section, or a line range                             |
| `reconcile`| Collect bounded reconciliation evidence since a revision, without state changes |
| `schema`   | Print the bundled manifest JSON Schema                                          |
| `skills`   | Inspect and install the bundled skills                                          |

Global flags: `--json`, `--help`, `--version`.

The CLI needs Node.js 22.20 or later.

## Documentation

The guide and design documents live at [pkg.garrickadenbuie.com/seams](https://pkg.garrickadenbuie.com/seams/).

## License

[MIT](https://github.com/gadenbuie/seams/blob/main/LICENSE)
