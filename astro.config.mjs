import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import { defineConfig } from "astro/config";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";

export default defineConfig({
	site: "https://devmingeonpark.github.io/",
	trailingSlash: "always",
	redirects: { "/archive/": "/" },
	integrations: [
		expressiveCode({
			themes: ["github-dark"],
			defaultProps: { wrap: true },
			styleOverrides: {
				borderRadius: "8px",
				codeFontFamily: "var(--mono)",
				codeFontSize: "0.85rem",
			},
		}),
		sitemap(),
	],
	markdown: {
		rehypePlugins: [
			rehypeSlug,
			[
				rehypeAutolinkHeadings,
				{
					behavior: "append",
					properties: { className: ["anchor"], ariaLabel: "섹션 링크" },
					content: { type: "text", value: "#" },
				},
			],
		],
	},
});
