import rss from "@astrojs/rss";
import type { APIRoute } from "astro";
import { getPosts, postUrl } from "@/lib/posts";
import { SITE } from "@/site";

export const GET: APIRoute = async ({ site }) =>
	rss({
		title: SITE.title,
		description: SITE.description,
		site: site ?? "",
		items: (await getPosts()).map((p) => ({
			title: p.data.title,
			pubDate: p.data.published,
			description: p.data.description,
			categories: [p.data.category, ...p.data.tags],
			link: postUrl(p.slug),
		})),
		customData: `<language>${SITE.lang}</language>`,
	});
