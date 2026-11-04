// Terminal command registry. Commands return HTML (or act through ctx);
// they know nothing about the DOM, which stays in terminal.ts.
import { buildActivity } from "@/lib/activity";
import type { PostSummary } from "@/lib/posts";
import { escapeHtml as esc } from "@/scripts/posts-data";
import { PROFILE, SITE } from "@/site";

export type Ctx = {
	posts: PostSummary[];
	width: number; // px available for the heatmap
	clear(): void;
	navigate(url: string): void;
	toggleTheme(): void;
};
type Command = (arg: string, ctx: Ctx) => string | undefined;

const k = (s: string) => `<span class="k">${s}</span>`;
const m = (s: string) => `<span class="m">${s}</span>`;

export const profileHtml = () =>
	PROFILE.map(([key, val]) => `${k(key.padEnd(6))} ${esc(val)}`).join("\n");

const find = (posts: PostSummary[], q: string) => {
	const s = q.trim().toLowerCase();
	return s
		? (posts.find((p) => p.slug === s) ?? posts.find((p) => p.slug.startsWith(s)))
		: undefined;
};

export function heatmapHtml(ctx: Ctx): string {
	const weeks = Math.max(10, Math.min(52, Math.floor((ctx.width - 4) / 11)));
	const a = buildActivity(ctx.posts.map((p) => p.date), new Date(), weeks);
	const cells = a.cells
		.map((c) => `<i class="l${c.level}" title="${c.key}${c.count ? ` · ${c.count}편` : ""}"></i>`)
		.join("");
	return `<div class="heat">${cells}</div>${k(`${weeks}w`)}  최근 30일 중 <b>${a.activeLast30}일</b> 작성 · <b>${a.streak}일</b> 연속`;
}

const HELP: [string, string][] = [
	["whoami", "프로필"],
	["ls", "전체 글 목록"],
	["pinned", "Pinned 글 목록"],
	["cat <글>", "글 요약 보기"],
	["open <글>", "글 열기"],
	["heatmap", "글 발행 기록 (잔디)"],
	["stats", "작성 통계"],
	["github", "GitHub 주소"],
	["theme", "라이트/다크 전환"],
	["clear", "화면 지우기"],
];

export const COMMANDS: Record<string, Command> = {
	help: () =>
		`${m("사용 가능한 명령어")}\n${HELP.map(([c, d]) => `  ${k(esc(c.padEnd(12)))} ${d}`).join("\n")}\n${m("tab 자동완성 · ↑↓ 이전 명령")}`,
	whoami: () => profileHtml(),
	ls: (_, { posts }) => posts.map((p) => `${m(p.date)}  ${p.slug}`).join("\n"),
	pinned: (_, { posts }) =>
		posts
			.filter((p) => p.pinned)
			.map((p, i) => `${m(String(i + 1).padStart(2, "0"))}  ${p.slug}`)
			.join("\n"),
	cat: (arg, { posts }) => {
		const p = find(posts, arg);
		if (!p) return `cat: ${esc(arg)}: 그런 글이 없습니다. ${k("ls")}로 목록을 확인하세요`;
		return `<b>${esc(p.title)}</b>\n${m(`${p.category} · ${p.date}`)}\n${esc(p.description)}\n${m(`→ open ${p.slug}`)}`;
	},
	open: (arg, ctx) => {
		const p = find(ctx.posts, arg);
		if (!p) return `open: ${esc(arg)}: 그런 글이 없습니다`;
		setTimeout(() => ctx.navigate(p.url), 300);
		return m(`opening ${p.slug}…`);
	},
	heatmap: (_, ctx) => heatmapHtml(ctx),
	stats: (_, { posts }) =>
		[
			["posts", String(posts.length)],
			["last", posts[0]?.date ?? "-"],
			["since", SITE.since],
		]
			.map(([a, b]) => `${a.padEnd(7)} ${b}`)
			.join("\n"),
	github: () => `<a href="${SITE.github}">${SITE.github}</a>`,
	theme: (_, ctx) => {
		ctx.toggleTheme();
		return "테마를 전환했습니다";
	},
	clear: (_, ctx) => {
		ctx.clear();
		return undefined;
	},
};

/** Tab completion candidates for the current input. */
export function complete(input: string, posts: PostSummary[]): string[] {
	const parts = input.split(" ");
	const last = parts.at(-1) ?? "";
	const pool =
		parts.length === 1
			? Object.keys(COMMANDS)
			: ["cat", "open"].includes(parts[0])
				? posts.map((p) => p.slug)
				: [];
	return pool.filter((x) => x.startsWith(last));
}
