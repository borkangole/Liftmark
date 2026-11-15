/**
 * Gridline values for a chart axis: top, middle and bottom of the data. When the data is flat
 * (e.g. two weigh-ins at the same weight) these collapse to one value, and duplicates would also
 * break React keys, so they're removed. Values are compared as shown, to one decimal.
 */
export function axisTicks(lo: number, hi: number, pad: number): number[] {
  const all = [hi - pad, (hi + lo) / 2, lo + pad];
  return all.filter((v, i) => all.findIndex((o) => o.toFixed(1) === v.toFixed(1)) === i);
}
