/**
 * Squeeze Momentum Indicator — TypeScript port of LazyBear's Pine Script.
 *
 * Algorithm:
 *   1. Bollinger Bands (BB): SMA ± 2 × StdDev (20-bar)
 *   2. Keltner Channels (KC): SMA ± 1.5 × ATR (20-bar, true range)
 *   3. Squeeze: sqzOn  = BB inside KC (compression)
 *               sqzOff = BB outside KC (expansion / release)
 *   4. Momentum: linreg(close − midpoint(KC), 20, 0)
 *
 * Bar colors:
 *   lime   — momentum positive AND rising
 *   green  — momentum positive but falling
 *   red    — momentum negative AND falling
 *   maroon — momentum negative but rising
 *
 * Dot colors (at zero line):
 *   blue  (#4488FF) — no squeeze (BB wider than KC in both directions)
 *   black (#111111) — squeeze ON  (compressed)
 *   gray  (#888888) — squeeze OFF (just released)
 */

import type { CandleBar } from './types';

// ── Math helpers ──────────────────────────────────────────────────────────────

function smaArr(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  let sum = 0, count = 0;
  for (let i = 0; i < values.length; i++) {
    if (!isNaN(values[i])) { sum += values[i]; count++; }
    if (i >= period && !isNaN(values[i - period])) { sum -= values[i - period]; count--; }
    if (i >= period - 1 && count === period) out[i] = sum / period;
  }
  return out;
}

function stdevArr(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    let sum = 0, sum2 = 0;
    for (let j = i - period + 1; j <= i; j++) {
      const v = values[j];
      sum += v; sum2 += v * v;
    }
    const mean = sum / period;
    out[i] = Math.sqrt(Math.max(0, sum2 / period - mean * mean));
  }
  return out;
}

function trueRangeArr(highs: number[], lows: number[], closes: number[]): number[] {
  const out = new Array<number>(highs.length).fill(NaN);
  out[0] = highs[0] - lows[0];
  for (let i = 1; i < highs.length; i++) {
    const hl  = highs[i] - lows[i];
    const hpc = Math.abs(highs[i] - closes[i - 1]);
    const lpc = Math.abs(lows[i]  - closes[i - 1]);
    out[i] = Math.max(hl, hpc, lpc);
  }
  return out;
}

function highestArr(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    let max = -Infinity;
    for (let j = i - period + 1; j <= i; j++) max = Math.max(max, values[j]);
    out[i] = max;
  }
  return out;
}

function lowestArr(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    let min = Infinity;
    for (let j = i - period + 1; j <= i; j++) min = Math.min(min, values[j]);
    out[i] = min;
  }
  return out;
}

function linregArr(values: number[], period: number): number[] {
  const out  = new Array<number>(values.length).fill(NaN);
  const n    = period;
  const sumX  = n * (n - 1) / 2;
  const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return out;
  for (let i = n - 1; i < values.length; i++) {
    let sumY = 0, sumXY = 0;
    for (let j = 0; j < n; j++) {
      const y = values[i - n + 1 + j];
      if (isNaN(y)) { sumY = NaN; break; }
      sumY  += y;
      sumXY += j * y;
    }
    if (isNaN(sumY)) continue;
    const slope     = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    out[i] = slope * (n - 1) + intercept;
  }
  return out;
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface SQZBar {
  time:     number;
  value:    number;
  barColor: string;
  dotColor: string;
}

export function computeSqueezeMomentum(data: CandleBar[]): SQZBar[] {
  if (data.length < 20) return [];

  const BB_LEN = 20, BB_MULT = 2.0;
  const KC_LEN = 20, KC_MULT = 1.5;

  const closes = data.map(d => d.close);
  const highs  = data.map(d => d.high);
  const lows   = data.map(d => d.low);

  // Bollinger Bands
  const basis   = smaArr(closes, BB_LEN);
  const dev     = stdevArr(closes, BB_LEN).map(v => v * BB_MULT);
  const upperBB = basis.map((b, i) => b + dev[i]);
  const lowerBB = basis.map((b, i) => b - dev[i]);

  // Keltner Channels (true-range based)
  const ma      = smaArr(closes, KC_LEN);
  const tr      = trueRangeArr(highs, lows, closes);
  const rangema = smaArr(tr, KC_LEN);
  const upperKC = ma.map((m, i) => m + rangema[i] * KC_MULT);
  const lowerKC = ma.map((m, i) => m - rangema[i] * KC_MULT);

  // Momentum: linreg(close − (highest_high + lowest_low + sma_close) / 3, 20)
  const highestH = highestArr(highs,  KC_LEN);
  const lowestL  = lowestArr(lows,    KC_LEN);
  const smaC     = smaArr(closes, KC_LEN);
  const delta    = closes.map((c, i) => {
    if (isNaN(highestH[i]) || isNaN(lowestL[i]) || isNaN(smaC[i])) return NaN;
    return c - (highestH[i] + lowestL[i] + smaC[i]) / 3;
  });
  const val = linregArr(delta, KC_LEN);

  const result: SQZBar[] = [];
  let prevV = 0;

  for (let i = 0; i < data.length; i++) {
    const v = val[i];
    if (isNaN(v)) continue;

    const sqzOn  = !isNaN(lowerBB[i]) && lowerBB[i] > lowerKC[i] && upperBB[i] < upperKC[i];
    const sqzOff = !isNaN(lowerBB[i]) && lowerBB[i] < lowerKC[i] && upperBB[i] > upperKC[i];
    const noSqz  = !sqzOn && !sqzOff;

    // Histogram color — matches LazyBear's bcolor logic
    let barColor: string;
    if (v > 0) barColor = v >= prevV ? '#00FF00' : '#008000'; // lime / green
    else       barColor = v <= prevV ? '#FF0000' : '#8B0000'; // red  / maroon

    // Dot color — squeeze state
    const dotColor = noSqz ? '#4488FF' : sqzOn ? '#111111' : '#888888';

    result.push({ time: data[i].time, value: v, barColor, dotColor });
    prevV = v;
  }
  return result;
}
