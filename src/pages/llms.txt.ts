// https://llmstxt.org — site map for LLMs, linking each post's raw markdown.
import type { APIRoute } from "astro";
import { getPosts, isoDate } from "@/lib/posts";
import { SITE } from "@/site";

export const GET: APIRoute = async ({ site }) => {
	const posts = await getPosts();
	const abs = (path: string) => new URL(path, site).toString();
	const body = [
		`# ${SITE.title}`,
		"",
		`> ${SITE.author}(${SITE.authorEn})의 블로그. ${SITE.description}`,
		"",
		"## Posts",
		"",
		...posts.map(
			(p) =>
				`- [${p.data.title}](${abs(`/posts/${p.slug}.md`)}) (${isoDate(p.data.published)}): ${p.data.description}`,
		),
		"",
		"## About",
		"",
		`- [소개](${abs("/about/")})`,
		`- [GitHub](${SITE.github})`,
		"",
	].join("\n");
	return new Response(body, {
		headers: { "Content-Type": "text/plain; charset=utf-8" },
	});
};
