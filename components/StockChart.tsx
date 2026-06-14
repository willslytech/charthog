'use client';

import { useEffect, useRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
} from 'lightweight-charts';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import type { CandleBar } from '@/lib/types';

const BULL = '#22c55e';
const BEAR = '#ef4444';
const ACCENT = '#38bdf8';
const HOG_COLOR = '#fb923c';

interface StockChartProps {
  data: CandleBar[];
  showHogIndicator?: boolean;
  height?: number;
}

function calcEMA(data: CandleBar[], period: number) {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((s, d) => s + d.close, 0) / period;
  const result: { time: UTCTimestamp; value: number }[] = [];

  for (let i = period - 1; i < data.length; i++) {
    if (i > period - 1) ema = data[i].close * k + ema * (1 - k);
    result.push({ time: data[i].time as UTCTimestamp, value: ema });
  }
  return result;
}

export function StockChart({ data, showHogIndicator = false, height = 500 }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const hogRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Initialize chart once
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
        vertLine: {
          color: ACCENT,
          width: 1,
          labelBackgroundColor: '#0f172a',
        },
        horzLine: {
          color: ACCENT,
          width: 1,
          labelBackgroundColor: '#0f172a',
        },
      },
      rightPriceScale: {
        borderColor: 'rgba(148,163,184,0.1)',
      },
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
      upColor: BULL,
      downColor: BEAR,
      borderUpColor: BULL,
      borderDownColor: BEAR,
      wickUpColor: BULL,
      wickDownColor: BEAR,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    chart.priceScale('vol').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    const ro = new ResizeObserver(() => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      hogRef.current = null;
    };
  }, [height]);

  // Update candle + volume data
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current || !data.length) return;

    candleRef.current.setData(
      data.map((d) => ({
        time: d.time as UTCTimestamp,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }))
    );

    volumeRef.current.setData(
      data.map((d) => ({
        time: d.time as UTCTimestamp,
        value: d.volume,
        color: d.close >= d.open ? `${BULL}30` : `${BEAR}30`,
      }))
    );

    chartRef.current?.timeScale().fitContent();
  }, [data]);

  // Hog Indicator: EMA(20) in pig orange
  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    if (showHogIndicator && !hogRef.current) {
      hogRef.current = chartRef.current.addSeries(LineSeries, {
        color: HOG_COLOR,
        lineWidth: 2,
        title: 'Hog EMA(20)',
        lastValueVisible: true,
        priceLineVisible: false,
      });
    }

    if (hogRef.current) {
      hogRef.current.setData(showHogIndicator ? calcEMA(data, 20) : []);
    }
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
