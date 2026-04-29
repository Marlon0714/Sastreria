---
description: "Generate a smart commit message following conventional commits standard. Use when: creating a commit message, writing git commit, summarizing staged changes for commit."
agent: "agent"
argument-hint: "Optional: previous commit message or context about what changed"
tools: [read, search, execute]
---

Generate a smart commit message for the current staged changes.

## Steps

### 1. Inspect staged changes
Run this to see what's staged:
```
git diff --cached --name-status
git diff --cached --stat
```
If nothing is staged, run `git status --short` to understand the full working tree.

### 2. Analyze changes by layer
Group files into categories:
- **feat**: new user-facing functionality
- **fix**: bug corrections
- **chore**: setup, config, dependencies, tooling
- **refactor**: restructuring without behavior change
- **test**: adding or fixing tests
- **ci**: CI/CD pipeline changes
- **style**: lint/format only
- **docs**: documentation only
- **perf**: performance improvements
- **revert**: reverting a commit

### 3. Identify scope from files changed
Scopes for this project:
`clients` | `schedule` | `pricing` | `navigation` | `sync` | `db` | `shared` | `config` | `hooks` | `ci`

Pick the most representative scope. If multiple scopes, pick the dominant one.

### 4. Pick the gitmoji

Use the emoji that best matches the **intent** of the change, not just the prefix.
Reference: https://gitmoji.dev

**Primary prefix → emoji mapping:**

| Prefix | Default emoji | Code | When to override |
|--------|--------------|------|------------------|
| feat | ✨ | `:sparkles:` | 💥 if breaking change, 📱 if mobile UI, 🛂 if auth/roles |
| fix | 🐛 | `:bug:` | 🚑️ if critical hotfix, 🩹 if non-critical, 🚨 if lint warning |
| chore | 🔧 | `:wrench:` | 🔨 if dev script, 📌 if pinning deps, 🙈 if .gitignore |
| refactor | ♻️ | `:recycle:` | 🎨 if structure/format, ⚰️ if removing dead code, 🗑️ if deprecating |
| test | ✅ | `:white_check_mark:` | 🧪 if adding a **failing** test intentionally |
| ci | 👷 | `:construction_worker:` | 💚 if fixing CI build |
| style | 🎨 | `:art:` | 💄 if UI/CSS files, ✏️ if typo only |
| docs | 📝 | `:memo:` | 📄 if license, 💡 if inline code comments |
| perf | ⚡️ | `:zap:` | — |
| revert | ⏪️ | `:rewind:` | — |
| build | 📦️ | `:package:` | ⬆️ if upgrading deps, ⬇️ if downgrading, ➕ if adding dep, ➖ if removing dep |

**Other useful emojis to pick freely:**

| Emoji | Code | Use for |
|-------|------|---------|
| 🎉 | `:tada:` | Begin a project (first commit) |
| 🔒️ | `:lock:` | Security / privacy fix |
| 🏗️ | `:building_construction:` | Architectural changes |
| 🗃️ | `:card_file_box:` | Database-related changes |
| 🏷️ | `:label:` | Add or update types (TypeScript) |
| 🌱 | `:seedling:` | Add or update seed/mock data |
| 🦺 | `:safety_vest:` | Validation logic |
| ✈️ | `:airplane:` | Offline support improvements |
| 🚸 | `:children_crossing:` | UX improvements |
| 🔀 | `:twisted_rightwards_arrows:` | Merge branches |
| 👔 | `:necktie:` | Business logic |
| 🧱 | `:bricks:` | Infrastructure changes |

For security-related commits add 🔒️ `:lock:` regardless of prefix.

### 5. Generate commit message

**Format:**
```
<prefix>(<scope>): <emoji> <imperative description in English>
```

**Rules:**
- Max 72 characters total (emoji counts as 2 chars)
- Description in English, imperative mood ("add", "fix", "implement" — NOT "added", "fixing")
- No period at the end
- Emoji goes between the colon-space and the description
- If multiple logical changes, generate one message per logical group

**Examples:**
```
feat(clients): ✨ implement offline-first client and measurement repositories
feat(clients): 🏷️ add TypeScript types for measurement domain
chore(ci): 🔧 add lint step and pre-push validation hook
chore(config): ⬆️ upgrade expo-sqlite to v16
fix(clients): 🐛 replace Array<T> syntax with T[] to fix lint warnings
fix(db): 🚑️ critical fix for migration idempotency check
test(clients): ✅ add unit tests for useClientList and schema validation
refactor(db): ♻️ extract migration runner to separate module
refactor(clients): 🎨 improve folder structure for hooks
ci(pipeline): 💚 fix failing CI build on ubuntu-latest
```

### 6. Output format
Return ONLY the commit message(s), one per line, ready to copy-paste.
If there are multiple logical groups, number them:
```
Option 1 (all in one):
feat(clients): ✨ implement block 2 flow with repositories, hooks and screens

Option 2 (split by layer):
1. feat(db): ✨ add ClientRepositoryImpl and MeasurementRepositoryImpl
2. feat(clients): ✨ add hooks and screens for client and measurement flow
3. chore(ci): 🔧 add lint pipeline and git quality hooks
```
Recommend which option is better and why.
