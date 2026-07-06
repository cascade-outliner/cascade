# Copilot Commit Message Instructions

Use the following **Conventional Commits** format for all commit messages:

```text
<type>: <short summary>
```

## Types

Use one of these types only:

- `feat` – new feature
- `fix` – bug fix
- `docs` – documentation only
- `style` – formatting, no logic change
- `refactor` – code change that neither fixes a bug nor adds a feature
- `test` – adding or correcting tests
- `chore` – maintenance tasks

## Short summary

- **Required**. Use imperative, present tense (e.g. “add”, “fix”, “update”).
- Keep it concise (aim for ≤ 72 characters).
- No trailing period.

## Body (optional)

Add a blank line after the subject, then include bullets answering:

- Why is this change needed?
- What does it change?

## Footer (optional)

Use for breaking changes:

```text
BREAKING CHANGE: <what changed and how to migrate>
```

## Examples

```text
feat: add RSS feed generation

- Improves content discovery for readers
- Generates /rss.xml during build
```

```text
fix: correct canonical URL on post pages
```

```text
chore: bump next from 15.0.0 to 15.1.0
```

```text
refactor: simplify button variant logic

BREAKING CHANGE: removed "tertiary" button variant; use "ghost" instead
```
