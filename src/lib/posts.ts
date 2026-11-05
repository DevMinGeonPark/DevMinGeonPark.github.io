import { type CollectionEntry, getCollection } from "astro:content";

export type Post = CollectionEntry<"posts">;

export const postUrl = (slug: string) => `/posts/${slug}/`;

/** Published posts, newest first. Drafts are visible only in dev. */
export async function getPosts(): Promise<Post[]> {
	const posts = await getCollection(
		"posts",
		({ data }) => !import.meta.env.PROD || !data.draft,
	);
	return posts.sort(
		(a, b) => b.data.published.getTime() - a.data.published.getTime(),
	);
}

export const pinnedOf = (posts: Post[]) =>
	posts
		.filter((p) => p.data.pinned !== undefined)
		.sort((a, b) => (a.data.pinned ?? 0) - (b.data.pinned ?? 0));

export const categoriesOf = (posts: Post[]) => [
	...new Set(posts.map((p) => p.data.category)),
];

/** Compact, serializable shape shared with client scripts (terminal, palette). */
export type PostSummary = {
	slug: string;
	url: string;
	title: string;
	description: string;
	category: string;
	tags: string[];
	date: string;
	pinned: boolean;
	minutes: number;
};

export const toSummary = (p: Post): PostSummary => ({
	slug: p.slug,
	url: postUrl(p.slug),
	title: p.data.title,
	description: p.data.description,
	category: p.data.category,
	tags: p.data.tags,
	date: isoDate(p.data.published),
	pinned: p.data.pinned !== undefined,
	minutes: readingMinutes(p.body),
});

// ponytail: ~500 Korean chars/min heuristic, ignores code blocks vs prose.
export const readingMinutes = (body: string) =>
	Math.max(1, Math.round(body.replace(/\s/g, "").length / 500));

export const isoDate = (d: Date) => d.toISOString().slice(0, 10);
export const dotDate = (d: Date) => isoDate(d).replaceAll("-", ".");
