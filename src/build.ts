import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

interface PostMeta {
  title: string;
  date: Date;
  tags?: string[];
  draft?: boolean;
}

interface Post {
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

async function getPosts(): Promise<Post[]> {
  const files = await fs.readdir(POSTS_DIR);
  const posts: Post[] = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;

    const content = await fs.readFile(path.join(POSTS_DIR, file), "utf-8");
    const { data, content: markdown } = matter(content);
    const meta = data as PostMeta;

    if (meta.draft) continue;

    const slug = file.replace(".md", "");
    const html = await marked(markdown);

    posts.push({ slug, meta, content: markdown, html });
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

  // Get and build posts
  const posts = await getPosts();
  console.log(`Found ${posts.length} posts`);

  await Promise.all(posts.map((post) => buildPost(post, postTemplate)));
  await buildIndex(posts, indexTemplate);
  await copyStyles();

  console.log("Build complete!");
}

build().catch(console.error);
