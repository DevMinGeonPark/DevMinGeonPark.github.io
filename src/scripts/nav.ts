// Page-to-page polish. Navigation itself stays plain MPA links; the browser's
// cross-document view transition (base.css) animates the swap.
const root = document.documentElement;

addEventListener("click", (e) => {
	const a = (e.target as Element).closest?.("a");
	if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
	const url = new URL(a.href, location.href);
	if (a.target || a.hasAttribute("download") || url.origin !== location.origin) return;
	if (url.pathname === location.pathname && url.hash) return; // in-page anchor
	// Morph the clicked card's cover into the post's cover. Only one element may hold the name.
	for (const el of document.querySelectorAll<HTMLElement>("[data-vt-cover]")) el.style.viewTransitionName = "";
	const img = a.querySelector<HTMLElement>(".post-card img");
	if (img) {
		img.dataset.vtCover = "";
		img.style.viewTransitionName = "cover";
	}
	root.classList.add("leaving");
});

// Coming back through the back/forward cache: drop the loading state and stale names.
addEventListener("pageshow", () => {
	root.classList.remove("leaving");
	for (const el of document.querySelectorAll<HTMLElement>("[data-vt-cover]")) el.style.viewTransitionName = "";
});
