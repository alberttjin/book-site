#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const defaultInput = path.join(projectRoot, "input", "manuscript.txt");
const defaultOutput = path.join(projectRoot, "src/content/chapters");

// Chapter 6
// Chapter 6: Approaching Island
// Chapter 6 - Approaching Island
// Chapter 6 — Approaching Island
const CHAPTER_MARKER =
  /^Chapter\s+(\d+)\s*(?:[:.\-–—]\s*(.+))?\s*$/i;

function usage() {
  console.log(`Usage: npm run ingest -- [options] [input-file]

Split a plain-text Google Docs export into chapter markdown files.

Options:
  --out <dir>       Output directory (default: src/content/chapters)
  --dry-run         Print what would be written without saving
  --force           Overwrite existing chapter files
  -h, --help        Show this help

Input:
  Defaults to input/manuscript.txt if no file is given.

Expected format:
  Chapter 1
  ...chapter text...

  Chapter 6: Approaching Island
  ...chapter text...

Titles:
  If a line includes a title after Chapter N, it becomes the chapter title.
  Supported separators: colon, hyphen, en dash, em dash.

  Chapter 6: Approaching Island   -> title: "Approaching Island"
  Chapter 1                       -> title: "Chapter 1"
`);
}

function parseArgs(argv) {
  const options = {
    input: defaultInput,
    out: defaultOutput,
    dryRun: false,
    force: false,
  };

  const positional = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--force") {
      options.force = true;
    } else if (arg === "--out") {
      options.out = path.resolve(argv[i += 1] ?? "");
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional[0]) {
    options.input = path.resolve(positional[0]);
  }

  return options;
}

function normalizeText(text) {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .trim();
}

function normalizeLine(line) {
  return line.replace(/\u00a0/g, " ").trim();
}

function parseChapterTitle(chapterNumber, rawTitle) {
  const cleaned = rawTitle?.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return `Chapter ${chapterNumber}`;
  }

  // Handle "Chapter 6: Approaching Island" if the whole heading was captured.
  const embedded = cleaned.match(/^Chapter\s+\d+\s*[:.\-–—]\s*(.+)$/i);
  if (embedded) {
    return embedded[1].trim();
  }

  return cleaned;
}

function parseExistingPublished(outDir) {
  const publishedByChapter = new Map();

  if (!fs.existsSync(outDir)) {
    return publishedByChapter;
  }

  for (const file of fs.readdirSync(outDir)) {
    if (!file.endsWith(".md")) continue;

    const content = fs.readFileSync(path.join(outDir, file), "utf8");
    const chapterMatch = content.match(/^chapter:\s*(\d+)\s*$/m);
    const publishedMatch = content.match(/^published:\s*(true|false)\s*$/m);

    if (chapterMatch && publishedMatch) {
      publishedByChapter.set(
        Number(chapterMatch[1]),
        publishedMatch[1] === "true",
      );
    }
  }

  return publishedByChapter;
}

function splitChapters(text) {
  const lines = text.split("\n");
  const chapters = [];
  let current = null;
  let preamble = [];

  for (const line of lines) {
    const marker = normalizeLine(line).match(CHAPTER_MARKER);

    if (marker) {
      if (current) {
        chapters.push(current);
      }

      const chapterNumber = Number(marker[1]);
      const title = parseChapterTitle(chapterNumber, marker[2]);

      current = {
        chapter: chapterNumber,
        title,
        bodyLines: [],
      };
      continue;
    }

    if (current) {
      current.bodyLines.push(line);
    } else {
      preamble.push(line);
    }
  }

  if (current) {
    chapters.push(current);
  }

  return { chapters, preamble };
}

function formatChapterFile(chapter, published) {
  const body = chapter.bodyLines.join("\n").trim();
  const title = chapter.title.replace(/"/g, '\\"');

  return `---
title: "${title}"
chapter: ${chapter.chapter}
published: ${published}
---

${body}
`;
}

function padChapterNumber(n) {
  return String(n).padStart(2, "0");
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    usage();
    process.exit(1);
  }

  if (options.help) {
    usage();
    process.exit(0);
  }

  if (!fs.existsSync(options.input)) {
    console.error(`Input file not found: ${options.input}`);
    console.error("\nExport your Google Doc as Plain Text (.txt) and save it to:");
    console.error(`  ${defaultInput}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(options.input, "utf8");
  const text = normalizeText(raw);
  const { chapters, preamble } = splitChapters(text);

  if (chapters.length === 0) {
    console.error("No chapters found.");
    console.error('Expected lines like "Chapter 1", "Chapter 2", etc.');
    process.exit(1);
  }

  const numbers = chapters.map((chapter) => chapter.chapter);
  const duplicates = numbers.filter(
    (num, index) => numbers.indexOf(num) !== index,
  );
  if (duplicates.length > 0) {
    console.error(
      `Duplicate chapter numbers found: ${[...new Set(duplicates)].join(", ")}`,
    );
    process.exit(1);
  }

  chapters.sort((a, b) => a.chapter - b.chapter);

  const existingPublished = parseExistingPublished(options.out);

  if (preamble.some((line) => line.trim())) {
    console.warn(
      "Warning: text before the first chapter marker will be ignored.",
    );
  }

  if (!options.dryRun && !fs.existsSync(options.out)) {
    fs.mkdirSync(options.out, { recursive: true });
  }

  let written = 0;
  let skipped = 0;

  for (const chapter of chapters) {
    const filename = `${padChapterNumber(chapter.chapter)}.md`;
    const outputPath = path.join(options.out, filename);
    const published =
      existingPublished.get(chapter.chapter) ??
      true;
    const content = formatChapterFile(chapter, published);

    if (fs.existsSync(outputPath) && !options.force && !options.dryRun) {
      const existing = fs.readFileSync(outputPath, "utf8");
      if (existing === content) {
        console.log(`Unchanged: ${filename}`);
        skipped += 1;
        continue;
      }
    }

    if (options.dryRun) {
      console.log(
        `Would write ${filename} — "${chapter.title}" (${chapter.bodyLines.join("\n").trim().length} chars, published: ${published})`,
      );
    } else {
      fs.writeFileSync(outputPath, content, "utf8");
      console.log(`Wrote ${filename} — "${chapter.title}"`);
    }

    written += 1;
  }

  console.log(
    `\nDone. ${written} chapter file(s) ${options.dryRun ? "would be written" : "processed"}, ${skipped} unchanged.`,
  );
}

main();
