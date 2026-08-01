# Book site

A simple static website for sharing your book chapter by chapter with friends. Chapters live as Markdown files — the site builds them into readable pages and deploys to GitHub Pages.

## Quick start (local preview)

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:4321/book-site/`).

## Import from Google Docs (whole manuscript)

If your Google Doc uses `Chapter 1`, `Chapter 2`, etc. on their own lines:

1. In Google Docs: **File → Download → Plain Text (.txt)**
2. Save the file as `input/manuscript.txt`
3. Run:

```bash
npm run ingest
```

This splits the file into `src/content/chapters/01.md`, `02.md`, etc. with the same frontmatter format you use now.

Options:

```bash
npm run ingest -- path/to/export.txt     # custom input file
npm run ingest -- --dry-run              # preview without writing
npm run ingest -- --force                # overwrite even if unchanged
```

If a line looks like `Chapter 6: Approaching Island`, the title becomes `"Approaching Island"`. Lines with only `Chapter 1` keep `"Chapter 1"` as the title. Supported separators: `:`, `-`, `—`.

Re-running ingest keeps each chapter's existing `published: true/false` setting. Text before the first `Chapter 1` line is ignored.

## Add a chapter manually

1. Create a new file in `src/content/chapters/`, e.g. `02-the-letter.md`
2. Add frontmatter at the top:

```markdown
---
title: "The Letter"
chapter: 2
published: true
summary: "Optional one-line teaser for the table of contents."
---

Your chapter text starts here...
```

3. Set `published: false` to keep a draft hidden from readers.

Files are sorted by the `chapter` number in frontmatter, not the filename — but numbering filenames (`01-`, `02-`) helps you stay organized.

## Customize the book

Edit `src/config.ts`:

```ts
export const book = {
  title: "My Book",
  author: "Your Name",
  description: "A novel for friends to read online.",
};
```

## Publish to GitHub Pages

You do **not** need to give anyone access to your GitHub account. Create the repo and push from your machine:

### 1. Create a GitHub repository

- Go to [github.com/new](https://github.com/new)
- Name it `book-site` (or anything — update `base` in `astro.config.mjs` if you use a different name)
- Keep it public (required for free GitHub Pages) or private if you have GitHub Pro
- Do **not** initialize with a README (this repo already has one)

### 2. Update site URL

In `astro.config.mjs`, replace placeholders:

```js
site: "https://YOUR_GITHUB_USERNAME.github.io",
base: "/book-site", // repo name; use "/" if repo is YOUR_USERNAME.github.io
```

### 3. Push your code

```bash
git add .
git commit -m "Initial book site"
git remote add origin git@github.com:YOUR_GITHUB_USERNAME/book-site.git
git branch -M main
git push -u origin main
```

### 4. Enable GitHub Pages

1. Open your repo on GitHub → **Settings** → **Pages**
2. Under **Build and deployment**, set **Source** to **GitHub Actions**
3. After the workflow runs, your site will be live at `https://YOUR_GITHUB_USERNAME.github.io/book-site/`

## Releasing a new chapter

1. Add or update a `.md` file in `src/content/chapters/`
2. Commit and push to `main`
3. GitHub Actions rebuilds and deploys automatically (usually within a minute)

## Exporting from Google Docs

For each chapter:

1. Copy the chapter text from your Google Doc
2. Paste into a new `.md` file, or use **File → Download → Markdown** for one chapter at a time
3. Add the frontmatter block at the top

You may need to clean up extra blank lines or formatting after export — that's normal.
