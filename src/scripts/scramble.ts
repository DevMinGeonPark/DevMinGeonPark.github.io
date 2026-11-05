// Terminal-ish text effects for the about page.
const GLYPHS = "!<>-_\\/[]{}=+*^?#01";
// Full-width stand-ins for CJK so a Korean line keeps its width (no reflow while it settles).
const WIDE = "＃＊＋＝／＜＞［］｛｝？！０１";
const glyph = (c: string) => {
	const set = c.charCodeAt(0) > 0x2e80 ? WIDE : GLYPHS;
	return set[(Math.random() * set.length) | 0];
};

// Random glyphs settle left to right into the real text.
export function scramble(el: HTMLElement, ms = 700) {
	const text = el.dataset.text ?? (el.dataset.text = el.textContent ?? "");
	const start = performance.now();
	const tick = (now: number) => {
		const t = Math.min(1, Math.max(0, now - start) / ms);
		const done = Math.floor(t * text.length);
		el.textContent = [...text]
			.map((c, i) => (i < done || c === " " ? c : glyph(c)))
			.join("");
		if (t < 1) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}

// Type an element's text out character by character.
export function typeOut(el: HTMLElement, speed = 28): Promise<void> {
	const text = el.textContent ?? "";
	el.textContent = "";
	return new Promise((done) => {
		let n = 0;
		const step = () => {
			el.textContent = text.slice(0, ++n);
			n < text.length ? setTimeout(step, speed) : done();
		};
		text ? step() : done();
	});
}

export const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
