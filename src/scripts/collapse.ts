// `sudo rm -rf /` easter egg: everything on screen falls off the page, then the
// assembly animation puts it back together.
import { hide, placeAll, sleep } from "@/scripts/assemble";

export async function collapse() {
	if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	const els = [
		...document.querySelectorAll<HTMLElement>(
			"#site-header .logo, #site-header nav a, #site-header .hbtn, main .hero, main .sec-h, main .chips, main .post-card, footer",
		),
	].filter((el) => {
		const r = el.getBoundingClientRect();
		return r.bottom > 0 && r.top < innerHeight && r.width;
	});
	const falls = els.map((el, i) => {
		const r = el.getBoundingClientRect();
		const spin = (Math.random() - 0.5) * 50;
		return el.animate(
			[{ transform: "none" }, { transform: `translate(${(Math.random() - 0.5) * 120}px, ${innerHeight - r.top + 80}px) rotate(${spin}deg)` }],
			{ duration: 700 + Math.random() * 400, delay: (els.length - i) * 25 + Math.random() * 200, easing: "cubic-bezier(0.55, 0, 0.9, 0.45)", fill: "forwards" },
		);
	});
	await Promise.all(falls.map((a) => a.finished));
	hide(els);
	for (const a of falls) a.cancel();
	await sleep(700);
	await placeAll(els, 60);
}
