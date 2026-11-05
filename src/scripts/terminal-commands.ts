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
	collapse(): void;
	gitlog: string[]; // "hash\tdate\tsubject" lines, newest first
	cwd: string; // "" = ~, otherwise a lower-cased category ("directory")
	launch(app: string, arg: string): undefined; // full-screen programs in terminal-apps.ts
	crt(): boolean; // toggles CRT mode, returns the new state
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

/** @param year show the weeks ending on Dec 31 of that year instead of today. */
export function heatmapHtml(ctx: Ctx, year?: number): string {
	const weeks = Math.max(10, Math.min(52, Math.floor((ctx.width - 4) / 11)));
	const end = year ? new Date(year, 11, 31) : new Date();
	const a = buildActivity(ctx.posts.map((p) => p.date), end, weeks);
	// Days with posts are links: hover lists the titles, click opens the first.
	const cells = a.cells
		.map((c) => {
			if (!c.count) return `<i class="l0" title="${c.key}"></i>`;
			const day = ctx.posts.filter((p) => p.date === c.key);
			return `<a class="l${c.level}" href="${day[0].url}" title="${c.key} · ${day.map((p) => esc(p.title)).join(" / ")}"></a>`;
		})
		.join("");
	const tail = year
		? `${k(String(year))}  ${ctx.posts.filter((p) => p.date.startsWith(String(year))).length}편`
		: `${k(`${weeks}w`)}  최근 30일 중 <b>${a.activeLast30}일</b> 작성 · <b>${a.streak}일</b> 연속`;
	return `<div class="heat">${cells}</div>${tail}`;
}

const dirOf = (p: PostSummary) => p.category.toLowerCase();
const inDir = (posts: PostSummary[], dir: string) => (dir ? posts.filter((p) => dirOf(p) === dir) : posts);
const longRow = (p: PostSummary) =>
	`${m("-rw-r--r--")} mingeon ${String(p.minutes).padStart(3)}m ${m(p.date)} ${p.pinned ? k(p.slug) : p.slug}`;

// Posts sharing the most tags with `p` (used by man's SEE ALSO).
const related = (posts: PostSummary[], p: PostSummary, n = 3) =>
	posts
		.filter((q) => q !== p)
		.map((q) => ({ q, s: q.tags.filter((t) => p.tags.includes(t)).length }))
		.filter((x) => x.s > 0)
		.sort((a, b) => b.s - a.s)
		.slice(0, n)
		.map((x) => x.q);

const HELP: [string, string][] = [
	["whoami", "프로필"],
	["ls [-l] [dir]", "글 목록 · 카테고리는 디렉터리"],
	["cd <dir>", "카테고리로 이동"],
	["pinned", "Pinned 글 목록"],
	["cat <글>", "글 요약 보기"],
	["man <글>", "매뉴얼 형식 요약 + 관련 글"],
	["open <글>", "글 열기"],
	["heatmap [연도]", "글 발행 기록 (잔디, 칸 클릭)"],
	["stats", "작성 통계"],
	["github", "GitHub 주소"],
	["theme", "라이트/다크 전환"],
	["random", "아무 글이나 열기"],
	["git log", "이 블로그의 커밋 기록"],
	["fortune", "글에서 한 문장"],
	["typing", "글 문장으로 타자 연습"],
	["snake", "잔디 위 뱀 게임"],
	["matrix", "글 제목 비"],
	["vim [글]", "에디터 (나가는 법은 알아서)"],
	["crt", "구형 모니터 모드"],
	["clear", "화면 지우기"],
];

export const COMMANDS: Record<string, Command> = {
	help: () =>
		`${m("사용 가능한 명령어")}\n${HELP.map(([c, d]) => `  ${k(esc(c.padEnd(12)))} ${d}`).join("\n")}\n${m("tab 자동완성 · ↑↓ 이전 명령")}`,
	whoami: () => profileHtml(),
	ls: (arg, ctx) => {
		const long = /(^|\s)-\w*l/.test(arg);
		const target = arg.replace(/-\w+/g, "").trim().replace(/^~\/?|\/$/g, "").toLowerCase();
		const dir = target === ".." ? "" : target || ctx.cwd;
		const dirs = [...new Set(ctx.posts.map(dirOf))];
		if (dir && !dirs.includes(dir)) return `ls: ${esc(target)}: No such file or directory`;
		const list = inDir(ctx.posts, dir);
		const files = list.map((p) => (long ? longRow(p) : `${m(p.date)}  ${p.slug}`));
		// At ~ the categories show up as directories first.
		const head = dir
			? []
			: long
				? dirs.map((d) => `${m("drwxr-xr-x")} mingeon ${String(inDir(ctx.posts, d).length).padStart(3)}  ${k(`${d}/`)}`)
				: [dirs.map((d) => k(`${d}/`)).join("  ")];
		return [...(long ? [m(`total ${list.length}`)] : []), ...head, ...files].join("\n");
	},
	cd: (arg, ctx) => {
		const d = arg.trim().replace(/^~\/?|\/$/g, "").toLowerCase();
		if (!d || d === ".." || d === "~") {
			ctx.cwd = "";
			return undefined;
		}
		if (!ctx.posts.some((p) => dirOf(p) === d)) return `cd: no such file or directory: ${esc(arg)}`;
		ctx.cwd = d;
		return undefined;
	},
	pwd: (_, { cwd }) => `/home/mingeon${cwd ? `/${cwd}` : ""}`,
	man: (arg, { posts }) => {
		if (!arg.trim()) return "What manual page do you want?\nFor example, try 'man bmad-method'.";
		const p = find(posts, arg);
		if (!p) return `No manual entry for ${esc(arg)}`;
		const see = related(posts, p);
		const h = (s: string) => `<b>${s}</b>`;
		return [
			`${k(p.slug.toUpperCase())}(1)${" ".repeat(6)}${m("MinGeon's Blog Manual")}`,
			"",
			h("NAME"),
			`       ${p.slug} — ${esc(p.title)}`,
			h("SYNOPSIS"),
			`       open ${p.slug}   ${m(`# ${p.minutes}분 · ${p.category} · ${p.date}`)}`,
			h("DESCRIPTION"),
			`       ${esc(p.description)}`,
			h("TAGS"),
			`       ${p.tags.map((t) => `#${esc(t)}`).join(" ")}`,
			...(see.length ? [h("SEE ALSO"), `       ${see.map((q) => `${k(q.slug)}(1)`).join(", ")}`] : []),
		].join("\n");
	},
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
	heatmap: (arg, ctx) => {
		const y = Number(arg.trim());
		return heatmapHtml(ctx, y >= 2000 && y <= 2100 ? y : undefined);
	},
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
	git: (arg, { gitlog }) => {
		const sub = arg.trim();
		if (!sub.startsWith("log")) return `git: '${esc(sub)}' is not a git command. ${k("git log")}만 됩니다`;
		if (!gitlog.length) return m("(커밋 기록 없음)");
		const one = sub.includes("--oneline");
		return gitlog
			.map((l) => {
				const [h, d, msg] = l.split("\t");
				return one ? `<span class="y">${h}</span> ${esc(msg)}` : `<span class="y">${h}</span> ${m(d)}  ${esc(msg)}`;
			})
			.join("\n");
	},
	// Slot reel: random titles spin past and stop on the pick, then it opens.
	random: (_, ctx) => {
		const pick = () => ctx.posts[(Math.random() * ctx.posts.length) | 0];
		const p = pick();
		const reel = [...Array.from({ length: 9 }, () => pick().title), p.title];
		setTimeout(() => ctx.navigate(p.url), 1900);
		return `${m("rolling…")}<span class="slot" style="--n:${reel.length - 1}"><span>${reel.map(esc).join("<br>")}</span></span>`;
	},
	// A real sentence lifted from a post summary.
	fortune: (_, { posts }) => {
		const p = posts[(Math.random() * posts.length) | 0];
		const lines = p.description.split(/(?<=[.다요])\s+/).filter((l) => l.length > 8);
		const line = lines[(Math.random() * lines.length) | 0] ?? p.description;
		return `“${esc(line)}”\n${m(`  — ${esc(p.title)}`)}`;
	},
	typing: (arg, ctx) => ctx.launch("typing", arg),
	snake: (arg, ctx) => ctx.launch("snake", arg),
	matrix: (arg, ctx) => ctx.launch("matrix", arg),
	vim: (arg, ctx) => ctx.launch("vim", arg),
	vi: (arg, ctx) => ctx.launch("vim", arg),
	crt: (_, ctx) => (ctx.crt() ? "CRT mode on — 다시 crt 하면 꺼집니다" : "CRT mode off"),
	sudo: (arg, ctx) => {
		if (!/^rm\s+-[a-z]*r[a-z]*f?[a-z]*\s+\/\*?$/.test(arg.trim()))
			return `${m("[sudo] password for guest:")} ********\nguest is not in the sudoers file. This incident will be reported.`;
		setTimeout(() => ctx.collapse(), 500);
		return `${m("[sudo] password for guest:")} ********\n<span class="warn">removing / …</span>`;
	},
};

/** Tab completion candidates for the current input. */
export function complete(input: string, posts: PostSummary[]): string[] {
	const parts = input.split(" ");
	const last = parts.at(-1) ?? "";
	const pool =
		parts.length === 1
			? Object.keys(COMMANDS)
			: ["cat", "open", "man", "vim"].includes(parts[0])
				? posts.map((p) => p.slug)
				: ["cd", "ls"].includes(parts[0])
					? [...new Set(posts.map((p) => `${p.category.toLowerCase()}/`))]
					: [];
	return pool.filter((x) => x.startsWith(last));
}
