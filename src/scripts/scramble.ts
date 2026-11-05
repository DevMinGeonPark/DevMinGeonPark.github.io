// Terminal-ish text effects for the about page.
const GLYPHS = "!<>-_\\/[]{}=+*^?#01";

// Random glyphs settle left to right into the real text.
export function scramble(el: HTMLElement, ms = 700) {
	const text = el.dataset.text ?? (el.dataset.text = el.textContent ?? "");
	const start = performance.now();
	const tick = (now: number) => {
		const t = Math.min(1, Math.max(0, now - start) / ms);
		const done = Math.floor(t * text.length);
		el.textContent = [...text]
			.map((c, i) => (i < done || c === " " ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
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
