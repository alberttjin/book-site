import { defineCollection, z } from "astro:content";

const chapters = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    chapter: z.number(),
    published: z.boolean().default(true),
    summary: z.string().optional(),
  }),
});

export const collections = { chapters };
