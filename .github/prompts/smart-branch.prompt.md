---
description: "Generate a smart branch name following project conventions. Use when: creating a branch, starting a new feature, starting a bug fix, naming a branch."
agent: "agent"
argument-hint: "Task or feature description (e.g., 'add pricing catalog screen' or 'fix measurement history order')"
tools: [read, search]
---

Generate a smart branch name for the work described.

## Input
${input}

## Branch Naming Convention

**Format:**
```
<type>/<scope>-<short-description-kebab-case>
```

**Types:**
| Type | When to use |
|------|-------------|
| `feature/` | New functionality |
| `fix/` | Bug correction |
| `chore/` | Setup, config, tooling |
| `refactor/` | Code restructuring |
| `test/` | Adding tests only |
| `ci/` | CI/CD pipeline changes |

**Scopes for this project:**
`clients` | `schedule` | `pricing` | `navigation` | `sync` | `db` | `shared` | `config`

**Rules:**
- All lowercase, kebab-case (hyphens, no underscores or spaces)
- Max 50 characters total
- Short and descriptive, no filler words ("the", "a", "new")
- Scope is optional but recommended

**Examples:**
```
feature/clients-measurement-history
feature/schedule-daily-alterations-list
fix/db-migration-idempotency
chore/config-eslint-setup
test/clients-unit-hooks
```

## Steps

### 1. Understand the task
Analyze the input and determine:
- Type of work (feature, fix, chore, etc.)
- Which module/scope it affects
- Core action in 2-3 words

### 2. Check existing branches
```
git branch --list
```
Make sure the name doesn't conflict with an existing branch.

### 3. Output
Return:
```
Recommended: feature/clients-measurement-history

Alternatives:
- feature/clients-add-measurement-history
- feature/clients-history-screen

Command to create it:
git checkout develop && git checkout -b feature/clients-measurement-history
```
