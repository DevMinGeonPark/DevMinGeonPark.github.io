// Run: node --test src/lib/activity.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildActivity } from "./activity.ts";

test("grid ends today, starts on a Sunday, counts streak and last 30 days", () => {
	const today = new Date(2026, 10, 4); // Wed 2026-11-04
	const a = buildActivity(
		["2026-11-04", "2026-11-03", "2026-11-03", "2026-11-01", "2026-07-20"],
		today,
		10,
	);
	assert.equal(a.cells.at(-1)?.key, "2026-11-04");
	assert.equal(new Date(a.cells[0].key).getUTCDay(), 0);
	assert.equal(a.cells.length, 9 * 7 + 4);
	assert.equal(a.streak, 2);
	assert.equal(a.activeLast30, 3);
	assert.equal(a.cells.find((c) => c.key === "2026-11-03")?.level, 2);
});
