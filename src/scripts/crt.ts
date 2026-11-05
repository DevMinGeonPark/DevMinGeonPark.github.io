// CRT mode: green phosphor palette + scanlines (styles in base.css). Survives page
// changes for the session; the inline head script in Base.astro restores it before paint.
export function toggleCrt(): boolean {
	const root = document.documentElement;
	const on = !root.classList.contains("crt");
	root.classList.toggle("crt", on);
	try {
		if (on) sessionStorage.setItem("crt", "1");
		else sessionStorage.removeItem("crt");
	} catch {
		// storage blocked: mode lasts for this page only
	}
	if (on && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
		root.classList.add("crt-boot");
		setTimeout(() => root.classList.remove("crt-boot"), 700);
	}
	return on;
}

// Konami code (↑↑↓↓←→←→BA) anywhere outside text fields.
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let at = 0;
addEventListener("keydown", (e) => {
	if ((e.target as HTMLElement).closest?.("input, textarea, [contenteditable]")) return;
	const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
	at = key === KONAMI[at] ? at + 1 : key === KONAMI[0] ? 1 : 0;
	if (at === KONAMI.length) {
		at = 0;
		toggleCrt();
	}
});
