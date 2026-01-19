# bpblog

A minimal static blog generator built with TypeScript. Converts Markdown posts with YAML frontmatter into static HTML pages.

## Features

- Simple Markdown-based posts with YAML frontmatter
- Draft support (builds HTML but hides from index for direct URL preview)
- Automatic date sorting (newest first)
- Minimal template system with `{{variable}}` syntax
- GitHub Pages ready output
- Automatic deployment via GitHub Actions
- Comprehensive test coverage with Vitest

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

## Development Mode

For active development, use the dev mode which provides automatic rebuilding:

```bash
pnpm run dev
```

This starts a comprehensive development environment:

- Watches for changes in `src/`, `posts/`, and `templates/` directories
- Automatically recompiles TypeScript when source files change
- Regenerates the site when posts or templates change
- Serves the site at http://localhost:3000
- Debounced rebuilds (300ms) to avoid excessive regeneration

Press Ctrl+C to stop the dev server.

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

| Field   | Required | Description                                                       |
| ------- | -------- | ----------------------------------------------------------------- |
| `title` | Yes      | Post title displayed on the page                                  |
| `date`  | Yes      | Publication date (YYYY-MM-DD)                                     |
| `tags`  | No       | Array of tags for categorization                                  |
| `draft` | No       | Set to `true` to hide from index (still accessible by direct URL) |

### URL Slugs

The filename becomes the URL slug:

- `posts/2024-01-15-hello-world.md` → `docs/2024-01-15-hello-world.html`

## Available Scripts

| Command                 | Description                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| `pnpm run build`        | Compile TypeScript and generate static site                                 |
| `pnpm run dev`          | Dev mode with file watching and auto-rebuild server (http://localhost:3000) |
| `pnpm run serve`        | Serve `docs/` directory locally                                             |
| `pnpm test`             | Run tests in watch mode                                                     |
| `pnpm run test:run`     | Run tests once (CI mode)                                                    |
| `pnpm run lint`         | Run oxlint on source files                                                  |
| `pnpm run lint:fix`     | Run oxlint with auto-fix                                                    |
| `pnpm run format`       | Format all files with Prettier                                              |
| `pnpm run format:check` | Check if files are formatted                                                |

## Project Structure

```
├── src/
│   └── build.ts          # Build script
├── test/                 # Vitest test files
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

### Testing

The project uses [Vitest](https://vitest.dev/) as its testing framework:

- **Test files**: Located in the `test/` directory
- **Watch mode**: `pnpm test` runs tests continuously as you make changes
- **CI mode**: `pnpm run test:run` runs tests once for CI pipelines
- **Coverage**: Tests cover post parsing, draft filtering, template variable replacement, and build integration

### Code Quality

- **Linting**: [oxlint](https://oxc-project.github.io/) for fast TypeScript linting
- **Formatting**: [Prettier](https://prettier.io/) for consistent code style

### Pre-commit Hooks

Staged files are automatically formatted before commits via husky + lint-staged.

## Deployment

Push to the `main` branch to trigger automatic deployment to GitHub Pages via GitHub Actions.

## License

MIT
