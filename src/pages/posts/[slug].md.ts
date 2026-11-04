// Raw markdown per post, for LLM crawlers and "view source" readers (GEO).
import type { APIRoute, GetStaticPaths } from "astro";
import { getPosts, isoDate, type Post, postUrl } from "@/lib/posts";
import { SITE } from "@/site";

export const getStaticPaths = (async () =>
	(await getPosts()).map((post) => ({
		params: { slug: post.slug },
		props: { post },
	}))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props, site }) => {
	const { post } = props as { post: Post };
	const d = post.data;
	const header = [
		`# ${d.title}`,
		"",
		`> ${d.description}`,
		"",
		`- 작성자: ${SITE.author}`,
		`- 발행: ${isoDate(d.published)}`,
		`- 원문: ${new URL(postUrl(post.slug), site)}`,
		`- 라이선스: ${SITE.license.name}`,
		"",
	].join("\n");
	return new Response(`${header}\n${post.body}`, {
		headers: { "Content-Type": "text/markdown; charset=utf-8" },
	});
};
