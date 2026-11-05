// Odometer text: every digit is a 0-9 strip that slides to its value; other characters stay plain.
// Same-shaped updates (e.g. "5 / 16" -> "7 / 16") roll from the old digits; otherwise from 0.
const isDigit = (c: string) => c >= "0" && c <= "9";
const STRIP = `<span>${[..."0123456789"].join("<br>")}</span>`;

export function roll(el: HTMLElement, text: string) {
	el.setAttribute("aria-label", text);
	const cells = [...el.children] as HTMLElement[];
	const same = cells.length === text.length && [...text].every((c, i) => isDigit(c) === cells[i].classList.contains("rd"));
	if (!same) {
		el.innerHTML = [...text]
			.map((c) => (isDigit(c) ? `<span class="rd" aria-hidden="true">${STRIP}</span>` : `<span class="rc" aria-hidden="true">${c}</span>`))
			.join("");
		void el.offsetWidth; // commit the 0 position so the first move animates
	} else {
		[...text].forEach((c, i) => !isDigit(c) && (cells[i].textContent = c));
	}
	[...el.children].forEach((cell, i) => {
		if (cell.classList.contains("rd")) (cell.firstElementChild as HTMLElement).style.transform = `translateY(${-Number(text[i])}em)`;
	});
}
