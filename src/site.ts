// Single source for identity/copy used across pages, SEO and the terminal.
export const SITE = {
	title: "mingeon",
	description: "AI 에이전트를 실무에 적용하고, 그 과정을 기록합니다.",
	lang: "ko",
	author: "박민건",
	authorEn: "MinGeon Park",
	handle: "DevMinGeonPark",
	github: "https://github.com/DevMinGeonPark",
	license: { name: "CC BY-NC-SA 4.0", url: "https://creativecommons.org/licenses/by-nc-sa/4.0/" },
	since: "2023-10-18",
} as const;

export const QUOTE = {
	en: "The future is already here — it's just not very evenly distributed.",
	ko: "미래는 이미 와 있다. 다만 고르게 퍼지지 않았을 뿐이다.",
	by: "William Gibson",
} as const;

// Rows printed by `whoami --verbose` in the hero terminal.
export const PROFILE: [string, string][] = [
	["focus", "AX · 에이전트 워크플로 · LLM 평가"],
	["infra", "Mac mini (headless) · Raspberry Pi"],
	["shell", "zsh + tmux (amux)"],
	["stack", "TypeScript · Go · Python · Bash"],
	["agents", "Claude Code · Codex"],
	["now", "LLM OS 설계 중"],
];
