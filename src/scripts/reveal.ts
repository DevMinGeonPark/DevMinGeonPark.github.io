// Fade-up elements marked [data-reveal] as they enter the viewport.
// Content stays visible without JS: hiding only starts once this runs.
export function reveal() {
	const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
	if (!("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
	document.documentElement.classList.add("reveal-on");
	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				e.target.classList.add("in");
				io.unobserve(e.target);
			}
		},
		{ rootMargin: "0px 0px -8% 0px" },
	);
	for (const el of els) io.observe(el);
}
