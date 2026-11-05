// Full-screen programs for the hero terminal (vim, snake, matrix, typing).
// Each one draws into `screen` (an overlay above the input line) and receives
// Enter / other keys from terminal.ts until it calls exit().
import type { PostSummary } from "@/lib/posts";
import { escapeHtml as esc } from "@/scripts/posts-data";

export type AppEnv = {
	screen: HTMLElement;
	input: HTMLInputElement;
	posts: PostSummary[];
	exit(msg?: string): void;
};
export type App = {
	enter?(value: string): void;
	/** Return true when the key was consumed (terminal then prevents the default). */
	key?(e: KeyboardEvent): boolean;
	stop?(): void;
};

const pick = <T>(a: T[]) => a[(Math.random() * a.length) | 0];
const token = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const find = (posts: PostSummary[], q: string) => {
	const s = q.trim().toLowerCase();
	return s ? (posts.find((p) => p.slug === s) ?? posts.find((p) => p.slug.startsWith(s))) : undefined;
};

function canvasIn(el: HTMLElement, h = el.clientHeight) {
	const cv = document.createElement("canvas");
	const w = el.clientWidth;
	const dpr = devicePixelRatio || 1;
	cv.width = w * dpr;
	cv.height = h * dpr;
	cv.style.cssText = `width:${w}px;height:${h}px;display:block`;
	el.append(cv);
	const c = cv.getContext("2d")!;
	c.scale(dpr, dpr);
	return { cv, c, w, h };
}

/* ---------------- vim: read-only buffer you have to :q out of ---------------- */
function vim(env: AppEnv, arg: string): App {
	const p = find(env.posts, arg);
	const name = p ? `${p.slug}.md` : arg.trim() || "[No Name]";
	const body = p
		? ["---", `title: ${p.title}`, `date: ${p.date}`, `category: ${p.category}`, `tags: [${p.tags.join(", ")}]`, "---", "", p.description]
		: ["", "", "VIM - Vi IMproved", "", "mingeon's readonly edition", "", "type  :help<Enter>   for help", "type  :q<Enter>      to exit"];
	env.screen.innerHTML = `<div class="vim"><pre class="buf"></pre><div class="vst"><span data-msg>"${esc(name)}" [readonly] ${body.length}L</span><span>1,1  All</span></div></div>`;
	const buf = env.screen.querySelector<HTMLElement>(".buf")!;
	const rows = Math.max(body.length + 1, Math.floor((buf.clientHeight || 200) / 20));
	const lines = [...body.map((l, i) => (p ? esc(l) : `<span class="${i === 2 ? "k" : "m"}">${esc(l)}</span>`)), ...Array(rows - body.length).fill('<span class="tl">~</span>')];
	buf.innerHTML = lines.join("\n");
	if (!p) buf.classList.add("splash");
	const msg = env.screen.querySelector<HTMLElement>("[data-msg]")!;
	const ph = env.input.placeholder;
	env.input.placeholder = ":";
	let tries = 0;
	return {
		enter(v) {
			const c = v.trim();
			if (/^:(q|q!|wq|wq!|x|qa!?)$/.test(c))
				return env.exit(c.startsWith(":w") || c === ":x" ? "E45: 'readonly' option is set — 저장은 안 됐지만 나왔습니다" : "vim: 무사히 탈출했습니다");
			if (c === ":help") msg.textContent = "help: 그냥 :q 를 치세요";
			else if (c.startsWith(":")) msg.textContent = `E492: Not an editor command: ${c.slice(1)}`;
			else msg.textContent = "E21: Cannot make changes, 'modifiable' is off";
			if (++tries >= 3 && c !== ":help") msg.textContent += "   (힌트: :q)";
		},
		stop() {
			env.input.placeholder = ph;
		},
	};
}

/* ---------------- snake on the heatmap grid; posts are the food ---------------- */
function snake(env: AppEnv): App {
	env.screen.innerHTML = `<div class="sn-bar"><span data-score>score 0</span><span data-msg>←↑↓→ · hjkl · wasd · esc 종료</span></div>`;
	const { c, w, h } = canvasIn(env.screen, env.screen.clientHeight - 26);
	const S = 11; // 9px cell + 2px gap, like the heatmap
	const cols = Math.max(10, Math.floor(w / S));
	const rows = Math.max(8, Math.floor(h / S));
	const ox = (w - cols * S) / 2;
	const oy = (h - rows * S) / 2;
	const col = { 0: token("--heat-0"), 2: token("--heat-2"), 3: token("--heat-3"), 4: token("--heat-4"), g: token("--term-green") };
	const score = env.screen.querySelector<HTMLElement>("[data-score]")!;
	const msg = env.screen.querySelector<HTMLElement>("[data-msg]")!;
	const queue = [...env.posts].sort(() => Math.random() - 0.5);
	let body: [number, number][], dir: [number, number], next: [number, number], food: [number, number], eaten: number, over: boolean, timer: number;

	const place = (): [number, number] => {
		for (;;) {
			const f: [number, number] = [(Math.random() * cols) | 0, (Math.random() * rows) | 0];
			if (!body.some(([x, y]) => x === f[0] && y === f[1])) return f;
		}
	};
	const cell = (x: number, y: number, fill: string) => {
		c.fillStyle = fill;
		c.beginPath();
		c.roundRect(ox + x * S, oy + y * S, 9, 9, 2);
		c.fill();
	};
	const draw = () => {
		c.clearRect(0, 0, w, h);
		for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) cell(x, y, col[0]);
		cell(food[0], food[1], performance.now() % 600 < 300 ? col[4] : col[2]);
		body.forEach(([x, y], i) => cell(x, y, i === 0 ? col.g : col[3]));
	};
	const tick = () => {
		dir = next;
		const head: [number, number] = [(body[0][0] + dir[0] + cols) % cols, (body[0][1] + dir[1] + rows) % rows];
		if (body.some(([x, y]) => x === head[0] && y === head[1])) {
			over = true;
			clearInterval(timer);
			msg.textContent = `GAME OVER · ${eaten}편 먹음 · enter 재시작 · esc 종료`;
			return draw();
		}
		body.unshift(head);
		if (head[0] === food[0] && head[1] === food[1]) {
			const p = queue[eaten % queue.length];
			eaten++;
			score.textContent = `score ${eaten}`;
			msg.textContent = `+1 · ${p.title}`;
			food = place();
			clearInterval(timer);
			timer = window.setInterval(tick, Math.max(55, 120 - eaten * 4));
		} else body.pop();
		draw();
	};
	const start = () => {
		const mx = (cols / 2) | 0, my = (rows / 2) | 0;
		body = [[mx, my], [mx - 1, my], [mx - 2, my]];
		dir = next = [1, 0];
		eaten = 0;
		over = false;
		food = place();
		score.textContent = "score 0";
		msg.textContent = "←↑↓→ · hjkl · wasd · esc 종료";
		clearInterval(timer);
		timer = window.setInterval(tick, 120);
		draw();
	};
	const turn = (d: [number, number]) => {
		if (d[0] !== -dir[0] || d[1] !== -dir[1]) next = d;
	};
	const DIRS: Record<string, [number, number]> = {
		ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
		k: [0, -1], j: [0, 1], h: [-1, 0], l: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
	};
	// Touch: swipe to turn, tap to restart after game over.
	let touch: [number, number] | null = null;
	env.screen.addEventListener("pointerdown", (e) => (touch = [e.clientX, e.clientY]));
	env.screen.addEventListener("pointerup", (e) => {
		if (!touch) return;
		const dx = e.clientX - touch[0], dy = e.clientY - touch[1];
		touch = null;
		if (Math.hypot(dx, dy) < 20) return over && start();
		turn(Math.abs(dx) > Math.abs(dy) ? [Math.sign(dx), 0] : [0, Math.sign(dy)]);
	});
	start();
	const blink = window.setInterval(() => !over && draw(), 300);
	return {
		enter: () => over && start(),
		key(e) {
			if (e.key === "Escape" || (over && e.key === "q")) {
				env.exit(`snake: ${eaten}편 먹고 종료`);
				return true;
			}
			const d = DIRS[e.key.length === 1 ? e.key.toLowerCase() : e.key];
			if (d) turn(d);
			return true; // swallow typing while playing
		},
		stop() {
			clearInterval(timer);
			clearInterval(blink);
		},
	};
}

/* ---------------- matrix: rain made of post-title characters ---------------- */
function matrix(env: AppEnv): App {
	const { c, w, h } = canvasIn(env.screen);
	const glyphs = [...env.posts.map((p) => p.title).join("").replace(/\s/g, "")];
	const F = 14;
	const drops = Array.from({ length: Math.ceil(w / F) }, () => (Math.random() * -h) / F);
	const bg = token("--term-bg") || "#0d0d0f";
	const green = token("--term-green") || "#7ee08f";
	const head = token("--term-fg") || "#ddd";
	c.fillStyle = bg;
	c.fillRect(0, 0, w, h);
	c.font = `${F - 1}px ${token("--mono") || "monospace"}`;
	const timer = window.setInterval(() => {
		c.globalAlpha = 0.14;
		c.fillStyle = bg;
		c.fillRect(0, 0, w, h);
		c.globalAlpha = 1;
		drops.forEach((y, i) => {
			const ch = pick(glyphs);
			c.fillStyle = green;
			c.fillText(ch, i * F, (y - 1) * F);
			c.fillStyle = head;
			c.fillText(ch, i * F, y * F);
			drops[i] = y * F > h && Math.random() > 0.96 ? 0 : y + 1;
		});
	}, 55);
	const quit = () => env.exit("matrix: 아무 키나 눌러서 깨어났습니다");
	env.screen.addEventListener("click", quit);
	return {
		enter: quit,
		key: () => (quit(), true),
		stop: () => clearInterval(timer),
	};
}

/* ---------------- typing: type a real sentence from a post ---------------- */
// Keystrokes per Hangul syllable (initial + medial [+ final]); everything else counts as one.
const strokes = (s: string) =>
	[...s].reduce((n, ch) => {
		const code = ch.charCodeAt(0) - 0xac00;
		return n + (code >= 0 && code < 11172 ? (code % 28 ? 3 : 2) : 1);
	}, 0);

function typing(env: AppEnv): App {
	const p = pick(env.posts);
	const sentences = p.description.split(/(?<=[.다요?!])\s+/).filter((s) => s.length >= 12 && s.length <= 70);
	const target = (pick(sentences) ?? p.description.slice(0, 60)).trim();
	env.screen.innerHTML = `<div class="ty"><p class="m">아래 문장을 입력하고 enter · esc 취소</p><p class="ty-t" data-t></p><p class="m">— ${esc(p.title)}</p></div>`;
	const out = env.screen.querySelector<HTMLElement>("[data-t]")!;
	let t0 = 0;
	const paint = () => {
		const v = env.input.value;
		if (v && !t0) t0 = performance.now();
		out.innerHTML = [...target]
			.map((ch, i) => (i >= v.length ? `<span class="todo">${esc(ch)}</span>` : v[i] === ch ? `<span class="ok">${esc(ch)}</span>` : `<span class="bad">${esc(ch)}</span>`))
			.join("");
	};
	paint();
	env.input.addEventListener("input", paint);
	const ph = env.input.placeholder;
	env.input.placeholder = "여기에 입력";
	return {
		enter(v) {
			if (!t0) return;
			const sec = (performance.now() - t0) / 1000;
			const right = [...target].filter((ch, i) => v[i] === ch).length;
			const acc = Math.round((right / target.length) * 100);
			const tpm = Math.round((strokes(v) / sec) * 60);
			env.exit(`typing: <b>${tpm}타/분</b> · 정확도 <b>${acc}%</b> · ${sec.toFixed(1)}초\n<span class="m">“${esc(target)}” — ${esc(p.title)}</span>`);
		},
		key(e) {
			if (e.key !== "Escape") return false;
			env.exit("typing: 취소");
			return true;
		},
		stop() {
			env.input.removeEventListener("input", paint);
			env.input.placeholder = ph;
		},
	};
}

export const APPS: Record<string, (env: AppEnv, arg: string) => App> = { vim, snake, matrix, typing };
