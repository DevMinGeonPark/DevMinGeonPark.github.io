// Theme state lives on <html data-theme>; the inline head script restores it.
function apply() {
	const root = document.documentElement;
	const current =
		root.dataset.theme ??
		(matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
	const next = current === "dark" ? "light" : "dark";
	root.dataset.theme = next;
	try {
		localStorage.setItem("theme", next);
	} catch {
		// storage blocked: theme still applies for this page view
	}
}

/** Flip the theme; with a click, the new theme spreads as a circle from the pointer. */
export function toggleTheme(e?: MouseEvent) {
	const root = document.documentElement;
	if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return apply();
	const x = e?.clientX || innerWidth - 40;
	const y = e?.clientY || 30;
	const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
	root.classList.add("theme-vt");
	const t = document.startViewTransition(apply);
	t.ready.then(() =>
		root.animate(
			{ clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
			{ duration: 550, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
		),
	);
	t.finished.finally(() => root.classList.remove("theme-vt"));
}
