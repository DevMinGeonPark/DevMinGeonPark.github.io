import type { PostSummary } from "@/lib/posts";

// Posts are embedded once per page by CommandPalette.astro as a JSON island.
let cache: PostSummary[] | undefined;
export function readPosts(): PostSummary[] {
	cache ??= JSON.parse(
		document.getElementById("posts-json")?.textContent ?? "[]",
	) as PostSummary[];
	return cache;
}

export const escapeHtml = (s: string) =>
	s.replace(
		/[&<>"]/g,
		(c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
	);
