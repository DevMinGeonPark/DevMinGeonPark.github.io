// DOM side of the hero terminal: output, input, history, completion, intro typing.
import { readPosts } from "@/scripts/posts-data";
import {
	COMMANDS,
	type Ctx,
	complete,
	heatmapHtml,
	profileHtml,
} from "@/scripts/terminal-commands";
import { toggleTheme } from "@/scripts/theme";

export function mountTerminal(root: HTMLElement, onIntroDone?: () => void) {
	const out = root.querySelector<HTMLElement>("[data-out]");
	const input = root.querySelector<HTMLInputElement>("input");
	if (!out || !input) return;
	const prompt = root.dataset.prompt ?? "";

	const ctx: Ctx = {
		posts: readPosts(),
		get width() {
			return out.clientWidth;
		},
		clear: () => {
			out.innerHTML = "";
		},
		navigate: (url) => {
			location.href = url;
		},
		toggleTheme,
	};

	const print = (html: string) => {
		const line = document.createElement("div");
		line.className = "ln";
		line.innerHTML = html;
		out.appendChild(line);
		root.scrollTop = root.scrollHeight;
		return line;
	};
	const echo = (cmd: string) => print(`${prompt}${cmd.replace(/</g, "&lt;")}`);

	const history: string[] = [];
	let cursor = 0;
	function run(line: string) {
		echo(line);
		const [name, ...rest] = line.trim().split(/\s+/);
		if (!name) return;
		history.push(line);
		cursor = history.length;
		const cmd = COMMANDS[name.toLowerCase()];
		const html = cmd
			? cmd(rest.join(" "), ctx)
			: `zsh: command not found: ${name.replace(/</g, "&lt;")} <span class="m">(help를 입력해보세요)</span>`;
		if (html) print(html);
	}

	input.addEventListener("keydown", (e) => {
		if (e.key === "Enter") {
			e.preventDefault();
			run(input.value);
			input.value = "";
		} else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
			e.preventDefault();
			cursor = Math.max(0, Math.min(history.length, cursor + (e.key === "ArrowUp" ? -1 : 1)));
			input.value = history[cursor] ?? "";
		} else if (e.key === "Tab") {
			e.preventDefault();
			const hits = complete(input.value, ctx.posts);
			if (hits.length === 1) {
				const parts = input.value.split(" ");
				parts[parts.length - 1] = hits[0];
				input.value = parts.join(" ") + (parts.length === 1 ? " " : "");
			} else if (hits.length > 1) {
				echo(input.value);
				print(hits.join("  "));
			}
		} else if (e.key === "l" && e.ctrlKey) {
			e.preventDefault();
			ctx.clear();
		}
	});
	root.addEventListener("click", () => {
		if (!getSelection()?.toString()) input.focus({ preventScroll: true });
	});

	intro().then(onIntroDone);

	async function intro() {
		const hint = '<span class="m">help를 입력해보세요</span>';
		if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
			echo("heatmap --posts");
			print(heatmapHtml(ctx));
			print(hint);
			return;
		}
		const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
		const type = async (cmd: string) => {
			const line = print(prompt);
			for (const ch of cmd) {
				line.innerHTML += ch;
				await sleep(38);
			}
			await sleep(160);
		};
		ctx.clear();
		await type("whoami --verbose");
		const body = print("");
		for (const row of profileHtml().split("\n")) {
			body.innerHTML += (body.innerHTML ? "\n" : "") + row;
			await sleep(60);
		}
		await type("heatmap --posts");
		print(heatmapHtml(ctx));
		print(hint);
	}
}
