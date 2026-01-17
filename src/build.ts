import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";
import { fileURLToPath } from "url";

export interface PostMeta {
  title: string;
  date: Date;
  tags?: string[];
  draft?: boolean;
}

export interface Post {
  slug: string;
  meta: PostMeta;
  content: string;
  html: string;
}

const POSTS_DIR = "posts";
const OUTPUT_DIR = "docs";
const TEMPLATES_DIR = "templates";

async function readTemplate(name: string): Promise<string> {
  return fs.readFile(path.join(TEMPLATES_DIR, `${name}.html`), "utf-8");
}

export async function parsePost(
  filename: string,
  fileContent: string
): Promise<Post | null> {
  if (!filename.endsWith(".md")) return null;
  const { data, content: markdown } = matter(fileContent);
  const meta = data as PostMeta;
  const slug = filename.replace(".md", "");
  const html = await marked(markdown);
  return { slug, meta, content: markdown, html };
}

export function filterPostsForIndex(posts: Post[]): Post[] {
  return posts
    .filter((post) => !post.meta.draft)
    .sort(
      (a, b) =>
        new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime()
    );
}

async function getPosts(): Promise<Post[]> {
  const files = await fs.readdir(POSTS_DIR);
  const posts: Post[] = [];

  for (const file of files) {
    const content = await fs.readFile(path.join(POSTS_DIR, file), "utf-8");
    const post = await parsePost(file, content);
    if (post) posts.push(post);
  }

  return posts.sort(
    (a, b) => new Date(b.meta.date).getTime() - new Date(a.meta.date).getTime()
  );
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function buildPost(post: Post, template: string): Promise<void> {
  const html = template
    .replace("{{title}}", post.meta.title)
    .replace("{{date}}", formatDate(post.meta.date))
    .replace("{{content}}", post.html);

  await fs.writeFile(path.join(OUTPUT_DIR, `${post.slug}.html`), html);
}

async function buildIndex(posts: Post[], template: string): Promise<void> {
  const postList = posts
    .map(
      (post) => `
    <article>
      <h2><a href="${post.slug}.html">${post.meta.title}</a></h2>
      <time datetime="${post.meta.date}">${formatDate(post.meta.date)}</time>
    </article>`
    )
    .join("\n");

  const html = template.replace("{{posts}}", postList);
  await fs.writeFile(path.join(OUTPUT_DIR, "index.html"), html);
}

async function copyStyles(): Promise<void> {
  try {
    const styles = await fs.readFile(
      path.join(TEMPLATES_DIR, "styles.css"),
      "utf-8"
    );
    await fs.writeFile(path.join(OUTPUT_DIR, "styles.css"), styles);
  } catch {
    // No styles file, skip
  }
}

async function build(): Promise<void> {
  console.log("Building site...");

  // Ensure output directory exists
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  // Load templates
  const [indexTemplate, postTemplate] = await Promise.all([
    readTemplate("index"),
    readTemplate("post"),
  ]);

  // Get all posts (including drafts)
  const allPosts = await getPosts();
  console.log(`Found ${allPosts.length} posts`);

  // Build ALL posts (including drafts)
  await Promise.all(allPosts.map((post) => buildPost(post, postTemplate)));

  // Index shows only non-drafts
  const indexPosts = filterPostsForIndex(allPosts);
  console.log(`Index will show ${indexPosts.length} non-draft posts`);
  await buildIndex(indexPosts, indexTemplate);

  await copyStyles();

  console.log("Build complete!");
}

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  build().catch(console.error);
}
