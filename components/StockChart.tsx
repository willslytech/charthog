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

const BULL   = '#22c55e';
const BEAR   = '#ef4444';
const ACCENT = '#38bdf8';

interface StockChartProps {
  data: CandleBar[];
  showHogIndicator?: boolean;
  height?: number;
}

export function StockChart({ data, showHogIndicator = false, height = 500 }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  const candleRef    = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef    = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema21Ref     = useRef<ISeriesApi<'Line'> | null>(null);
  const ema55Ref     = useRef<ISeriesApi<'Line'> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef   = useRef<any>(null);

  // ── Initialize chart once ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
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

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: BULL, downColor: BEAR,
      borderUpColor: BULL, borderDownColor: BEAR,
      wickUpColor: BULL,   wickDownColor: BEAR,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });

    // EMA overlay lines (hidden until Mega-Alpha is toggled on)
    const ema21Series = chart.addSeries(LineSeries, {
      color: '#22d3ee',
      lineWidth: 2,
      title: 'EMA 21',
      lastValueVisible: false,
      priceLineVisible: false,
    });
    const ema55Series = chart.addSeries(LineSeries, {
      color: '#fb923c',
      lineWidth: 2,
      title: 'EMA 55',
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // Attach marker plugin to the candle series
    markersRef.current = createSeriesMarkers(candleSeries, []);

    chartRef.current  = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;
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
      ema21Ref.current = ema55Ref.current = markersRef.current = null;
    };
  }, [height]);

  // ── Update candle + volume data ──────────────────────────────────────────
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
    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // ── Mega-Alpha indicator ─────────────────────────────────────────────────
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
      {!data.length && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-slate-500 text-sm font-mono">No chart data</p>
        </div>
      )}
    </div>
  );
}
