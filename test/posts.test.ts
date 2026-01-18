import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parsePost,
  filterPostsForIndex,
  buildPost,
  Post,
} from "../src/build.js";
import { existsSync, mkdirSync, rmSync } from "fs";
import { readFileSync } from "fs";
import { execSync } from "child_process";

describe("parsePost", () => {
  it("parses a valid non-draft post", async () => {
    const filename = "2024-01-15-hello-world.md";
    const content = `---
title: "Hello World"
date: 2024-01-15
tags: [intro]
---

Welcome to my blog!`;

    const post = await parsePost(filename, content);

    expect(post).not.toBeNull();
    expect(post?.slug).toBe("2024-01-15-hello-world");
    expect(post?.meta.title).toBe("Hello World");
    expect(post?.html).toContain("Welcome to my blog!");
  });

  it("parses a draft post and includes draft flag in meta", async () => {
    const filename = "2024-01-20-draft-post.md";
    const content = `---
title: "Draft Post"
date: 2024-01-20
draft: true
---

This is a draft.`;

    const post = await parsePost(filename, content);

    expect(post).not.toBeNull();
    expect(post?.slug).toBe("2024-01-20-draft-post");
    expect(post?.meta.draft).toBe(true);
  });

  it("treats posts without draft field as non-draft", async () => {
    const filename = "2024-01-25-no-draft-field.md";
    const content = `---
title: "No Draft Field"
date: 2024-01-25
---

Content here.`;

    const post = await parsePost(filename, content);

    expect(post).not.toBeNull();
    expect(post?.meta.draft).toBeFalsy();
  });
});

describe("filterPostsForIndex", () => {
  it("excludes draft posts from index", () => {
    const posts: Post[] = [
      {
        slug: "post-1",
        meta: { title: "Post 1", date: new Date("2024-01-15") },
        content: "",
        html: "",
      },
      {
        slug: "draft-1",
        meta: { title: "Draft 1", date: new Date("2024-01-16"), draft: true },
        content: "",
        html: "",
      },
      {
        slug: "post-2",
        meta: { title: "Post 2", date: new Date("2024-01-17") },
        content: "",
        html: "",
      },
    ];

    const filtered = filterPostsForIndex(posts);

    expect(filtered).toHaveLength(2);
    expect(filtered.some((p) => p.meta.draft)).toBe(false);
  });

  it("maintains newest-first sort order after filtering", () => {
    const posts: Post[] = [
      {
        slug: "old",
        meta: { title: "Old", date: new Date("2024-01-01") },
        content: "",
        html: "",
      },
      {
        slug: "draft",
        meta: { title: "Draft", date: new Date("2024-01-15"), draft: true },
        content: "",
        html: "",
      },
      {
        slug: "new",
        meta: { title: "New", date: new Date("2024-01-10") },
        content: "",
        html: "",
      },
    ];

    const filtered = filterPostsForIndex(posts);

    expect(filtered[0].slug).toBe("new");
    expect(filtered[1].slug).toBe("old");
  });
});

describe("buildPost", () => {
  const TEST_OUTPUT_DIR = "test-output";

  beforeEach(() => {
    // Create test output directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
    mkdirSync(TEST_OUTPUT_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test output directory
    if (existsSync(TEST_OUTPUT_DIR)) {
      rmSync(TEST_OUTPUT_DIR, { recursive: true });
    }
  });

  it("should replace all occurrences of {{title}} in template", async () => {
    // ARRANGE
    const mockPost: Post = {
      slug: "test-post",
      meta: {
        title: "Test Title",
        date: new Date("2026-01-17T12:00:00"),
        tags: ["test"],
        draft: false,
      },
      content: "# Test content",
      html: "<h1>Test content</h1>",
    };

    const templateWithMultipleTitles = `<head><title>{{title}}</title></head>
<body><h1>{{title}}</h1></body>`;

    // ACT
    await buildPost(mockPost, templateWithMultipleTitles, TEST_OUTPUT_DIR);

    // ASSERT
    const generatedHtml = readFileSync(
      `${TEST_OUTPUT_DIR}/test-post.html`,
      "utf-8"
    );
    expect(generatedHtml).not.toContain("{{title}}");
    expect(generatedHtml).toContain("<title>Test Title</title>");
    expect(generatedHtml).toContain("<h1>Test Title</h1>");
  });

  it("should replace all occurrences of all template variables", async () => {
    // ARRANGE
    const mockPost: Post = {
      slug: "multi-var-post",
      meta: {
        title: "Multi Variable Test",
        date: new Date("2026-01-17T12:00:00"),
        tags: ["test"],
        draft: false,
      },
      content: "Test content",
      html: "<p>Test content</p>",
    };

    const template = `<title>{{title}}</title>
<h1>{{title}}</h1>
<time>{{date}}</time>
<meta name="date" content="{{date}}">
<div>{{content}}</div>`;

    // ACT
    await buildPost(mockPost, template, TEST_OUTPUT_DIR);

    // ASSERT
    const generatedHtml = readFileSync(
      `${TEST_OUTPUT_DIR}/multi-var-post.html`,
      "utf-8"
    );
    expect(generatedHtml).not.toContain("{{title}}");
    expect(generatedHtml).not.toContain("{{date}}");
    expect(generatedHtml).not.toContain("{{content}}");
    expect(generatedHtml).toContain("<title>Multi Variable Test</title>");
    expect(generatedHtml).toContain("<h1>Multi Variable Test</h1>");
    expect(generatedHtml).toContain("<time>January 17, 2026</time>");
    expect(generatedHtml).toContain(
      '<meta name="date" content="January 17, 2026">'
    );
  });

  it("should replace single occurrence of template variables", async () => {
    // ARRANGE
    const mockPost: Post = {
      slug: "simple-post",
      meta: {
        title: "Simple Post",
        date: new Date("2026-01-17T12:00:00"),
        tags: [],
        draft: false,
      },
      content: "Content",
      html: "<p>Content</p>",
    };

    const simpleTemplate = `<title>{{title}}</title>
<time>{{date}}</time>
<div>{{content}}</div>`;

    // ACT
    await buildPost(mockPost, simpleTemplate, TEST_OUTPUT_DIR);

    // ASSERT
    const generatedHtml = readFileSync(
      `${TEST_OUTPUT_DIR}/simple-post.html`,
      "utf-8"
    );
    expect(generatedHtml).toContain("<title>Simple Post</title>");
    expect(generatedHtml).toContain("<time>January 17, 2026</time>");
    expect(generatedHtml).toContain("<div><p>Content</p></div>");
  });
});

describe("build integration", () => {
  it("builds draft posts to HTML files", () => {
    // Rebuild to ensure fresh output
    execSync("pnpm run build", { stdio: "inherit" });

    // Draft post should have HTML file
    expect(existsSync("docs/2026-01-17-l-combinator.html")).toBe(true);
  });

  it("excludes draft posts from index", () => {
    const indexHtml = readFileSync("docs/index.html", "utf-8");

    // Non-draft post should be in index
    expect(indexHtml).toContain("Hello World");

    // Draft post should NOT be in index
    expect(indexHtml).not.toContain("L Combinator");
  });
});
