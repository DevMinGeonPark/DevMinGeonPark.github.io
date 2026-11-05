// Home first-visit sequence (boot splash -> terminal -> hero panel -> posts).
// Elements marked .pc-hide wait invisible; place() drops them in after `delay` ms.

/** True while this page load runs the boot sequence (set before paint in index.astro). */
export const bootSequence = () => document.documentElement.classList.contains("booting") || document.documentElement.classList.contains("assembling");

export function hide(els: Iterable<HTMLElement>) {
	for (const el of els) el.classList.add("pc-hide");
}

export function place(el: HTMLElement, delay = 0) {
	el.style.setProperty("--d", `${delay}ms`);
	el.classList.replace("pc-hide", "pc") || el.classList.add("pc");
	// Drop the animation afterwards so hover transforms work again.
	el.addEventListener("animationend", () => el.classList.remove("pc"), { once: true });
}

/** Place a list one after another; resolves when the last one has started. */
export function placeAll(els: HTMLElement[], step: number, start = 0) {
	els.forEach((el, i) => place(el, start + i * step));
	return new Promise<void>((r) => setTimeout(r, start + els.length * step));
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const all = (sel: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(sel)];

/**
 * Pages with <Base assemble>: hide the header pieces plus `pieces`, reveal the page shell,
 * then drop the header in. Resolves false when this load doesn't play the sequence.
 */
export async function startAssembly(pieces: HTMLElement[]): Promise<boolean> {
	const root = document.documentElement;
	if (!root.classList.contains("pre")) return false;
	const header = all("#site-header .logo, #site-header nav a, #site-header .hbtn");
	hide([...header, ...pieces]);
	root.classList.remove("pre");
	await placeAll(header, 50, 80);
	return true;
}

/** Place what's on screen now one by one; the rest as it scrolls in. */
export async function placeInView(els: HTMLElement[], step = 120) {
	const io = new IntersectionObserver((entries) => {
		let k = 0;
		for (const e of entries) {
			if (!e.isIntersecting) continue;
			place(e.target as HTMLElement, k++ * 90);
			io.unobserve(e.target);
		}
	}, { rootMargin: "0px 0px -6% 0px" });
	const now = els.filter((el) => el.getBoundingClientRect().top < innerHeight);
	for (const el of els) if (!now.includes(el)) io.observe(el);
	await placeAll(now, step);
	document.documentElement.classList.remove("assembling");
}

export { all };
