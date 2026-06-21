'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { CandleBar } from '@/lib/types';
import { computeMegaAlpha } from '@/lib/megaAlpha';

const BULL         = '#22c55e';
const BEAR         = '#ef4444';
const ACCENT       = '#38bdf8';
const EMA200_COLOR = '#a855f7';
const VWAP_COLOR   = '#f59e0b';
const RSI_COLOR    = '#60a5fa';

function chartTextColor(isDark: boolean) {
  return isDark ? '#94a3b8' : '#1d4ed8';
}

function computeEmaValues(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let e = closes[0];
  out.push(e);
  for (let i = 1; i < closes.length; i++) {
    e = closes[i] * k + e * (1 - k);
    out.push(e);
  }
  return out;
}

function computeRSI(data: CandleBar[], period = 14): { time: number; value: number }[] {
  if (data.length < period + 1) return [];
  const result: { time: number; value: number }[] = [];
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = data[i].close - data[i - 1].close;
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  result.push({ time: data[period].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  for (let i = period + 1; i < data.length; i++) {
    const d = data[i].close - data[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    result.push({ time: data[i].time, value: avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss) });
  }
  return result;
}

function computeVWAP(data: CandleBar[]): { time: number; value: number }[] {
  const result: { time: number; value: number }[] = [];
  let cumTPV = 0;
  let cumVol = 0;
  let prevDate = '';
  for (const bar of data) {
    const date = new Date(bar.time * 1000).toISOString().slice(0, 10);
    if (date !== prevDate) { cumTPV = 0; cumVol = 0; prevDate = date; }
    const tp = (bar.high + bar.low + bar.close) / 3;
    cumTPV += tp * bar.volume;
    cumVol += bar.volume;
    if (cumVol > 0) result.push({ time: bar.time, value: cumTPV / cumVol });
  }
  return result;
}

interface StockChartProps {
  data: CandleBar[];
  showHogIndicator?: boolean;
  height?: number;
  isDark?: boolean;
}

export interface StockChartHandle {
  saveChart: (filename?: string) => void;
}

export const StockChart = forwardRef<StockChartHandle, StockChartProps>(
function StockChart({ data, showHogIndicator = false, height = 500, isDark = true }, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef    = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema200Ref    = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21Ref     = useRef<ISeriesApi<'Line'> | null>(null);
  const ema55Ref     = useRef<ISeriesApi<'Line'> | null>(null);
  const vwapRef      = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiRef       = useRef<ISeriesApi<'Line'> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef   = useRef<any>(null);

  useImperativeHandle(ref, () => ({
    saveChart(filename = 'chart') {
      const canvas = chartRef.current?.takeScreenshot();
      if (!canvas) return;
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${filename}.png`;
      a.click();
    },
  }));

  // ── Initialize chart once ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: chartTextColor(isDark),
        fontSize: 11,
        fontFamily: "'Roboto Mono', monospace",
      },
      grid: {
        vertLines: { color: 'rgba(148,163,184,0.06)' },
        horzLines: { color: 'rgba(148,163,184,0.06)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: ACCENT, width: 1, labelBackgroundColor: '#0f172a' },
        horzLine: { color: ACCENT, width: 1, labelBackgroundColor: '#0f172a' },
      },
      rightPriceScale: { borderColor: 'rgba(148,163,184,0.1)' },
      timeScale: {
        borderColor: 'rgba(148,163,184,0.1)',
        timeVisible: true,
        secondsVisible: false,
        fixLeftEdge: true,
        fixRightEdge: true,
      },
      width: containerRef.current.clientWidth,
      height,
    });

    // ── Main candle series ───────────────────────────────────────────────────
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: BULL, downColor: BEAR,
      borderUpColor: BULL, borderDownColor: BEAR,
      wickUpColor: BULL,   wickDownColor: BEAR,
    });

    // ── Volume (bottom 10%) ──────────────────────────────────────────────────
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.90, bottom: 0 } });

    // ── RSI 14 (18% panel above volume) ──────────────────────────────────────
    const rsiSeries = chart.addSeries(LineSeries, {
      priceScaleId: 'rsi',
      color: RSI_COLOR,
      lineWidth: 1,
      lastValueVisible: true,
      priceLineVisible: false,
    });
    chart.priceScale('rsi').applyOptions({ scaleMargins: { top: 0.72, bottom: 0.10 } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (rsiSeries as any).applyOptions({ autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }) });
    rsiSeries.createPriceLine({ price: 70, color: '#ef4444', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
    rsiSeries.createPriceLine({ price: 50, color: '#475569', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });
    rsiSeries.createPriceLine({ price: 30, color: '#22c55e', lineWidth: 1, lineStyle: 2, axisLabelVisible: false, title: '' });

    // ── EMA 200 — always visible ─────────────────────────────────────────────
    const ema200Series = chart.addSeries(LineSeries, {
      color: EMA200_COLOR,
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // ── VWAP — session-resetting, always visible ──────────────────────────────
    const vwapSeries = chart.addSeries(LineSeries, {
      color: VWAP_COLOR,
      lineWidth: 2,
      lineStyle: 1, // dashed
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // ── EMA 21 & 55 — shown with Mega-Alpha overlay ──────────────────────────
    const ema21Series = chart.addSeries(LineSeries, {
      color: '#22d3ee',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const ema55Series = chart.addSeries(LineSeries, {
      color: '#fb923c',
      lineWidth: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    markersRef.current = createSeriesMarkers(candleSeries, []);

    chartRef.current  = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;
    ema200Ref.current = ema200Series;
    vwapRef.current   = vwapSeries;
    rsiRef.current    = rsiSeries;
    ema21Ref.current  = ema21Series;
    ema55Ref.current  = ema55Series;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = candleRef.current = volumeRef.current = null;
      ema200Ref.current = vwapRef.current = rsiRef.current = null;
      ema21Ref.current = ema55Ref.current = markersRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [height]);

  // ── Sync text color when theme toggles ───────────────────────────────────
  useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.applyOptions({
      layout: { textColor: chartTextColor(isDark) },
    });
  }, [isDark]);

  // ── Update candle, volume, EMA 200, and VWAP data ────────────────────────
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current || !data.length) return;

    candleRef.current.setData(
      data.map(d => ({
        time:  d.time  as UTCTimestamp,
        open:  d.open,
        high:  d.high,
        low:   d.low,
        close: d.close,
      }))
    );

    volumeRef.current.setData(
      data.map(d => ({
        time:  d.time as UTCTimestamp,
        value: d.volume,
        color: d.close >= d.open ? `${BULL}30` : `${BEAR}30`,
      }))
    );

    // EMA 200
    if (ema200Ref.current) {
      const ema200Values = computeEmaValues(data.map(d => d.close), 200);
      ema200Ref.current.setData(
        data.map((d, i) => ({ time: d.time as UTCTimestamp, value: ema200Values[i] }))
      );
    }

    // VWAP — session-resetting
    if (vwapRef.current) {
      const vwapData = computeVWAP(data);
      vwapRef.current.setData(
        vwapData.map(d => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
    }

    // RSI 14
    if (rsiRef.current) {
      const rsiData = computeRSI(data);
      rsiRef.current.setData(
        rsiData.map(d => ({ time: d.time as UTCTimestamp, value: d.value }))
      );
    }

    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // ── Mega-Alpha overlay (EMA 21, EMA 55, buy/sell markers) ────────────────
  useEffect(() => {
    if (!ema21Ref.current || !ema55Ref.current || !markersRef.current) return;

    if (!showHogIndicator || !data.length) {
      ema21Ref.current.setData([]);
      ema55Ref.current.setData([]);
      markersRef.current.setMarkers([]);
      return;
    }

    const { ema21, ema55, markers } = computeMegaAlpha(data);

    ema21Ref.current.setData(ema21.map(d => ({ time: d.time as UTCTimestamp, value: d.value })));
    ema55Ref.current.setData(ema55.map(d => ({ time: d.time as UTCTimestamp, value: d.value })));
    markersRef.current.setMarkers(
      markers.map(m => ({ ...m, time: m.time as UTCTimestamp }))
    );
  }, [data, showHogIndicator]);

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="w-full" />

      {/* Legend */}
      {data.length > 0 && (
        <div className="absolute top-3 left-3 flex flex-col gap-1 bg-slate-900/85 backdrop-blur-sm rounded-lg px-3 py-2 pointer-events-none">
          {/* EMA 200 */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-[2px] rounded-full inline-block" style={{ background: EMA200_COLOR }} />
            <span className="text-xs font-mono text-slate-300">EMA 200</span>
          </div>

          {/* Mega-Alpha EMAs */}
          {showHogIndicator && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-5 h-[2px] bg-cyan-400 rounded-full inline-block" />
                <span className="text-xs font-mono text-slate-300">EMA 21</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-[2px] bg-orange-400 rounded-full inline-block" />
                <span className="text-xs font-mono text-slate-300">EMA 55</span>
              </div>
            </>
          )}

          {/* VWAP */}
          <div className="flex items-center gap-2 mt-0.5 pt-1 border-t border-slate-700/50">
            <span className="w-5 inline-block" style={{ borderTop: `2px dashed ${VWAP_COLOR}` }} />
            <span className="text-xs font-mono text-slate-300">VWAP</span>
          </div>

          {/* RSI */}
          <div className="flex items-center gap-2">
            <span className="w-5 h-[2px] rounded-full inline-block" style={{ background: RSI_COLOR }} />
            <span className="text-xs font-mono text-slate-300">RSI 14</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-[1px] inline-block bg-red-500" />70</span>
            <span className="flex items-center gap-1"><span className="w-2 h-[1px] inline-block bg-slate-600" />50</span>
            <span className="flex items-center gap-1"><span className="w-2 h-[1px] inline-block bg-green-500" />30</span>
          </div>
        </div>
      )}

      {!data.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-500 text-sm font-mono">No chart data</p>
        </div>
      )}
    </div>
  );
});
StockChart.displayName = 'StockChart';
