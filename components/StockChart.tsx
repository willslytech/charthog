'use client';

import { useEffect, useRef } from 'react';
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
import { computeSqueezeMomentum } from '@/lib/squeezeMomentum';

const BULL         = '#22c55e';
const BEAR         = '#ef4444';
const ACCENT       = '#38bdf8';
const EMA200_COLOR = '#a855f7';

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

interface StockChartProps {
  data: CandleBar[];
  showHogIndicator?: boolean;
  height?: number;
  isDark?: boolean;
}

export function StockChart({ data, showHogIndicator = false, height = 500, isDark = true }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef    = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema200Ref    = useRef<ISeriesApi<'Line'> | null>(null);
  const ema21Ref     = useRef<ISeriesApi<'Line'> | null>(null);
  const ema55Ref     = useRef<ISeriesApi<'Line'> | null>(null);
  const sqzHistRef   = useRef<ISeriesApi<'Histogram'> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef   = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sqzDotsRef   = useRef<any>(null);

  // ── Initialize chart once ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: chartTextColor(isDark),
        fontSize: 11,
        fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
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

    // ── Volume (bottom 12%) ──────────────────────────────────────────────────
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.88, bottom: 0 } });

    // ── Squeeze Momentum (above volume, ~20% height) ─────────────────────────
    const sqzSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: 'sqz',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    chart.priceScale('sqz').applyOptions({ scaleMargins: { top: 0.68, bottom: 0.12 } });
    sqzDotsRef.current = createSeriesMarkers(sqzSeries, []);

    // ── EMA 200 — always visible ─────────────────────────────────────────────
    const ema200Series = chart.addSeries(LineSeries, {
      color: EMA200_COLOR,
      lineWidth: 2,
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

    chartRef.current   = chart;
    candleRef.current  = candleSeries;
    volumeRef.current  = volumeSeries;
    sqzHistRef.current = sqzSeries;
    ema200Ref.current  = ema200Series;
    ema21Ref.current   = ema21Series;
    ema55Ref.current   = ema55Series;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = candleRef.current = volumeRef.current = null;
      sqzHistRef.current = ema200Ref.current = null;
      ema21Ref.current = ema55Ref.current = markersRef.current = sqzDotsRef.current = null;
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

  // ── Update candle, volume, EMA 200, and SQZ data ─────────────────────────
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

    // Squeeze Momentum histogram + dots
    if (sqzHistRef.current && sqzDotsRef.current) {
      const sqzData = computeSqueezeMomentum(data);
      sqzHistRef.current.setData(
        sqzData.map(b => ({ time: b.time as UTCTimestamp, value: b.value, color: b.barColor }))
      );
      sqzDotsRef.current.setMarkers(
        sqzData.map(b => ({
          time:     b.time as UTCTimestamp,
          position: b.value >= 0 ? ('belowBar' as const) : ('aboveBar' as const),
          color:    b.dotColor,
          shape:    'circle' as const,
          size:     0.5,
          text:     '',
        }))
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

          {/* SQZ Momentum */}
          <div className="flex items-center gap-2 mt-0.5 pt-1 border-t border-slate-700/50">
            <span className="flex gap-[2px]">
              <span className="w-[5px] h-3 rounded-sm inline-block" style={{ background: '#00FF00' }} />
              <span className="w-[5px] h-3 rounded-sm inline-block" style={{ background: '#008000' }} />
              <span className="w-[5px] h-3 rounded-sm inline-block" style={{ background: '#FF0000' }} />
              <span className="w-[5px] h-3 rounded-sm inline-block" style={{ background: '#8B0000' }} />
            </span>
            <span className="text-xs font-mono text-slate-300">SQZ Mom</span>
          </div>

          {/* Dot legend */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: '#111111', border: '1px solid #555' }} />
              On
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block bg-[#888888]" />
              Off
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full inline-block bg-[#4488FF]" />
              No sqz
            </span>
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
}
