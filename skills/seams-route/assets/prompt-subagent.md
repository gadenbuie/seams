# Subagent prompt template

Point the subagent at files. Do not paste their contents or restate their rules. Use absolute paths:
`<skill>` is this skill's directory, and `<skills>` is the directory that holds all the seams
skills. Fill in only the values the role uses, and add notes only for what is specific to this task.

```markdown
You are the <implementer | fixer | reviewer | lander> for task <ref>: <title>.

Read these files first and follow them:
- <skill>/assets/roles/<implement.md | fix.md | reviewer.md | land.md>
- <skill>/assets/roles/<review-roborev.md | review-roborev-hook.md | review-subagent.md>  (implementer, fixer)
- <skill>/assets/roles/triage.md  (implementer, fixer)
- <skills>/seams-track/references/<kata.md | github.md | markdown.md>, or <your tracker note>  (implementer, fixer)
- <skills>/seams-work/SKILL.md, section "When you meet a question"  (implementer, fixer)
- <skills>/seams-work/references/documentation.md  (implementer, fixer, reviewer of documentation)

Then read the task (<`kata show <ref>` | `gh issue view <n> --json title,body,comments` | path#heading>)
and: <the canon sections that govern it (docs/design/invariants.md, principles.md), the repo's agent
instructions, the affected user documents and design overviews, other paths>. Do not read draft
proposals or plans unless the task links them.

Values:
- Worktree: <absolute path>
- Task branch: <branch>
- Base: <sha>   (implementer, fixer, reviewer: the review unit is <base>..HEAD)
- Main checkout: <absolute path>
- Setup: <command | none>
- Targeted tests: <commands>
- Commit trailer: <e.g. Refs: project#ref>
- Root: <root ref>
- Tracker identity: <e.g. KATA_TEAMMATE=<name>, KATA_INBOX_USER=<actor>/<name>, or none>   (implementer, fixer)
- Reviewer tier: <tier>   (review-subagent.md only)
- Integration worktree / branch: <path> / <branch>   (lander only; for a container child, the slice worktree and branch)
- Task worktree: <absolute path>   (lander only)
- Tracker file in git: <path | none>   (lander only)

<Findings or fix specs (fixer only), and task-specific notes, if any.>
```
