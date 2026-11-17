import { describe, expect, it } from "vitest";
import { validateOrderTime, validateEventDate, eventDeposit, canCancelEvent, eventRefund, needsPermit, HOUR, DAY } from "@/lib/rules";
const now = new Date("2026-11-17T10:00:00Z");
const at = (ms: number) => new Date(now.getTime() + ms);
describe("rules", () => {
  it("dine-in needs 3h", () => { expect(validateOrderTime("dine-in", at(2.9 * HOUR), now)).not.toBeNull(); expect(validateOrderTime("dine-in", at(3 * HOUR), now)).toBeNull(); });
  it("takeaway needs 1h", () => { expect(validateOrderTime("takeaway", at(0.5 * HOUR), now)).not.toBeNull(); expect(validateOrderTime("takeaway", at(HOUR), now)).toBeNull(); });
  it("events 3-4 days ahead", () => { expect(validateEventDate(at(2 * DAY), now)).not.toBeNull(); expect(validateEventDate(at(3 * DAY), now)).toBeNull(); expect(validateEventDate(at(6 * DAY), now)).not.toBeNull(); });
  it("40% deposit", () => expect(eventDeposit(10000)).toBe(4000));
  it("cancel until 1 day before", () => { expect(canCancelEvent(at(DAY + HOUR), now)).toBe(true); expect(canCancelEvent(at(20 * HOUR), now)).toBe(false); });
  it("deposit non-refundable", () => expect(eventRefund(4000)).toBe(0));
  it("big event needs permit", () => { expect(needsPermit(30)).toBe(true); expect(needsPermit(10)).toBe(false); });
});
