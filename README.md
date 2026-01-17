# bpblog

A minimal static blog generator built with TypeScript. Converts Markdown posts with YAML frontmatter into static HTML pages.

## Features

- Simple Markdown-based posts with YAML frontmatter
- Draft support (exclude posts from build)
- Automatic date sorting (newest first)
- Minimal template system with `{{variable}}` syntax
- GitHub Pages ready output
- Automatic deployment via GitHub Actions

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- [pnpm](https://pnpm.io/) package manager

## Quick Start

```bash
# Install dependencies
pnpm install

# Build the site
pnpm run build

# Preview locally
pnpm run serve
```

## Creating Posts

Create a Markdown file in the `posts/` directory with YAML frontmatter:

```markdown
---
title: "Your Post Title"
date: 2024-01-15
tags: [tag1, tag2]
draft: false
---

Your Markdown content here...
```

### Frontmatter Fields

| Field   | Required | Description                         |
| ------- | -------- | ----------------------------------- |
| `title` | Yes      | Post title displayed on the page    |
| `date`  | Yes      | Publication date (YYYY-MM-DD)       |
| `tags`  | No       | Array of tags for categorization    |
| `draft` | No       | Set to `true` to exclude from build |

### URL Slugs

The filename becomes the URL slug:

- `posts/2024-01-15-hello-world.md` → `docs/2024-01-15-hello-world.html`

## Available Scripts

| Command                 | Description                                 |
| ----------------------- | ------------------------------------------- |
| `pnpm run build`        | Compile TypeScript and generate static site |
| `pnpm run dev`          | Watch mode for TypeScript compilation       |
| `pnpm run serve`        | Serve `docs/` directory locally             |
| `pnpm run lint`         | Run oxlint on source files                  |
| `pnpm run lint:fix`     | Run oxlint with auto-fix                    |
| `pnpm run format`       | Format all files with Prettier              |
| `pnpm run format:check` | Check if files are formatted                |

## Project Structure

```
├── src/
│   └── build.ts          # Build script
├── posts/                # Markdown blog posts
├── templates/            # HTML templates and CSS
│   ├── index.html        # Homepage template
│   ├── post.html         # Post template
│   └── styles.css        # Stylesheet
├── docs/                 # Generated output (GitHub Pages)
└── dist/                 # Compiled TypeScript
```

## Templates

Templates use simple `{{variable}}` replacement:

**Post template variables:**

- `{{title}}` - Post title
- `{{date}}` - Formatted date
- `{{content}}` - HTML content

**Index template variables:**

- `{{posts}}` - List of article links

## Development

### Code Quality

- **Linting**: [oxlint](https://oxc-project.github.io/) for fast TypeScript linting
- **Formatting**: [Prettier](https://prettier.io/) for consistent code style

### Pre-commit Hooks

Staged files are automatically formatted before commits via husky + lint-staged.

## Deployment

Push to the `main` branch to trigger automatic deployment to GitHub Pages via GitHub Actions.

## License

MIT
