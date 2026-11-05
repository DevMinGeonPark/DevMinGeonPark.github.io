// Post "space": each category is a wireframe sphere, each post a node on its shell.
// Structure from ~/agent-system/mockup "Blueprint" theme; colours come from the blog's tokens.
import { escapeHtml, readPosts } from "@/scripts/posts-data";
import type { PostSummary } from "@/lib/posts";

type RGB = [number, number, number];
type Node = PostSummary & { o: number[]; c: Cluster; sx: number; sy: number; z: number; front: number; a: number; flash: number };
type Dust = { o: number[]; sx: number; sy: number; front: number };
type Cluster = { name: string; nodes: Node[]; dust: Dust[]; mesh: [Dust, Dust][]; r: number; p: number[]; sx: number; sy: number; z: number; R: number; ang: number };

const GOLD = Math.PI * (3 - Math.sqrt(5));
const PERSP = 1600;
const ease = (p: number) => 1 - (1 - Math.min(1, Math.max(0, p))) ** 3;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const shell = (k: number, n: number, j = 1) => {
	const y = 1 - (2 * (k + 0.5)) / n, s = Math.sqrt(1 - y * y);
	return [Math.cos(k * GOLD) * s * j, y * j, Math.sin(k * GOLD) * s * j];
};

export function initSpace(root: HTMLElement) {
	const $ = <T extends HTMLElement>(s: string) => root.querySelector(s) as T;
	const cv = $<HTMLCanvasElement>("canvas");
	const ctx = cv.getContext("2d")!;
	const tip = $("[data-tip]"), panel = $("[data-panel]"), chips = $("[data-chips]"), q = $<HTMLInputElement>("[data-q]"), readout = $("[data-readout]");
	const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

	// ---- colours: follow the blog theme (light/dark, toggle) ----
	let INK: RGB = [0, 0, 0], BRAND: RGB = [0, 0, 0];
	const probe = document.createElement("span");
	probe.hidden = true;
	root.append(probe);
	const toRGB = (v: string): RGB => {
		probe.style.color = v;
		return (getComputedStyle(probe).color.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number) as RGB;
	};
	const readColors = () => {
		const cs = getComputedStyle(root);
		INK = toRGB(cs.getPropertyValue("--ink"));
		BRAND = toRGB(cs.getPropertyValue("--brand"));
	};
	readColors();
	new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
	matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);
	const ink = (a: number) => `rgba(${INK[0]},${INK[1]},${INK[2]},${a})`;
	const brand = (a: number) => `rgba(${BRAND[0]},${BRAND[1]},${BRAND[2]},${a})`;

	// ---- data -> clusters ----
	const byCat = new Map<string, PostSummary[]>();
	for (const p of readPosts()) byCat.set(p.category, [...(byCat.get(p.category) ?? []), p]);
	const clusters: Cluster[] = [...byCat].sort((a, b) => b[1].length - a[1].length).map(([name, ps], ci) => {
		const c = { name, r: 70 + 22 * Math.sqrt(ps.length), p: [0, 0, 0], sx: 0, sy: 0, z: 0, R: 0, ang: ci * 1.3 } as Cluster;
		c.nodes = ps.map((p, k) => ({ ...p, o: shell(k, ps.length, 0.92), c, sx: 0, sy: 0, z: 0, front: 1, a: 0, flash: 0 }));
		const nd = 70 + 40 * ps.length; // decorative dust so a 1-post sphere still reads as a sphere
		c.dust = Array.from({ length: nd }, (_, k) => ({ o: shell(k, nd, 0.8 + 0.2 * ((Math.sin(k * 91.7) + 1) / 2)), sx: 0, sy: 0, front: 0 }));
		c.mesh = []; // each dust -> 2 nearest neighbours (synapse mesh)
		c.dust.forEach((d, i) => c.dust
			.map((m, j) => [j, (d.o[0] - m.o[0]) ** 2 + (d.o[1] - m.o[1]) ** 2 + (d.o[2] - m.o[2]) ** 2])
			.filter(([j]) => j > i).sort((a, b) => a[1] - b[1]).slice(0, 2)
			.forEach(([j]) => c.mesh.push([d, c.dust[j]])));
		return c;
	});
	clusters.forEach((c, i) => {
		if (i === 0) return;
		const a = (i - 1) * ((Math.PI * 2) / Math.max(1, clusters.length - 1));
		const d = clusters[0].r + c.r + 90;
		c.p = [Math.cos(a) * d, (i % 2 ? 1 : -1) * d * 0.25, Math.sin(a) * d];
	});
	const EXT = Math.max(...clusters.map((c) => Math.hypot(...c.p) + c.r));
	const nodes = clusters.flatMap((c) => c.nodes);
	const linked = (a: Node, b: Node) => a !== b && a.tags.some((t) => b.tags.includes(t));
	const edges: [Node, Node][] = [];
	nodes.forEach((a, i) => nodes.slice(i + 1).forEach((b) => linked(a, b) && edges.push([a, b])));
	// cluster-to-cluster traces, weighted by shared-tag edges
	const tlinks = new Map<string, { a: Cluster; b: Cluster; n: number }>();
	for (const [a, b] of edges) {
		if (a.c === b.c) continue;
		const k = [a.c.name, b.c.name].sort().join("|");
		const l = tlinks.get(k) ?? { a: a.c, b: b.c, n: 0 };
		l.n++; tlinks.set(k, l);
	}

	// ---- state ----
	const active = new Set(clusters.map((c) => c.name));
	let hits: Set<Node> | null = null, hover: Node | null = null, focus: Node | null = null;
	const rot = { yaw: 0.5, pitch: -0.55, v: 0 };
	let W = 0, H = 0, DPR = 1, SCALE = 1, t0 = 0, last = 0;
	let drag: { x: number; y: number; moved: boolean } | null = null;
	const impulses: { a: Node; b: Node; t: number }[] = [];

	function resize() {
		const r = cv.getBoundingClientRect();
		DPR = devicePixelRatio || 1; W = r.width; H = r.height;
		cv.width = W * DPR; cv.height = H * DPR;
		SCALE = Math.min((W * 0.86) / (2 * EXT), (H - 150) / (2 * EXT * 0.9));
	}
	new ResizeObserver(resize).observe(cv);

	const shown = (n: Node) => active.has(n.c.name);
	const target = (n: Node) => !shown(n) ? 0.08 : focus ? (n === focus || linked(focus, n) ? 1 : 0.2) : hits ? (hits.has(n) ? 1 : 0.15) : 1;

	function draw(t: number) {
		const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
		const time = t / 1000, intro = (t - t0) / 1000, boot = ease(intro / 1.6);
		if (!drag && !still) rot.yaw += dt * (hover ? 0 : 0.05) + rot.v;
		rot.v *= 0.92;
		const cy = Math.cos(rot.yaw), sy = Math.sin(rot.yaw), cp = Math.cos(rot.pitch), sp = Math.sin(rot.pitch);
		const ox = W / 2, oy = H / 2 - 30;
		const proj = (x: number, y: number, z: number) => {
			const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp, f = PERSP / (PERSP + z2);
			return [ox + x1 * f * SCALE, oy + y1 * f * SCALE, z2];
		};
		const grow = ease(intro / 1.4);
		const place = (c: Cluster, o: number[], k = 1) => {
			const ca = Math.cos(c.ang), sa = Math.sin(c.ang), r = c.r * grow * k;
			return proj(c.p[0] + (o[0] * ca + o[2] * sa) * r, c.p[1] + o[1] * r, c.p[2] + (-o[0] * sa + o[2] * ca) * r);
		};
		const frontOf = (z: number, c: Cluster) => Math.max(0, Math.min(1, 0.5 - (z - c.z) / (2 * c.r)));

		for (const c of clusters) {
			if (!drag && !still) c.ang += dt * 0.08;
			[c.sx, c.sy, c.z] = proj(c.p[0], c.p[1], c.p[2]);
			c.R = ((c.r * SCALE * PERSP) / (PERSP + c.z)) * grow;
			for (const d of c.dust) { let z; [d.sx, d.sy, z] = place(c, d.o); d.front = frontOf(z, c); }
		}
		for (const n of nodes) {
			[n.sx, n.sy, n.z] = place(n.c, n.o, ease((intro - 0.3) / 1.3) / Math.max(grow, 0.01));
			n.front = frontOf(n.z, n.c);
			n.a = lerp(n.a, target(n) * Math.min(1, intro), 0.1);
			n.flash = Math.max(0, n.flash - dt * 1.2);
		}

		ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
		ctx.clearRect(0, 0, W, H);
		ctx.lineWidth = 1;

		// cluster traces: horizontal, 45° chamfer, vertical (PCB track) + data packets
		for (const l of tlinks.values()) {
			if (l.a.R < 1 || l.b.R < 1) continue;
			const al = (0.18 + 0.08 * Math.log2(l.n + 1)) * boot * (active.has(l.a.name) && active.has(l.b.name) ? 1 : 0.25);
			const A = [l.a.sx, l.a.sy], B = [l.b.sx, l.b.sy], dx = B[0] - A[0], dy = B[1] - A[1];
			const chf = Math.min(Math.abs(dx), Math.abs(dy)) * 0.5;
			const pts = [A, [B[0] - Math.sign(dx) * chf, A[1]], [B[0], A[1] + Math.sign(dy) * chf], B];
			const seg = [0, 1, 2].map((i) => Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])), tot = seg[0] + seg[1] + seg[2] || 1;
			ctx.strokeStyle = ink(al); ctx.setLineDash([6, 4]); ctx.lineDashOffset = -time * 24;
			ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
			ctx.setLineDash([]);
			ctx.fillStyle = ink(al * 2.5); ctx.fillRect(pts[1][0] - 1.5, pts[1][1] - 1.5, 3, 3); // via
			for (const off of [0, 0.5]) {
				let d = (((time * 60 + l.n * 37) / tot + off) % 1) * tot, i = 0;
				while (i < 2 && d > seg[i]) d -= seg[i++];
				const k = seg[i] ? d / seg[i] : 0;
				ctx.fillStyle = brand(Math.min(1, al * 4));
				ctx.fillRect(lerp(pts[i][0], pts[i + 1][0], k) - 2, lerp(pts[i][1], pts[i + 1][1], k) - 1, 4, 2);
			}
		}
		ctx.lineDashOffset = 0;

		const back = [...clusters].sort((a, b) => b.z - a.z);
		for (const c of back) {
			const on = active.has(c.name) ? 1 : 0.25, quiet = hits || focus ? 0.5 : 1;
			if (c.R < 1) continue;
			// outline
			ctx.strokeStyle = ink(0.3 * on); ctx.beginPath(); ctx.arc(c.sx, c.sy, c.R * 0.98, 0, 6.283); ctx.stroke();
			// wireframe globe: 3 latitudes + 4 meridians
			ctx.lineWidth = 0.6; ctx.strokeStyle = ink(0.16 * on * quiet); ctx.beginPath();
			for (const lat of [-0.6, 0, 0.6]) {
				const rs = Math.cos(lat), y = Math.sin(lat);
				for (let i = 0; i <= 32; i++) { const a = (i / 32) * 6.283, [x, yy] = place(c, [Math.cos(a) * rs, y, Math.sin(a) * rs]); i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
			}
			for (let m = 0; m < 4; m++) {
				const a = (m / 4) * Math.PI;
				for (let i = 0; i <= 32; i++) { const b = (i / 32) * 6.283, [x, yy] = place(c, [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)]); i ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); }
			}
			ctx.stroke();
			// synapse mesh (front half only)
			ctx.strokeStyle = ink(0.14 * on * quiet); ctx.beginPath();
			for (const [a, b] of c.mesh) if (a.front + b.front > 0.9) { ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); }
			ctx.stroke();
			// dust: square particles, back smaller + dimmer
			for (const d of c.dust) {
				const s = 0.8 + d.front * 1.6;
				ctx.fillStyle = ink((0.12 + 0.55 * d.front * d.front) * on * quiet);
				ctx.fillRect(d.sx - s / 2, d.sy - s / 2, s, s);
			}
			// gyroscope rings: solid equator + dashed tilted, counter-rotating
			ctx.lineWidth = 1;
			for (const [tilt, dash, al, spd] of [[0, [], 0.35, 1], [1.15, [3, 5], 0.25, -1.6]] as const) {
				const rr = c.r * 1.12 * grow;
				ctx.beginPath();
				for (let i = 0; i <= 48; i++) {
					const a = (i / 48) * 6.283 + c.ang * spd, z0 = Math.sin(a) * rr;
					const [x, y] = proj(c.p[0] + Math.cos(a) * rr, c.p[1] + Math.sin(tilt) * z0, c.p[2] + Math.cos(tilt) * z0);
					i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
				}
				ctx.setLineDash([...dash]); ctx.strokeStyle = ink(al * on); ctx.stroke();
			}
			ctx.setLineDash([]);
			// hub
			const hs = 4.5;
			ctx.strokeStyle = ink(on); ctx.lineWidth = 1.5; ctx.strokeRect(c.sx - hs, c.sy - hs, hs * 2, hs * 2);
			ctx.fillStyle = ink(0.9 * on); ctx.fillRect(c.sx - hs * 0.45, c.sy - hs * 0.45, hs * 0.9, hs * 0.9);
			ctx.lineWidth = 1;
		}

		// post links: faint always, strong around hover/focus
		for (const [a, b] of edges) {
			if (!shown(a) || !shown(b)) continue;
			const hot = hover === a || hover === b || focus === a || focus === b;
			ctx.strokeStyle = hot ? brand(0.8) : ink(0.08 * Math.min(a.a, b.a));
			ctx.lineWidth = hot ? 1.3 : 1;
			ctx.beginPath(); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); ctx.stroke();
		}
		ctx.lineWidth = 1;
		if (intro > 2 && edges.length && Math.random() < 0.08 && !still) {
			const [a, b] = edges[(Math.random() * edges.length) | 0];
			impulses.push(Math.random() < 0.5 ? { a, b, t: 0 } : { a: b, b: a, t: 0 });
		}
		for (let i = impulses.length - 1; i >= 0; i--) {
			const im = impulses[i];
			im.t += dt * 0.9;
			if (im.t >= 1) { im.b.flash = 1; impulses.splice(i, 1); continue; }
			if (!shown(im.a) || !shown(im.b)) continue;
			ctx.fillStyle = brand(0.95);
			ctx.fillRect(lerp(im.a.sx, im.b.sx, im.t) - 1.5, lerp(im.a.sy, im.b.sy, im.t) - 1.5, 3, 3);
		}

		// post nodes: framed squares
		for (const n of nodes) {
			if (n.a < 0.02) continue;
			const big = n === hover || n === focus || (hits?.has(n) ?? false);
			const s = (big ? 5 : 3.5) * (0.75 + 0.25 * n.front) + n.flash * 2;
			const col = big || n.flash > 0.5 ? brand : ink;
			ctx.fillStyle = col(n.a); ctx.fillRect(n.sx - s, n.sy - s, s * 2, s * 2);
			ctx.strokeStyle = col(n.a * 0.6); ctx.strokeRect(n.sx - s - 3, n.sy - s - 3, s * 2 + 6, s * 2 + 6);
		}

		// callouts: leader line from hub, label + node count; nudge up to avoid overlap
		const boxes: [number, number][] = [];
		for (const c of [...back].reverse()) {
			if (c.R < 4) continue;
			const on = active.has(c.name) ? 1 : 0.3;
			const ax = c.sx + 8, ay = c.sy - 8;
			ctx.font = "700 12px 'IBM Plex Sans KR', sans-serif";
			const sub = `${String(c.nodes.length).padStart(3, "0")} NODES`;
			const w = Math.max(ctx.measureText(c.name).width, sub.length * 5.6) + 10;
			const ex = Math.min(ax + 14, W - w - 8);
			let ey = ay - 14;
			for (let i = 0; i < 6 && boxes.some(([x, y]) => Math.abs(x - ex) < 90 && Math.abs(y - ey) < 32); i++) ey -= 32;
			boxes.push([ex, ey]);
			ctx.globalAlpha = on * Math.min(1, Math.max(0, intro - 0.8));
			ctx.strokeStyle = ink(0.75);
			ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, Math.max(ey, ay - 14)); ctx.lineTo(ex, ey); ctx.lineTo(ex + w, ey); ctx.stroke();
			ctx.fillStyle = brand(1); ctx.fillRect(ex + w - 3, ey - 1.5, 3, 3);
			ctx.fillStyle = ink(1); ctx.fillText(c.name, ex + 5, ey - 14);
			ctx.fillStyle = ink(0.55); ctx.font = "9px 'IBM Plex Mono', ui-monospace, monospace"; ctx.fillText(sub, ex + 5, ey - 3.5);
			ctx.globalAlpha = 1;
		}

		// target-lock brackets on hovered/focused node
		for (const n of [hover, focus]) {
			if (!n) continue;
			const r = 12 + Math.sin(time * 6) * 1.5, L = 4;
			ctx.strokeStyle = brand(0.95); ctx.lineWidth = 1.2; ctx.beginPath();
			for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
				ctx.moveTo(n.sx + dx * r, n.sy + dy * (r - L)); ctx.lineTo(n.sx + dx * r, n.sy + dy * r); ctx.lineTo(n.sx + dx * (r - L), n.sy + dy * r);
			}
			ctx.stroke(); ctx.lineWidth = 1;
		}

		const deg = (((rot.yaw * 57.3) % 360) + 360) % 360;
		readout.textContent = [
			`NODES ${String(nodes.length).padStart(3, "0")} · LINKS ${String(edges.length).padStart(3, "0")} · ZONES ${clusters.length}`,
			`YAW ${deg.toFixed(1).padStart(5, "0")}° PITCH ${(rot.pitch * 57.3).toFixed(1)}°`,
			focus ? `LOCK ▸ ${focus.slug}` : hits ? `QUERY ▸ ${hits.size} MATCH` : `SCAN ▸ ${"▮".repeat(1 + (((time * 3) | 0) % 6)).padEnd(6, "▯")}`,
		].join("   ");
		requestAnimationFrame(draw);
	}

	// ---- interaction ----
	const pick = (x: number, y: number) =>
		nodes.filter((n) => n.a > 0.3 && Math.hypot(n.sx - x, n.sy - y) < 14).sort((a, b) => a.z - b.z)[0] ?? null;
	const local = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

	cv.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, moved: false }; cv.setPointerCapture(e.pointerId); });
	cv.addEventListener("pointermove", (e) => {
		if (drag) {
			const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
			if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
			rot.yaw += dx * 0.006; rot.pitch = Math.max(-1.2, Math.min(1.2, rot.pitch + dy * 0.004));
			rot.v = dx * 0.0004; drag.x = e.clientX; drag.y = e.clientY;
			return;
		}
		const [x, y] = local(e);
		hover = pick(x, y);
		cv.style.cursor = hover ? "pointer" : "grab";
		if (hover) {
			tip.innerHTML = `<b>${escapeHtml(hover.title)}</b><span>${escapeHtml(hover.category)} · ${hover.date}</span>`;
			tip.style.transform = `translate(${Math.min(x + 16, W - 280)}px, ${y + 16}px)`;
		}
		tip.hidden = !hover;
	});
	cv.addEventListener("pointerup", (e) => {
		const moved = drag?.moved; drag = null;
		if (moved) return;
		const [x, y] = local(e);
		open(pick(x, y));
	});
	cv.addEventListener("pointerleave", () => { hover = null; tip.hidden = true; });

	function open(n: Node | null) {
		focus = n;
		panel.hidden = !n;
		if (!n) return;
		const rel = nodes.filter((m) => linked(n, m));
		panel.innerHTML = `
			<button class="x" type="button" aria-label="닫기" data-close>×</button>
			<div class="src">${escapeHtml(n.category.toUpperCase())} · ${n.date}</div>
			<h2>${escapeHtml(n.title)}</h2>
			<p>${escapeHtml(n.description)}</p>
			<div class="tags">${n.tags.map((t) => `<span>#${escapeHtml(t)}</span>`).join("")}</div>
			<a class="go" href="${n.url}">글 읽기 →</a>
			${rel.length ? `<div class="rel"><div class="src">LINKED · ${rel.length}</div>${rel.map((m) => `<button type="button" data-slug="${m.slug}">${escapeHtml(m.title)}</button>`).join("")}</div>` : ""}`;
	}
	panel.addEventListener("click", (e) => {
		const el = e.target as HTMLElement;
		if (el.closest("[data-close]")) open(null);
		const slug = el.closest<HTMLElement>("[data-slug]")?.dataset.slug;
		if (slug) open(nodes.find((n) => n.slug === slug) ?? null);
	});

	// Segmented control: "전체" or exactly one category.
	const ALL = "";
	function renderChips() {
		const all = active.size === clusters.length;
		const seg = (key: string, label: string, n: number, on: boolean) =>
			`<button type="button" data-cat="${escapeHtml(key)}" aria-pressed="${on}">${escapeHtml(label)}<b>${n}</b></button>`;
		chips.innerHTML = seg(ALL, "전체", nodes.length, all) + clusters.map((c) => seg(c.name, c.name, c.nodes.length, !all && active.has(c.name))).join("");
	}
	chips.addEventListener("click", (e) => {
		const cat = (e.target as HTMLElement).closest<HTMLElement>("[data-cat]")?.dataset.cat;
		if (cat === undefined) return;
		active.clear();
		if (cat === ALL) clusters.forEach((c) => active.add(c.name));
		else active.add(cat);
		renderChips();
	});
	q.addEventListener("input", () => {
		const s = q.value.trim().toLowerCase();
		hits = s ? new Set(nodes.filter((n) => [n.title, n.description, ...n.tags].join(" ").toLowerCase().includes(s))) : null;
	});
	q.form?.addEventListener("submit", (e) => { e.preventDefault(); if (hits?.size) open([...hits][0]); });
	addEventListener("keydown", (e) => {
		if (e.key === "Escape") { open(null); q.value = ""; hits = null; }
		if (e.key === "/" && !(document.activeElement instanceof HTMLInputElement)) { e.preventDefault(); q.focus(); }
	});

	renderChips();
	resize();
	requestAnimationFrame((t) => { t0 = t; last = t; draw(t); });
}
