import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { parsePost, filterPostsForIndex } from "../src/build.js";
import { existsSync, copyFileSync, rmSync } from "fs";
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
    const posts = [
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
    const posts = [
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
describe("build integration", () => {
  const DRAFT_FIXTURE = "test/fixtures/posts/test-draft-post.md";
  const PUBLISHED_FIXTURE = "test/fixtures/posts/test-published-post.md";
  const TEMP_DRAFT = "posts/test-draft-post.md";
  const TEMP_PUBLISHED = "posts/test-published-post.md";

  beforeEach(() => {
    // Copy test fixtures to posts directory for integration testing
    copyFileSync(DRAFT_FIXTURE, TEMP_DRAFT);
    copyFileSync(PUBLISHED_FIXTURE, TEMP_PUBLISHED);

    // Build with test fixtures
    execSync("pnpm run build", { stdio: "inherit" });
  });

  afterEach(() => {
    // Clean up temporary test posts
    try {
      if (existsSync(TEMP_DRAFT)) {
        rmSync(TEMP_DRAFT);
      }
    } catch {
      // File may have already been deleted
    }

    try {
      if (existsSync(TEMP_PUBLISHED)) {
        rmSync(TEMP_PUBLISHED);
      }
    } catch {
      // File may have already been deleted
    }

    // Clean up generated HTML files
    try {
      if (existsSync("docs/test-draft-post.html")) {
        rmSync("docs/test-draft-post.html");
      }
    } catch {
      // File may have already been deleted
    }

    try {
      if (existsSync("docs/test-published-post.html")) {
        rmSync("docs/test-published-post.html");
      }
    } catch {
      // File may have already been deleted
    }
  });

  it("builds draft posts to HTML files", () => {
    // Draft post should have HTML file (drafts are built, just not indexed)
    expect(existsSync("docs/test-draft-post.html")).toBe(true);
  });

  it("excludes draft posts from index", () => {
    const indexHtml = readFileSync("docs/index.html", "utf-8");

    // Published post should be in index
    expect(indexHtml).toContain("Test Published Post");

    // Draft post should NOT be in index
    expect(indexHtml).not.toContain("Test Draft Post");
  });
});
