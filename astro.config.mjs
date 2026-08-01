import { defineConfig } from "astro/config";

// For a project site: https://YOUR_USERNAME.github.io/book-site/
// Change `site` and `base` to match your GitHub username and repo name.
// For a user site (repo named YOUR_USERNAME.github.io), set base to "/".
export default defineConfig({
  site: "https://alberttjin.github.io",
  base: "/book-site",
  output: "static",
});
