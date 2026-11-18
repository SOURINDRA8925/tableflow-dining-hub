export const HOUR = 3600_000;
export const DAY = 24 * HOUR;
export const DINE_IN_MIN_HOURS = 3;
export const TAKEAWAY_MIN_HOURS = 1;
export const EVENT_MIN_DAYS = 3;
export const EVENT_MAX_DAYS = 90;
export const EVENT_DEPOSIT_RATE = 0.4;
export const EVENT_CANCEL_CUTOFF_DAYS = 1;
export const BIG_EVENT_GUESTS = 30;

export type OrderType = "dine-in" | "takeaway";

export function validateOrderTime(type: OrderType, when: Date, now = new Date()): string | null {
  const min = type === "dine-in" ? DINE_IN_MIN_HOURS : TAKEAWAY_MIN_HOURS;
  if (when.getTime() - now.getTime() < min * HOUR)
    return `${type === "dine-in" ? "Advance food orders" : "Takeaway"} must be placed at least ${min} hour${min > 1 ? "s" : ""} ahead.`;
  return null;
}

export function validateEventDate(when: Date, now = new Date()): string | null {
  const diff = when.getTime() - now.getTime();
  if (diff < EVENT_MIN_DAYS * DAY) return `Events must be booked at least ${EVENT_MIN_DAYS} days in advance.`;
  if (diff > (EVENT_MAX_DAYS + 1) * DAY) return `Events can be booked up to ${EVENT_MAX_DAYS} days in advance.`;
  return null;
}

export const eventDeposit = (total: number) => Math.round(total * EVENT_DEPOSIT_RATE);

export function canCancelEvent(when: Date, now = new Date()) {
  return when.getTime() - now.getTime() >= EVENT_CANCEL_CUTOFF_DAYS * DAY;
}

/** Deposit is never refunded on cancellation. */
export const eventRefund = (_deposit: number) => 0;

export const needsPermit = (guests: number) => guests >= BIG_EVENT_GUESTS;
