import { defineCollection, z } from "astro:content";

const posts = defineCollection({
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			published: z.date(),
			updated: z.date().optional(),
			draft: z.boolean().default(false),
			description: z.string().default(""),
			image: image().optional(),
			tags: z.array(z.string()).default([]),
			category: z.string().default("Etc"),
			// Lower number = shown first in the home "Pinned" rail.
			pinned: z.number().optional(),
		}),
});

const spec = defineCollection({ schema: z.object({}) });

export const collections = { posts, spec };
