// Pure activity math for the writing heatmap. No DOM, so it runs in the
// browser terminal and in the node test alike.

const DAY = 86_400_000;

export const dayKey = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export type Activity = {
	/** Column-major (week by week, Sunday first), oldest week first. */
	cells: { key: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[];
	activeLast30: number;
	streak: number;
};

const level = (n: number): 0 | 1 | 2 | 3 | 4 =>
	n === 0 ? 0 : n < 2 ? 1 : n < 4 ? 2 : n < 6 ? 3 : 4;

/** @param dates ISO yyyy-mm-dd strings, one per post (repeats = more posts that day). */
export function buildActivity(
	dates: string[],
	today: Date,
	weeks: number,
): Activity {
	const counts = new Map<string, number>();
	for (const d of dates) counts.set(d, (counts.get(d) ?? 0) + 1);

	const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
	const start = new Date(end.getTime() - ((weeks - 1) * 7 + end.getDay()) * DAY);

	const cells: Activity["cells"] = [];
	for (let t = start.getTime(); t <= end.getTime(); t += DAY) {
		const key = dayKey(new Date(t));
		const count = counts.get(key) ?? 0;
		cells.push({ key, count, level: level(count) });
	}

	const has = (offset: number) =>
		counts.has(dayKey(new Date(end.getTime() - offset * DAY)));
	let activeLast30 = 0;
	for (let i = 0; i < 30; i++) if (has(i)) activeLast30++;
	let streak = 0;
	while (has(streak)) streak++;

	return { cells, activeLast30, streak };
}
