// Vim-style keys across the site: j/k step through blocks, gg/G ends, h/l prev/next post,
// "/" search, "?" cheat sheet. Ignored while typing or with modifier keys held.
const HEADER = 84; // sticky header height + breathing room

const blocks = () =>
	[
		...document.querySelectorAll<HTMLElement>(
			document.querySelector(".prose")
				? ".prose > :is(h2, h3, p, ul, ol, blockquote, table, img, figure, div)"
				: "main :is(.hero, h2, .post-card, .card)",
		),
	].filter((el) => el.offsetHeight > 0);

function step(dir: 1 | -1) {
	const list = blocks();
	const el =
		dir > 0
			? list.find((e) => e.getBoundingClientRect().top > HEADER + 4)
			: list.findLast((e) => e.getBoundingClientRect().top < HEADER - 4);
	if (!el) return scrollTo({ top: dir > 0 ? document.documentElement.scrollHeight : 0, behavior: "smooth" });
	scrollTo({ top: el.getBoundingClientRect().top + scrollY - HEADER, behavior: "smooth" });
	el.classList.remove("vim-hit");
	void el.offsetWidth;
	el.classList.add("vim-hit");
	el.addEventListener("animationend", () => el.classList.remove("vim-hit"), { once: true });
}

const KEYS: [string, string][] = [
	["j / k", "다음 · 이전 블록"],
	["gg / G", "맨 위 · 맨 아래"],
	["h / l", "이전 · 다음 글"],
	["/", "검색"],
	["?", "이 도움말"],
	["esc", "닫기"],
];
let help: HTMLElement | null = null;
function toggleHelp(force?: boolean) {
	const show = force ?? !help;
	if (!show) {
		help?.remove();
		help = null;
		return;
	}
	if (help) return;
	help = document.createElement("div");
	help.className = "vimhelp";
	help.setAttribute("role", "dialog");
	help.setAttribute("aria-label", "키보드 단축키");
	help.innerHTML = `<p class="t"><span>●</span><span>●</span><span>●</span><b>~/.vimrc</b></p>${KEYS.map(([k, d]) => `<p><kbd>${k}</kbd>${d}</p>`).join("")}`;
	help.addEventListener("click", () => toggleHelp(false));
	document.body.append(help);
}

let lastG = 0;
addEventListener("keydown", (e) => {
	const t = e.target as HTMLElement;
	if (e.metaKey || e.ctrlKey || e.altKey || t.closest("input, textarea, select, [contenteditable]")) return;
	if (!document.getElementById("palette")?.hidden) return;
	const go = (sel: string) => {
		const href = document.querySelector<HTMLAnchorElement>(sel)?.getAttribute("href");
		if (href) location.href = href;
	};
	switch (e.key) {
		case "j":
			return step(1);
		case "k":
			return step(-1);
		case "G":
			return scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
		case "g":
			if (Date.now() - lastG < 500) scrollTo({ top: 0, behavior: "smooth" });
			lastG = Date.now();
			return;
		case "h":
			return go("[data-prev]");
		case "l":
			return go("[data-next]");
		case "?":
			return toggleHelp();
		case "Escape":
			return toggleHelp(false);
		case "/":
			if (document.querySelector("[data-q]")) return; // the space page has its own search
			e.preventDefault();
			document.querySelector<HTMLElement>("[data-open-palette]")?.click();
	}
});
