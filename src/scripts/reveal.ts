// Run `cb` once per element the first time it scrolls into view.
export function onVisible(selector: string, cb: (el: HTMLElement) => void) {
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				cb(e.target as HTMLElement);
				io.unobserve(e.target);
			}
		},
		{ rootMargin: "0px 0px -8% 0px" },
	);
	for (const el of document.querySelectorAll<HTMLElement>(selector)) io.observe(el);
}

export const motionOk = () => "IntersectionObserver" in window && !matchMedia("(prefers-reduced-motion: reduce)").matches;

// Fade-up elements marked [data-reveal] as they enter the viewport.
// Content stays visible without JS: hiding only starts once this runs.
export function reveal() {
	if (!motionOk()) return;
	document.documentElement.classList.add("reveal-on");
	onVisible("[data-reveal]", (el) => el.classList.add("in"));
}
