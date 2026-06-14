/**
 * Mega-Alpha | 5-Signal Combination Engine
 * TypeScript port of the Pine Script v6 indicator.
 *
 * Signals:
 *   1. Multi-period momentum     (ROC z-scores, 3 horizons)
 *   2. Mean reversion            (RSI divergence, inverted)
 *   3. Volatility regime         (HV ratio, low vol = bullish)
 *   4. Volume microstructure     (VWAP deviation + volume surge)
 *   5. Trend quality             (EMA 8/21/55 alignment)
 *
 * Combination: dynamic IC weighting (rolling signal↔return correlation).
 * Entry: combo_z > 1.0 AND ≥4 of 5 signals bullish.
 * Exit : combo_z < −0.3 OR ≤1 of 5 signals bullish.
 */

import type { CandleBar } from './types';

export interface MegaAlphaMarker {
  time: number;
  position: 'aboveBar' | 'belowBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown';
  text: string;
  size: number;
}

export interface MegaAlphaResult {
  ema21: { time: number; value: number }[];
  ema55: { time: number; value: number }[];
  markers: MegaAlphaMarker[];
}

// ── Pure math utilities ────────────────────────────────────────────────────

function emaArr(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out = new Array<number>(values.length).fill(NaN);
  let e = values[0];
  out[0] = e;
  for (let i = 1; i < values.length; i++) {
    e = values[i] * k + e * (1 - k);
    out[i] = e;
  }
  return out;
}

function smaArr(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  let sum = 0, count = 0;
  for (let i = 0; i < values.length; i++) {
    if (!isNaN(values[i])) { sum += values[i]; count++; }
    if (i >= period && !isNaN(values[i - period])) { sum -= values[i - period]; count--; }
    if (i >= period - 1 && count > 0) out[i] = sum / count;
  }
  return out;
}

function stdevArr(values: number[], period: number): number[] {
  const out = new Array<number>(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    const slice: number[] = [];
    for (let j = i - period + 1; j <= i; j++) {
      if (!isNaN(values[j])) slice.push(values[j]);
    }
    if (slice.length < 2) continue;
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length;
    out[i] = Math.sqrt(variance);
  }
  return out;
}

function zscoreArr(values: number[], period: number): number[] {
  const mu = smaArr(values, period);
  const sd = stdevArr(values, period);
  return values.map((v, i) => {
    if (isNaN(v) || isNaN(mu[i]) || isNaN(sd[i]) || sd[i] < 1e-8) return 0;
    return (v - mu[i]) / sd[i];
  });
}

function rocArr(prices: number[], period: number): number[] {
  const out = new Array<number>(prices.length).fill(NaN);
  for (let i = period; i < prices.length; i++) {
    out[i] = (prices[i] / prices[i - period] - 1) * 100;
  }
  return out;
}

function rsiArr(prices: number[], period: number): number[] {
  const out = new Array<number>(prices.length).fill(NaN);
  if (prices.length <= period) return out;
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = prices[i] - prices[i - 1];
    if (d > 0) ag += d; else al -= d;
  }
  ag /= period; al /= period;
  out[period] = al < 1e-8 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = period + 1; i < prices.length; i++) {
    const d = prices[i] - prices[i - 1];
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = al < 1e-8 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}

function vwmaArr(prices: number[], volumes: number[], period: number): number[] {
  const out = new Array<number>(prices.length).fill(NaN);
  for (let i = period - 1; i < prices.length; i++) {
    let pv = 0, v = 0;
    for (let j = i - period + 1; j <= i; j++) { pv += prices[j] * volumes[j]; v += volumes[j]; }
    out[i] = v > 0 ? pv / v : prices[i];
  }
  return out;
}

function correlationArr(x: number[], y: number[], period: number): number[] {
  const out = new Array<number>(x.length).fill(0);
  for (let i = period - 1; i < x.length; i++) {
    const xs = x.slice(i - period + 1, i + 1);
    const ys = y.slice(i - period + 1, i + 1);
    const xm = xs.reduce((a, b) => a + b, 0) / period;
    const ym = ys.reduce((a, b) => a + b, 0) / period;
    let num = 0, xv = 0, yv = 0;
    for (let j = 0; j < period; j++) {
      num += (xs[j] - xm) * (ys[j] - ym);
      xv  += (xs[j] - xm) ** 2;
      yv  += (ys[j] - ym) ** 2;
    }
    const denom = Math.sqrt(xv * yv);
    out[i] = denom > 1e-8 ? num / denom : 0;
  }
  return out;
}

const lag = (arr: number[]) => [0, ...arr.slice(0, -1)];
const safeMax = (v: number, floor = 0.01) => Math.max(isNaN(v) ? 0 : v, floor);

// ── Main computation ────────────────────────────────────────────────────────

export function computeMegaAlpha(data: CandleBar[]): MegaAlphaResult {
  const n = data.length;
  if (n < 25) return { ema21: [], ema55: [], markers: [] };

  const closes  = data.map(d => d.close);
  const volumes = data.map(d => d.volume);

  // Adapt lookbacks to available data so shorter timeframes still produce output
  const zs_lb       = Math.min(252, Math.max(30, Math.floor(n * 0.85)));
  const ic_lb       = Math.min(63,  Math.max(10, Math.floor(n * 0.25)));
  const combo_zs_lb = Math.min(63,  Math.max(15, Math.floor(n * 0.40)));

  // ── EMAs (overlay lines) ─────────────────────────────────────────────────
  const e8  = emaArr(closes, 8);
  const e21 = emaArr(closes, 21);
  const e55 = emaArr(closes, 55);

  // ── Signal 1: Multi-Period Momentum ──────────────────────────────────────
  const sig1 = rocArr(closes, 5).map((v, i) =>
    zscoreArr(rocArr(closes, 5),  zs_lb)[i] * 0.30 +
    zscoreArr(rocArr(closes, 20), zs_lb)[i] * 0.50 +
    zscoreArr(rocArr(closes, 60), zs_lb)[i] * 0.20
  );
  // (pre-compute to avoid triple-pass)
  const zRocF = zscoreArr(rocArr(closes, 5),  zs_lb);
  const zRocM = zscoreArr(rocArr(closes, 20), zs_lb);
  const zRocS = zscoreArr(rocArr(closes, 60), zs_lb);
  const sig1v = zRocF.map((v, i) => v * 0.30 + zRocM[i] * 0.50 + zRocS[i] * 0.20);

  // ── Signal 2: Mean Reversion (RSI) ───────────────────────────────────────
  const sig2v = zscoreArr(rsiArr(closes, 14), zs_lb).map(v => -v);

  // ── Signal 3: Volatility Regime ───────────────────────────────────────────
  const rets  = closes.map((c, i) => i === 0 ? 0 : c / closes[i - 1] - 1);
  const hvS   = stdevArr(rets, 20).map(v  => isNaN(v)  ? NaN : v  * Math.sqrt(252));
  const hvL   = stdevArr(rets, 63).map(v  => isNaN(v)  ? NaN : v  * Math.sqrt(252));
  const vr    = hvL.map((l, i)  => (!isNaN(l) && !isNaN(hvS[i]) && l > 1e-8) ? hvS[i] / l : 1);
  const sig3v = zscoreArr(vr, zs_lb).map(v => -v);

  // ── Signal 4: Volume Microstructure ──────────────────────────────────────
  const vw      = vwmaArr(closes, volumes, 20);
  const vwDev   = closes.map((c, i) => !isNaN(vw[i]) && vw[i] > 1e-8 ? (c - vw[i]) / vw[i] : 0);
  const volAvg  = smaArr(volumes, 20);
  const volR    = volumes.map((v, i) => !isNaN(volAvg[i]) && volAvg[i] > 0 ? v / volAvg[i] : 1);
  const zVwDev  = zscoreArr(vwDev, zs_lb);
  const zVolR   = zscoreArr(volR,  zs_lb);
  const sig4v   = zVwDev.map((v, i) => v + zVolR[i] * 0.5);

  // ── Signal 5: Trend Quality (EMA alignment) ───────────────────────────────
  const sig5v = closes.map((c, i) => {
    if (isNaN(e8[i]) || isNaN(e21[i]) || isNaN(e55[i])) return 0;
    return (Math.sign(e8[i] - e21[i]) + Math.sign(e21[i] - e55[i]) + Math.sign(c - e55[i])) / 3;
  });

  // ── Dynamic IC Weighting (lagged signal → return correlation) ─────────────
  const curRet = closes.map((c, i) => i === 0 ? 0 : c / closes[i - 1] - 1);
  const ic1 = correlationArr(lag(sig1v), curRet, ic_lb);
  const ic2 = correlationArr(lag(sig2v), curRet, ic_lb);
  const ic3 = correlationArr(lag(sig3v), curRet, ic_lb);
  const ic4 = correlationArr(lag(sig4v), curRet, ic_lb);
  const ic5 = correlationArr(lag(sig5v), curRet, ic_lb);

  // ── Weighted Combo Score ──────────────────────────────────────────────────
  const comboRaw = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    const w1 = safeMax(ic1[i]); const w2 = safeMax(ic2[i]);
    const w3 = safeMax(ic3[i]); const w4 = safeMax(ic4[i]);
    const w5 = safeMax(ic5[i]);
    const wt = w1 + w2 + w3 + w4 + w5;
    comboRaw[i] = (sig1v[i]*(w1/wt) + sig2v[i]*(w2/wt) + sig3v[i]*(w3/wt) +
                   sig4v[i]*(w4/wt) + sig5v[i]*(w5/wt));
  }
  const comboZ = zscoreArr(comboRaw, combo_zs_lb);

  // ── BUY / EXIT rules ──────────────────────────────────────────────────────
  const ENTRY = 1.0, EXIT = -0.3, MIN_BULL = 4;
  const MIN_WARMUP = ic_lb + combo_zs_lb + 5;

  const isLong: boolean[] = [];
  const isExit: boolean[] = [];
  for (let i = 0; i < n; i++) {
    const bulls = [sig1v, sig2v, sig3v, sig4v, sig5v].filter(s => s[i] > 0).length;
    isLong.push(comboZ[i] > ENTRY && bulls >= MIN_BULL);
    isExit.push(comboZ[i] < EXIT  || bulls <= 1);
  }

  const markers: MegaAlphaMarker[] = [];
  for (let i = 1; i < n; i++) {
    if (i < MIN_WARMUP) continue;
    if (isLong[i] && !isLong[i - 1]) {
      markers.push({ time: data[i].time, position: 'belowBar', color: '#00FF88', shape: 'arrowUp',   text: 'BUY',  size: 1.5 });
    }
    if (isExit[i] && !isExit[i - 1]) {
      markers.push({ time: data[i].time, position: 'aboveBar', color: '#FF4444', shape: 'arrowDown', text: 'EXIT', size: 1.5 });
    }
  }
  // lightweight-charts requires markers sorted ascending by time
  markers.sort((a, b) => a.time - b.time);

  return {
    ema21: data.map((d, i) => ({ time: d.time, value: e21[i] })).filter(d => !isNaN(d.value)),
    ema55: data.map((d, i) => ({ time: d.time, value: e55[i] })).filter(d => !isNaN(d.value)),
    markers,
  };
}
