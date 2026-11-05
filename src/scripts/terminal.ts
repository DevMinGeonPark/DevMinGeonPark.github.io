// DOM side of the hero terminal: output, input, history, completion, intro typing.
import { readPosts } from "@/scripts/posts-data";
import {
	COMMANDS,
	type Ctx,
	complete,
	heatmapHtml,
	profileHtml,
} from "@/scripts/terminal-commands";
import { collapse } from "@/scripts/collapse";
import { toggleCrt } from "@/scripts/crt";
import { type App, APPS } from "@/scripts/terminal-apps";
import { toggleTheme } from "@/scripts/theme";

export function mountTerminal(root: HTMLElement, onIntroDone?: () => void) {
	const out = root.querySelector<HTMLElement>("[data-out]");
	const input = root.querySelector<HTMLInputElement>("input");
	if (!out || !input) return;
	const base = root.dataset.prompt ?? "";
	// The prompt shows the current "directory" (category) after cd.
	const promptHtml = () => base.replace("~ %", `~${ctx.cwd ? `/${ctx.cwd}` : ""} %`);
	let app: App | null = null;

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
		collapse,
		gitlog: JSON.parse(root.dataset.gitlog ?? "[]"),
		cwd: "",
		crt: toggleCrt,
		launch: (name, arg) => {
			const start = APPS[name];
			if (!start) return undefined;
			input.value = ""; // the launching command line isn't input for the app
			// Overlay the visible part of the terminal, leaving the input line usable.
			// With little output, a spacer pushes the input line to the bottom first.
			const line = root.querySelector<HTMLElement>(".input-line")!;
			const spacer = document.createElement("div");
			root.scrollTop = root.scrollHeight;
			const gap = root.clientHeight - (line.offsetTop + line.offsetHeight - root.scrollTop) - 26;
			if (gap > 0) {
				spacer.style.height = `${gap}px`;
				out.append(spacer);
			}
			root.scrollTop = root.scrollHeight;
			const screen = document.createElement("div");
			screen.className = "screen";
			screen.style.top = `${root.scrollTop}px`;
			screen.style.height = `${line.offsetTop - root.scrollTop - 8}px`;
			root.classList.add("in-app");
			root.append(screen);
			app = start(
				{
					screen,
					input,
					posts: ctx.posts,
					exit: (msg) => {
						app?.stop?.();
						app = null;
						screen.remove();
						spacer.remove();
						root.classList.remove("in-app");
						input.value = "";
						if (msg) print(msg);
						input.focus({ preventScroll: true });
					},
				},
				arg,
			);
			return undefined;
		},
	};

	const print = (html: string) => {
		const line = document.createElement("div");
		line.className = "ln";
		line.innerHTML = html;
		out.appendChild(line);
		root.scrollTop = root.scrollHeight;
		return line;
	};
	const echo = (cmd: string) => print(`${promptHtml()}${cmd.replace(/</g, "&lt;")}`);

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
		const label = root.querySelector(".input-line .p");
		if (label) label.outerHTML = promptHtml();
	}

	input.addEventListener("keydown", (e) => {
		if (e.isComposing) return; // Korean IME: Enter commits the syllable, not the line
		if (app) {
			if (e.key === "Enter") {
				e.preventDefault();
				const v = input.value;
				input.value = "";
				app.enter?.(v);
			} else if (app.key?.(e)) e.preventDefault();
			return;
		}
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
			const line = print(base);
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
