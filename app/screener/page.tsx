'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AppNav } from '@/components/AppNav';
import { ChevronUp, ChevronDown, ChevronsUpDown, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { STOCK_META } from '@/lib/stockMeta';
import { type SavedWatchlist, getWatchlists } from '@/lib/watchlistStore';

// ── Types ────────────────────────────────────────────────────────────────────
interface Quote {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  marketCap?: number;
  trailingPE?: number;
  forwardPE?: number;
  priceToBook?: number;
  priceToSalesTrailing12Months?: number;
  trailingAnnualDividendYield?: number;
  dividendYield?: number;
  sector?: string;
  industry?: string;
  country?: string;
  exchange: string;
  beta?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fiftyDayAverage?: number;
  twoHundredDayAverage?: number;
  averageDailyVolume3Month?: number;
  returnOnEquity?: number;
  profitMargins?: number;
  grossMargins?: number;
  operatingMargins?: number;
}

interface FilterOption { label: string; value: string }
interface FilterDef { key: string; label: string; options: FilterOption[] }
type FilterState = Record<string, string>;
type TabKey = 'descriptive' | 'fundamental' | 'technical' | 'all';

// ── Stock universe ────────────────────────────────────────────────────────────
const UNIVERSE = [
  'AAPL','MSFT','NVDA','AMZN','GOOGL','GOOG','META','TSLA','BRK-B',
  'AVGO','ORCL','ADBE','CRM','AMD','INTC','QCOM','TXN','MU','ARM',
  'INTU','AMAT','LRCX','KLAC','MRVL','PANW','CRWD','SNOW','NOW','NET',
  'PLTR','DDOG','ZS','FTNT','TTD','SHOP','NFLX','UBER','DASH',
  'UNH','LLY','JNJ','MRK','ABBV','TMO','ABT','BSX','ELV','MDT',
  'ISRG','HCA','HUM','IDXX','VRTX','REGN','MRNA','GILD','BMY','PFE',
  'ZTS','DXCM','IQV','MOH','CI',
  'JPM','V','MA','BAC','GS','MS','WFC','BLK','C','AXP','USB',
  'ICE','CB','SPGI','MCO','SCHW','COF','BX','KKR','APO',
  'HD','TGT','DIS','SBUX','NKE','LOW','MCD','CMG',
  'BKNG','ABNB','LYFT','GM','F','RIVN',
  'CMCSA','VZ','T','TMUS','CHTR','RBLX','SNAP','PINS','SPOT',
  'CAT','DE','HON','MMM','GE','LMT','RTX','UPS','FDX','UNP',
  'WM','EMR','ETN','PH','ROK','ITW','AXON',
  'XOM','CVX','COP','EOG','SLB','HAL','MPC','VLO','PSX','WMB',
  'LIN','FCX','NEM','ALB','APD','SHW','CF',
  'SPG','PLD','AMT','EQIX','CCI','O','WELL','AVB',
  'NEE','SO','DUK','AEP','EXC','D','SRE',
  'WMT','COST','PG','KO','PEP','MO','PM','CL','GIS','HSY','MDLZ','WBA',
  'SQ','PYPL','COIN','HOOD','SOFI','AFRM','NU','MELI',
  'TSM','ASML','NVO','SAP','TM','BABA','JD','SE',
  'SPY','QQQ','IWM','DIA','GLD',
];

// ── Filter option helpers ─────────────────────────────────────────────────────
const A = { label: 'Any', value: 'any' };

// ── Descriptive filter definitions (5 columns × 5 rows) ─────────────────────
const DESCRIPTIVE: FilterDef[] = [
  // Row 1
  { key: 'exchange', label: 'Exchange', options: [A,
    { label: 'NASDAQ', value: 'NMS' }, { label: 'NYSE', value: 'NYQ' }, { label: 'AMEX', value: 'ASE' }] },
  { key: 'index', label: 'Index', options: [A,
    { label: 'S&P 500', value: 'sp500' }, { label: 'NASDAQ 100', value: 'ndx' }, { label: 'DJIA', value: 'djia' }, { label: 'Russell 2000', value: 'rut' }] },
  { key: 'sector', label: 'Sector', options: [A,
    { label: 'Technology', value: 'Technology' }, { label: 'Healthcare', value: 'Healthcare' },
    { label: 'Financial Services', value: 'Financial Services' }, { label: 'Consumer Cyclical', value: 'Consumer Cyclical' },
    { label: 'Communication Services', value: 'Communication Services' }, { label: 'Industrials', value: 'Industrials' },
    { label: 'Consumer Defensive', value: 'Consumer Defensive' }, { label: 'Energy', value: 'Energy' },
    { label: 'Basic Materials', value: 'Basic Materials' }, { label: 'Real Estate', value: 'Real Estate' },
    { label: 'Utilities', value: 'Utilities' }] },
  { key: 'industry', label: 'Industry', options: [A,
    { label: 'Semiconductors', value: 'Semiconductors' }, { label: 'Software—Application', value: 'Software—Application' },
    { label: 'Software—Infrastructure', value: 'Software—Infrastructure' }, { label: 'Biotechnology', value: 'Biotechnology' },
    { label: 'Banks—Diversified', value: 'Banks—Diversified' }, { label: 'Drug Manufacturers—General', value: 'Drug Manufacturers—General' },
    { label: 'Internet Retail', value: 'Internet Retail' }, { label: 'Capital Markets', value: 'Capital Markets' },
    { label: 'Auto Manufacturers', value: 'Auto Manufacturers' }, { label: 'Oil & Gas E&P', value: 'Oil & Gas E&P' }] },
  { key: 'country', label: 'Country', options: [A,
    { label: 'USA', value: 'United States' }, { label: 'China', value: 'China' },
    { label: 'UK', value: 'United Kingdom' }, { label: 'Germany', value: 'Germany' },
    { label: 'Japan', value: 'Japan' }, { label: 'Canada', value: 'Canada' },
    { label: 'Taiwan', value: 'Taiwan' }, { label: 'South Korea', value: 'South Korea' }] },
  // Row 2
  { key: 'mktcap', label: 'Market Cap.', options: [A,
    { label: 'Mega ($200B+)', value: 'mega' }, { label: 'Large ($10B–$200B)', value: 'large' },
    { label: 'Mid ($2B–$10B)', value: 'mid' }, { label: 'Small ($300M–$2B)', value: 'small' },
    { label: 'Micro (<$300M)', value: 'micro' }] },
  { key: 'divyield', label: 'Dividend Yield', options: [A,
    { label: 'None (0%)', value: 'none' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: '>1%', value: 'o1' }, { label: '>2%', value: 'o2' },
    { label: 'High (>3%)', value: 'high' }, { label: 'Very High (>5%)', value: 'vhigh' }] },
  { key: 'shortfloat', label: 'Short Float', options: [A,
    { label: 'Low (<5%)', value: 'low' }, { label: 'High (>10%)', value: 'high' },
    { label: 'Very High (>20%)', value: 'vhigh' }, { label: 'Over 30%', value: 'o30' }] },
  { key: 'analrecom', label: 'Analyst Recom.', options: [A,
    { label: 'Strong Buy (1)', value: '1' }, { label: 'Buy (2)', value: '2' },
    { label: 'Hold (3)', value: '3' }, { label: 'Sell (4)', value: '4' },
    { label: 'Strong Sell (5)', value: '5' }] },
  { key: 'optshort', label: 'Option/Short', options: [A,
    { label: 'Optionable', value: 'opt' }, { label: 'Shortable', value: 'short' },
    { label: 'Both', value: 'both' }] },
  // Row 3
  { key: 'earndate', label: 'Earnings Date', options: [A,
    { label: 'Today', value: 'today' }, { label: 'Tomorrow', value: 'tomorrow' },
    { label: 'This Week', value: 'thisweek' }, { label: 'Next Week', value: 'nextweek' },
    { label: 'This Month', value: 'thismonth' }] },
  { key: 'avgvol', label: 'Average Volume', options: [A,
    { label: 'Over 50K', value: 'u50k' }, { label: 'Over 100K', value: 'u100k' },
    { label: 'Over 500K', value: 'u500k' }, { label: 'Over 1M', value: 'u1m' },
    { label: 'Over 5M', value: 'u5m' }, { label: 'Over 10M', value: 'u10m' }] },
  { key: 'relvol', label: 'Relative Volume', options: [A,
    { label: 'Over 0.5', value: 'o05' }, { label: 'Over 1', value: 'o1' },
    { label: 'Over 1.5', value: 'o15' }, { label: 'Over 2', value: 'o2' },
    { label: 'Over 3', value: 'o3' }] },
  { key: 'curvol', label: 'Current Volume', options: [A,
    { label: 'Over 100K', value: 'u100k' }, { label: 'Over 500K', value: 'u500k' },
    { label: 'Over 1M', value: 'u1m' }, { label: 'Over 5M', value: 'u5m' }] },
  { key: 'trades', label: 'Trades', options: [A, { label: 'Elite only', value: 'elite' }] },
  // Row 4
  { key: 'price', label: 'Price $', options: [A,
    { label: 'Under $1', value: 'u1' }, { label: '$1–$5', value: '1to5' },
    { label: '$5–$10', value: '5to10' }, { label: '$10–$20', value: '10to20' },
    { label: '$20–$50', value: '20to50' }, { label: '$50–$100', value: '50to100' },
    { label: 'Over $100', value: 'o100' }] },
  { key: 'targetprice', label: 'Target Price', options: [A,
    { label: 'Above Price', value: 'above' }, { label: 'Below Price', value: 'below' },
    { label: '50% Above', value: 'p50above' }, { label: '10% Below', value: 'p10below' }] },
  { key: 'ipodate', label: 'IPO Date', options: [A,
    { label: 'Today', value: 'today' }, { label: 'Last Week', value: 'lastweek' },
    { label: 'Last Month', value: 'lastmonth' }, { label: 'Last Year', value: 'lastyear' },
    { label: 'More than Year', value: 'older' }] },
  { key: 'sharesout', label: 'Shares Outstanding', options: [A,
    { label: 'Under 1M', value: 'u1m' }, { label: 'Under 10M', value: 'u10m' },
    { label: 'Under 50M', value: 'u50m' }, { label: 'Over 1B', value: 'o1b' }] },
  { key: 'float', label: 'Float', options: [A,
    { label: 'Under 1M', value: 'u1m' }, { label: 'Under 10M', value: 'u10m' },
    { label: 'Under 50M', value: 'u50m' }, { label: 'Over 1B', value: 'o1b' }] },
  // Row 5
  { key: 'theme', label: 'Theme', options: [A,
    { label: 'AI', value: 'ai' }, { label: 'Clean Energy', value: 'cleanenergy' },
    { label: 'Cybersecurity', value: 'cyber' }, { label: 'Cloud', value: 'cloud' }] },
  { key: 'subtheme', label: 'Sub-theme', options: [A,
    { label: 'Large Language Models', value: 'llm' }, { label: 'Data Centers', value: 'datacenter' },
    { label: 'Semiconductors', value: 'semiconductors' }] },
];

// ── Fundamental filter definitions (5 columns × 8 rows) ──────────────────────
const FUNDAMENTAL: FilterDef[] = [
  // Row 1
  { key: 'pe', label: 'P/E', options: [A,
    { label: 'Under 10', value: 'u10' }, { label: 'Under 15', value: 'u15' },
    { label: 'Under 20', value: 'u20' }, { label: 'Under 25', value: 'u25' },
    { label: 'Under 30', value: 'u30' }, { label: 'Over 10', value: 'o10' },
    { label: 'Over 20', value: 'o20' }, { label: 'Over 30', value: 'o30' }, { label: 'Over 50', value: 'o50' }] },
  { key: 'fpe', label: 'Forward P/E', options: [A,
    { label: 'Under 10', value: 'u10' }, { label: 'Under 15', value: 'u15' },
    { label: 'Under 20', value: 'u20' }, { label: 'Under 25', value: 'u25' },
    { label: 'Over 10', value: 'o10' }, { label: 'Over 20', value: 'o20' }, { label: 'Over 30', value: 'o30' }] },
  { key: 'peg', label: 'PEG', options: [A,
    { label: 'Under 1', value: 'u1' }, { label: 'Under 2', value: 'u2' },
    { label: 'Over 1', value: 'o1' }, { label: 'Over 2', value: 'o2' }] },
  { key: 'ps', label: 'P/S', options: [A,
    { label: 'Under 1', value: 'u1' }, { label: 'Under 2', value: 'u2' },
    { label: 'Under 5', value: 'u5' }, { label: 'Over 5', value: 'o5' }, { label: 'Over 10', value: 'o10' }] },
  { key: 'pb', label: 'P/B', options: [A,
    { label: 'Under 1', value: 'u1' }, { label: 'Under 2', value: 'u2' },
    { label: 'Under 5', value: 'u5' }, { label: 'Over 1', value: 'o1' },
    { label: 'Over 5', value: 'o5' }, { label: 'Over 10', value: 'o10' }] },
  // Row 2
  { key: 'pricecash', label: 'Price/Cash', options: [A,
    { label: 'Under 5', value: 'u5' }, { label: 'Under 10', value: 'u10' },
    { label: 'Over 10', value: 'o10' }, { label: 'Over 20', value: 'o20' }] },
  { key: 'pricefcf', label: 'Price/Free Cash Flow', options: [A,
    { label: 'Under 15', value: 'u15' }, { label: 'Under 25', value: 'u25' },
    { label: 'Over 25', value: 'o25' }, { label: 'Over 50', value: 'o50' }] },
  { key: 'evebitda', label: 'EV/EBITDA', options: [A,
    { label: 'Under 10', value: 'u10' }, { label: 'Under 15', value: 'u15' },
    { label: 'Over 15', value: 'o15' }, { label: 'Over 25', value: 'o25' }] },
  { key: 'evsales', label: 'EV/Sales', options: [A,
    { label: 'Under 1', value: 'u1' }, { label: 'Under 3', value: 'u3' },
    { label: 'Over 3', value: 'o3' }, { label: 'Over 10', value: 'o10' }] },
  { key: 'divgrowth', label: 'Dividend Growth', options: [A,
    { label: 'Positive', value: 'pos' }, { label: 'Negative', value: 'neg' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' }] },
  // Row 3
  { key: 'epsthisyr', label: 'EPS Growth This Year', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' },
    { label: 'Over 25%', value: 'o25' }, { label: 'Over 50%', value: 'o50' }] },
  { key: 'epsnextyr', label: 'EPS Growth Next Year', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' },
    { label: 'Over 25%', value: 'o25' }] },
  { key: 'epsqoq', label: 'EPS Growth Qtr Over Qtr', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 10%', value: 'o10' }, { label: 'Over 25%', value: 'o25' }] },
  { key: 'epsttm', label: 'EPS Growth TTM', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' }] },
  { key: 'eps3yr', label: 'EPS Growth Past 3 Years', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' },
    { label: 'Over 25%', value: 'o25' }] },
  // Row 4
  { key: 'eps5yr', label: 'EPS Growth Past 5 Years', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' }] },
  { key: 'epsnext5yr', label: 'EPS Growth Next 5 Years', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' }] },
  { key: 'salesqoq', label: 'Sales Growth Qtr Over Qtr', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' }] },
  { key: 'salesttm', label: 'Sales Growth TTM', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' }] },
  { key: 'sales3yr', label: 'Sales Growth Past 3 Years', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' }] },
  // Row 5
  { key: 'sales5yr', label: 'Sales Growth Past 5 Years', options: [A,
    { label: 'Negative (<0%)', value: 'neg' }, { label: 'Positive (>0%)', value: 'pos' },
    { label: 'Over 5%', value: 'o5' }, { label: 'Over 10%', value: 'o10' }] },
  { key: 'earnrevsurp', label: 'Earnings & Revenue Surprise', options: [A,
    { label: 'Positive EPS', value: 'poseps' }, { label: 'Positive Revenue', value: 'posrev' },
    { label: 'Both Positive', value: 'both' }, { label: 'Both Negative', value: 'bothneg' }] },
  { key: 'roa', label: 'Return on Assets', options: [A,
    { label: 'Positive (>0%)', value: 'pos' }, { label: 'Over 5%', value: 'o5' },
    { label: 'Over 10%', value: 'o10' }, { label: 'Over 15%', value: 'o15' }] },
  { key: 'roe', label: 'Return on Equity', options: [A,
    { label: 'Positive (>0%)', value: 'pos' }, { label: 'Over 5%', value: 'o5' },
    { label: 'Over 10%', value: 'o10' }, { label: 'Over 15%', value: 'o15' },
    { label: 'Over 20%', value: 'o20' }, { label: 'Over 25%', value: 'o25' }] },
  { key: 'roic', label: 'Return on Invested Capital', options: [A,
    { label: 'Positive (>0%)', value: 'pos' }, { label: 'Over 5%', value: 'o5' },
    { label: 'Over 10%', value: 'o10' }, { label: 'Over 15%', value: 'o15' }] },
  // Row 6
  { key: 'currentratio', label: 'Current Ratio', options: [A,
    { label: 'High (>3)', value: 'o3' }, { label: 'Over 2', value: 'o2' },
    { label: 'Over 1', value: 'o1' }, { label: 'Under 1 (Low)', value: 'u1' }] },
  { key: 'quickratio', label: 'Quick Ratio', options: [A,
    { label: 'High (>3)', value: 'o3' }, { label: 'Over 2', value: 'o2' },
    { label: 'Over 1', value: 'o1' }, { label: 'Under 1 (Low)', value: 'u1' }] },
  { key: 'ltde', label: 'LT Debt/Equity', options: [A,
    { label: 'Low (<0.1)', value: 'u01' }, { label: 'Under 0.5', value: 'u05' },
    { label: 'Under 1', value: 'u1' }, { label: 'Over 1', value: 'o1' }] },
  { key: 'de', label: 'Debt/Equity', options: [A,
    { label: 'Low (<0.1)', value: 'u01' }, { label: 'Under 0.5', value: 'u05' },
    { label: 'Under 1', value: 'u1' }, { label: 'Over 1', value: 'o1' }, { label: 'Over 2', value: 'o2' }] },
  { key: 'grossmargin', label: 'Gross Margin', options: [A,
    { label: 'Positive (>0%)', value: 'pos' }, { label: 'Over 20%', value: 'o20' },
    { label: 'Over 30%', value: 'o30' }, { label: 'Over 40%', value: 'o40' },
    { label: 'Over 50%', value: 'o50' }, { label: 'Over 60%', value: 'o60' }] },
  // Row 7
  { key: 'opmargin', label: 'Operating Margin', options: [A,
    { label: 'Positive (>0%)', value: 'pos' }, { label: 'Over 5%', value: 'o5' },
    { label: 'Over 10%', value: 'o10' }, { label: 'Over 20%', value: 'o20' },
    { label: 'Over 30%', value: 'o30' }] },
  { key: 'npm', label: 'Net Profit Margin', options: [A,
    { label: 'Positive (>0%)', value: 'pos' }, { label: 'Over 5%', value: 'o5' },
    { label: 'Over 10%', value: 'o10' }, { label: 'Over 15%', value: 'o15' },
    { label: 'Over 20%', value: 'o20' }] },
  { key: 'payoutratio', label: 'Payout Ratio', options: [A,
    { label: 'None (0%)', value: 'none' }, { label: 'Low (<20%)', value: 'low' },
    { label: 'Under 50%', value: 'u50' }, { label: 'Over 50%', value: 'o50' }] },
  { key: 'insiderown', label: 'Insider Ownership', options: [A,
    { label: 'Very Low (<5%)', value: 'vlow' }, { label: 'Low (<10%)', value: 'low' },
    { label: 'High (>20%)', value: 'high' }, { label: 'Very High (>30%)', value: 'vhigh' }] },
  { key: 'insidertrans', label: 'Insider Transactions', options: [A,
    { label: 'Very Negative', value: 'vneg' }, { label: 'Negative', value: 'neg' },
    { label: 'Positive', value: 'pos' }, { label: 'Very Positive', value: 'vpos' }] },
  // Row 8
  { key: 'instiown', label: 'Institutional Ownership', options: [A,
    { label: 'Low (<5%)', value: 'low' }, { label: 'Under 30%', value: 'u30' },
    { label: 'Over 50%', value: 'o50' }, { label: 'Over 80%', value: 'o80' }] },
  { key: 'institrans', label: 'Institutional Transactions', options: [A,
    { label: 'Very Negative', value: 'vneg' }, { label: 'Negative', value: 'neg' },
    { label: 'Positive', value: 'pos' }, { label: 'Very Positive', value: 'vpos' }] },
];

// ── Technical filter definitions (5 columns × 4 rows) ────────────────────────
const TECHNICAL: FilterDef[] = [
  // Row 1
  { key: 'perf', label: 'Performance', options: [A,
    { label: 'Today Up', value: 'up' }, { label: 'Today Up ≥1%', value: 'up1' },
    { label: 'Today Up ≥2%', value: 'up2' }, { label: 'Today Up ≥5%', value: 'up5' },
    { label: 'Today Down', value: 'down' }, { label: 'Today Down ≤-1%', value: 'down1' },
    { label: 'Today Down ≤-5%', value: 'down5' }] },
  { key: 'perf2', label: 'Performance 2', options: [A,
    { label: 'Week Up', value: 'weekup' }, { label: 'Week Down', value: 'weekdown' },
    { label: 'Month Up', value: 'monthup' }, { label: 'Month Down', value: 'monthdown' },
    { label: 'Quarter Up', value: 'qup' }, { label: 'Quarter Down', value: 'qdown' },
    { label: 'Year Up', value: 'yearup' }, { label: 'Year Down', value: 'yeardown' }] },
  { key: 'volatility', label: 'Volatility', options: [A,
    { label: 'Week - Over 3%', value: 'wo3' }, { label: 'Week - Over 5%', value: 'wo5' },
    { label: 'Month - Over 5%', value: 'mo5' }, { label: 'Month - Over 10%', value: 'mo10' }] },
  { key: 'rsi14', label: 'RSI (14)', options: [A,
    { label: 'Overbought (>70)', value: 'ob70' }, { label: 'Overbought (>80)', value: 'ob80' },
    { label: 'Oversold (<30)', value: 'os30' }, { label: 'Oversold (<20)', value: 'os20' },
    { label: 'Not Overbought (<60)', value: 'u60' }, { label: 'Not Oversold (>40)', value: 'o40' }] },
  { key: 'gap', label: 'Gap', options: [A,
    { label: 'Up', value: 'up' }, { label: 'Up ≥2%', value: 'up2' },
    { label: 'Down', value: 'down' }, { label: 'Down ≤-2%', value: 'down2' }] },
  // Row 2
  { key: 'sma20', label: '20-Day Simple Moving Average', options: [A,
    { label: 'Price above SMA20', value: 'above' }, { label: 'Price below SMA20', value: 'below' },
    { label: 'SMA20 crossed above SMA50', value: 'crossabove50' }, { label: 'SMA20 crossed below SMA50', value: 'crossbelow50' }] },
  { key: 'sma50', label: '50-Day Simple Moving Average', options: [A,
    { label: 'Price above SMA50', value: 'above' }, { label: 'Price below SMA50', value: 'below' },
    { label: 'SMA50 crossed above SMA200', value: 'crossabove200' }, { label: 'SMA50 crossed below SMA200', value: 'crossbelow200' }] },
  { key: 'sma200', label: '200-Day Simple Moving Average', options: [A,
    { label: 'Price above SMA200', value: 'above' }, { label: 'Price below SMA200', value: 'below' },
    { label: '50-Day above 200-Day', value: 'golden' }, { label: '50-Day below 200-Day', value: 'death' }] },
  { key: 'change', label: 'Change', options: [A,
    { label: 'Up', value: 'up' }, { label: 'Up ≥1%', value: 'up1' },
    { label: 'Up ≥2%', value: 'up2' }, { label: 'Up ≥5%', value: 'up5' },
    { label: 'Down', value: 'down' }, { label: 'Down ≤-1%', value: 'down1' },
    { label: 'Down ≤-5%', value: 'down5' }] },
  { key: 'changefromopen', label: 'Change from Open', options: [A,
    { label: 'Up', value: 'up' }, { label: 'Up ≥2%', value: 'up2' },
    { label: 'Down', value: 'down' }, { label: 'Down ≤-2%', value: 'down2' }] },
  // Row 3
  { key: 'high20low', label: '20-Day High/Low', options: [A,
    { label: 'New High', value: 'nh' }, { label: 'New Low', value: 'nl' },
    { label: '5% From High', value: 'near_high' }, { label: '5% From Low', value: 'near_low' }] },
  { key: 'high50low', label: '50-Day High/Low', options: [A,
    { label: 'New High', value: 'nh' }, { label: 'New Low', value: 'nl' },
    { label: '5% From High', value: 'near_high' }, { label: '5% From Low', value: 'near_low' }] },
  { key: 'week52', label: '52-Week High/Low', options: [A,
    { label: 'New 52W High', value: 'nh' }, { label: 'New 52W Low', value: 'nl' },
    { label: 'Near 52W High (5%)', value: 'near_high' }, { label: 'Near 52W Low (5%)', value: 'near_low' },
    { label: 'Above 52W Midpoint', value: 'above' }, { label: 'Below 52W Midpoint', value: 'below' }] },
  { key: 'allhighlow', label: 'All-Time High/Low', options: [A,
    { label: 'All-Time High', value: 'ath' }, { label: 'All-Time Low', value: 'atl' },
    { label: 'Near All-Time High (5%)', value: 'near_ath' }] },
  { key: 'pattern', label: 'Pattern', options: [A,
    { label: 'Horizontal S/R', value: 'hsr' }, { label: 'TL Resistance', value: 'tlr' },
    { label: 'TL Support', value: 'tls' }, { label: 'Wedge Up', value: 'wu' },
    { label: 'Wedge Down', value: 'wd' }, { label: 'Triangle Ascending', value: 'ta' },
    { label: 'Triangle Descending', value: 'td' }, { label: 'Channel Up', value: 'cu' },
    { label: 'Channel Down', value: 'cd' }] },
  // Row 4
  { key: 'candlestick', label: 'Candlestick', options: [A,
    { label: 'Long Lower Shadow', value: 'lls' }, { label: 'Long Upper Shadow', value: 'lus' },
    { label: 'Hammer', value: 'hammer' }, { label: 'Inverted Hammer', value: 'ihammer' },
    { label: 'Doji', value: 'doji' }] },
  { key: 'beta', label: 'Beta', options: [A,
    { label: 'Negative (<0)', value: 'neg' }, { label: 'Under 0.5 (Low)', value: 'u05' },
    { label: 'Under 1', value: 'u1' }, { label: 'Over 0.5', value: 'o05' },
    { label: 'Over 1', value: 'o1' }, { label: 'Over 1.5', value: 'o15' },
    { label: 'Over 2 (High)', value: 'o2' }] },
  { key: 'atr', label: 'Average True Range', options: [A,
    { label: 'Over 0.25', value: 'o025' }, { label: 'Over 0.5', value: 'o05' },
    { label: 'Over 1', value: 'o1' }, { label: 'Over 2', value: 'o2' },
    { label: 'Under 0.5', value: 'u05' }, { label: 'Under 1', value: 'u1' }] },
  { key: 'ahclose', label: 'After-Hours Close', options: [A,
    { label: 'Up', value: 'up' }, { label: 'Down', value: 'down' }] },
  { key: 'ahchange', label: 'After-Hours Change', options: [A,
    { label: 'Up ≥1%', value: 'up1' }, { label: 'Up ≥2%', value: 'up2' },
    { label: 'Down ≤-1%', value: 'down1' }, { label: 'Down ≤-2%', value: 'down2' }] },
];

const ALL_DEFS: FilterDef[] = [...DESCRIPTIVE, ...FUNDAMENTAL, ...TECHNICAL];

const TAB_FILTERS: Record<TabKey, FilterDef[]> = {
  descriptive: DESCRIPTIVE,
  fundamental: FUNDAMENTAL,
  technical:   TECHNICAL,
  all:         ALL_DEFS,
};

const DEFAULT_FILTERS: FilterState = Object.fromEntries(
  ALL_DEFS.map(f => [f.key, f.options[0].value])
);

// ── Filter logic (only apply filters where we have real data) ─────────────────
function passes(s: Quote, f: FilterState): boolean {
  // Exchange
  if (f.exchange !== 'any') {
    if (f.exchange === 'NMS' && !['NMS','NGM','NCM'].includes(s.exchange)) return false;
    else if (f.exchange !== 'NMS' && s.exchange !== f.exchange) return false;
  }

  // Market Cap
  const mc = s.marketCap ?? 0;
  if (f.mktcap === 'mega'  && mc < 200e9)               return false;
  if (f.mktcap === 'large' && (mc < 10e9  || mc >= 200e9)) return false;
  if (f.mktcap === 'mid'   && (mc < 2e9   || mc >= 10e9))  return false;
  if (f.mktcap === 'small' && (mc < 300e6 || mc >= 2e9))   return false;
  if (f.mktcap === 'micro' && mc >= 300e6)              return false;

  // Sector
  if (f.sector !== 'any' && s.sector !== f.sector) return false;

  // Industry
  if (f.industry !== 'any' && s.industry !== f.industry) return false;

  // Country
  if (f.country !== 'any' && s.country !== f.country) return false;

  // Price
  const p = s.regularMarketPrice;
  if (f.price === 'u1'      && p >= 1)               return false;
  if (f.price === '1to5'    && (p < 1   || p >= 5))  return false;
  if (f.price === '5to10'   && (p < 5   || p >= 10)) return false;
  if (f.price === '10to20'  && (p < 10  || p >= 20)) return false;
  if (f.price === '20to50'  && (p < 20  || p >= 50)) return false;
  if (f.price === '50to100' && (p < 50  || p >= 100))return false;
  if (f.price === 'o100'    && p < 100)              return false;

  // Dividend Yield (decimal: 0.02 = 2%)
  const dy = s.trailingAnnualDividendYield ?? 0;
  if (f.divyield === 'none'  && dy > 0)      return false;
  if (f.divyield === 'pos'   && dy <= 0)     return false;
  if (f.divyield === 'o1'    && dy < 0.01)   return false;
  if (f.divyield === 'o2'    && dy < 0.02)   return false;
  if (f.divyield === 'high'  && dy < 0.03)   return false;
  if (f.divyield === 'vhigh' && dy < 0.05)   return false;

  // Average Volume
  const av = s.averageDailyVolume3Month ?? 0;
  if (f.avgvol === 'u50k'  && av < 50_000)     return false;
  if (f.avgvol === 'u100k' && av < 100_000)    return false;
  if (f.avgvol === 'u500k' && av < 500_000)    return false;
  if (f.avgvol === 'u1m'   && av < 1_000_000)  return false;
  if (f.avgvol === 'u5m'   && av < 5_000_000)  return false;
  if (f.avgvol === 'u10m'  && av < 10_000_000) return false;

  // Relative Volume
  const rv = av > 0 ? (s.regularMarketVolume / av) : 0;
  if (f.relvol === 'o05' && rv < 0.5) return false;
  if (f.relvol === 'o1'  && rv < 1.0) return false;
  if (f.relvol === 'o15' && rv < 1.5) return false;
  if (f.relvol === 'o2'  && rv < 2.0) return false;
  if (f.relvol === 'o3'  && rv < 3.0) return false;

  // P/E
  const pe = s.trailingPE;
  if (f.pe !== 'any') {
    if (!pe || pe <= 0) return false;
    if (f.pe === 'u10' && pe >= 10)  return false;
    if (f.pe === 'u15' && pe >= 15)  return false;
    if (f.pe === 'u20' && pe >= 20)  return false;
    if (f.pe === 'u25' && pe >= 25)  return false;
    if (f.pe === 'u30' && pe >= 30)  return false;
    if (f.pe === 'o10' && pe <= 10)  return false;
    if (f.pe === 'o20' && pe <= 20)  return false;
    if (f.pe === 'o30' && pe <= 30)  return false;
    if (f.pe === 'o50' && pe <= 50)  return false;
  }

  // Forward P/E
  const fpe = s.forwardPE;
  if (f.fpe !== 'any') {
    if (!fpe || fpe <= 0) return false;
    if (f.fpe === 'u10' && fpe >= 10) return false;
    if (f.fpe === 'u15' && fpe >= 15) return false;
    if (f.fpe === 'u20' && fpe >= 20) return false;
    if (f.fpe === 'u25' && fpe >= 25) return false;
    if (f.fpe === 'o10' && fpe <= 10) return false;
    if (f.fpe === 'o20' && fpe <= 20) return false;
    if (f.fpe === 'o30' && fpe <= 30) return false;
  }

  // P/S (pass-through if no data)
  const ps = s.priceToSalesTrailing12Months;
  if (f.ps !== 'any' && ps != null && ps > 0) {
    if (f.ps === 'u1'  && ps >= 1)  return false;
    if (f.ps === 'u2'  && ps >= 2)  return false;
    if (f.ps === 'u5'  && ps >= 5)  return false;
    if (f.ps === 'o5'  && ps <= 5)  return false;
    if (f.ps === 'o10' && ps <= 10) return false;
  }

  // P/B
  const pb = s.priceToBook;
  if (f.pb !== 'any') {
    if (!pb || pb <= 0) return false;
    if (f.pb === 'u1'  && pb >= 1)  return false;
    if (f.pb === 'u2'  && pb >= 2)  return false;
    if (f.pb === 'u5'  && pb >= 5)  return false;
    if (f.pb === 'o1'  && pb <= 1)  return false;
    if (f.pb === 'o5'  && pb <= 5)  return false;
    if (f.pb === 'o10' && pb <= 10) return false;
  }

  // ROE (pass-through if no data)
  const roe = s.returnOnEquity;
  if (f.roe !== 'any' && roe != null) {
    if (f.roe === 'pos' && roe <= 0)    return false;
    if (f.roe === 'o5'  && roe < 0.05) return false;
    if (f.roe === 'o10' && roe < 0.10) return false;
    if (f.roe === 'o15' && roe < 0.15) return false;
    if (f.roe === 'o20' && roe < 0.20) return false;
    if (f.roe === 'o25' && roe < 0.25) return false;
  }

  // Net Profit Margin (pass-through if no data)
  const npm = s.profitMargins;
  if (f.npm !== 'any' && npm != null) {
    if (f.npm === 'pos' && npm <= 0)    return false;
    if (f.npm === 'o5'  && npm < 0.05) return false;
    if (f.npm === 'o10' && npm < 0.10) return false;
    if (f.npm === 'o15' && npm < 0.15) return false;
    if (f.npm === 'o20' && npm < 0.20) return false;
  }

  // Gross Margin (pass-through if no data)
  const gm = s.grossMargins;
  if (f.grossmargin !== 'any' && gm != null) {
    if (f.grossmargin === 'pos' && gm <= 0)    return false;
    if (f.grossmargin === 'o20' && gm < 0.20)  return false;
    if (f.grossmargin === 'o30' && gm < 0.30)  return false;
    if (f.grossmargin === 'o40' && gm < 0.40)  return false;
    if (f.grossmargin === 'o50' && gm < 0.50)  return false;
    if (f.grossmargin === 'o60' && gm < 0.60)  return false;
  }

  // Operating Margin (pass-through if no data)
  const om = s.operatingMargins;
  if (f.opmargin !== 'any' && om != null) {
    if (f.opmargin === 'pos' && om <= 0)    return false;
    if (f.opmargin === 'o5'  && om < 0.05) return false;
    if (f.opmargin === 'o10' && om < 0.10) return false;
    if (f.opmargin === 'o20' && om < 0.20) return false;
    if (f.opmargin === 'o30' && om < 0.30) return false;
  }

  // Performance (today's %)
  const chg = s.regularMarketChangePercent;
  if (f.perf === 'up'    && chg <= 0)  return false;
  if (f.perf === 'up1'   && chg < 1)   return false;
  if (f.perf === 'up2'   && chg < 2)   return false;
  if (f.perf === 'up5'   && chg < 5)   return false;
  if (f.perf === 'down'  && chg >= 0)  return false;
  if (f.perf === 'down1' && chg > -1)  return false;
  if (f.perf === 'down5' && chg > -5)  return false;
  // change filter (same data as perf)
  if (f.change === 'up'    && chg <= 0)  return false;
  if (f.change === 'up1'   && chg < 1)   return false;
  if (f.change === 'up2'   && chg < 2)   return false;
  if (f.change === 'up5'   && chg < 5)   return false;
  if (f.change === 'down'  && chg >= 0)  return false;
  if (f.change === 'down1' && chg > -1)  return false;
  if (f.change === 'down5' && chg > -5)  return false;

  // 50-Day MA
  const ma50 = s.fiftyDayAverage;
  if (f.sma50 !== 'any' && ma50) {
    if (f.sma50 === 'above' && p < ma50)  return false;
    if (f.sma50 === 'below' && p >= ma50) return false;
  }

  // 200-Day MA
  const ma200 = s.twoHundredDayAverage;
  if (f.sma200 !== 'any' && ma200) {
    if (f.sma200 === 'above' && p < ma200)  return false;
    if (f.sma200 === 'below' && p >= ma200) return false;
    if (f.sma200 === 'golden' && ma50 && ma50 < ma200) return false;
    if (f.sma200 === 'death'  && ma50 && ma50 >= ma200) return false;
  }

  // 52-Week High/Low
  const h52 = s.fiftyTwoWeekHigh;
  const l52 = s.fiftyTwoWeekLow;
  if (f.week52 !== 'any' && h52 && l52) {
    const range = h52 - l52;
    const mid   = l52 + range / 2;
    const pctFromHigh = ((h52 - p) / h52) * 100;
    const pctFromLow  = ((p - l52) / l52) * 100;
    if (f.week52 === 'nh'        && p < h52)        return false;
    if (f.week52 === 'nl'        && p > l52)         return false;
    if (f.week52 === 'near_high' && pctFromHigh > 5) return false;
    if (f.week52 === 'near_low'  && pctFromLow  > 5) return false;
    if (f.week52 === 'above'     && p < mid)         return false;
    if (f.week52 === 'below'     && p >= mid)        return false;
  }

  // Beta (from STOCK_META via merge)
  const beta = s.beta;
  if (f.beta !== 'any' && beta != null) {
    if (f.beta === 'neg' && beta >= 0)   return false;
    if (f.beta === 'u05' && beta >= 0.5) return false;
    if (f.beta === 'u1'  && beta >= 1)   return false;
    if (f.beta === 'o05' && beta < 0.5)  return false;
    if (f.beta === 'o1'  && beta < 1)    return false;
    if (f.beta === 'o15' && beta < 1.5)  return false;
    if (f.beta === 'o2'  && beta < 2)    return false;
  }

  return true;
}

// ── Format helpers ─────────────────────────────────────────────────────────────
const fmtCap = (n?: number) => {
  if (!n) return '—';
  if (n >= 1e12) return `$${(n/1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n/1e9).toFixed(2)}B`;
  return `$${(n/1e6).toFixed(0)}M`;
};
const fmtVol = (n: number) => {
  if (n >= 1e9) return `${(n/1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n/1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`;
  return String(n);
};
const fmtChg = (n: number) => `${n>=0?'+':''}${n.toFixed(2)}%`;
const fmtPE  = (n?: number) => (!n || n <= 0) ? '—' : n.toFixed(1);

// ── Sort ──────────────────────────────────────────────────────────────────────
function sortQ(quotes: Quote[], field: string, dir: 'asc'|'desc'): Quote[] {
  return [...quotes].sort((a,b) => {
    let av=0, bv=0;
    if (field==='marketCap')                  { av=a.marketCap??0; bv=b.marketCap??0; }
    else if (field==='regularMarketPrice')    { av=a.regularMarketPrice; bv=b.regularMarketPrice; }
    else if (field==='regularMarketChangePercent') { av=a.regularMarketChangePercent; bv=b.regularMarketChangePercent; }
    else if (field==='regularMarketVolume')   { av=a.regularMarketVolume; bv=b.regularMarketVolume; }
    else if (field==='trailingPE')            { av=a.trailingPE??0; bv=b.trailingPE??0; }
    return dir==='asc' ? av-bv : bv-av;
  });
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ScreenerPage() {
  const [data,         setData]         = useState<Quote[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState<TabKey>('descriptive');
  const [filters,      setFilters]      = useState<FilterState>(DEFAULT_FILTERS);
  const [tickerInput,  setTickerInput]  = useState('');
  const [orderBy,      setOrderBy]      = useState('marketCap');
  const [orderDir,     setOrderDir]     = useState<'asc'|'desc'>('desc');
  const [sortField,    setSortField]    = useState('marketCap');
  const [sortDir,      setSortDir]      = useState<'asc'|'desc'>('desc');
  const [filtersOpen,  setFiltersOpen]  = useState(true); // false = screened (full table)
  const [savedWatchlists, setSavedWatchlists] = useState<SavedWatchlist[]>([]);
  const [watchlistFilter, setWatchlistFilter] = useState<string>('');   // active watchlist ID
  const tickerRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const CHUNK = 50;
      const chunks: string[][] = [];
      for (let i = 0; i < UNIVERSE.length; i += CHUNK) chunks.push(UNIVERSE.slice(i, i+CHUNK));
      const results = await Promise.all(
        chunks.map(c =>
          fetch(`/api/quotes-batch?symbols=${c.join(',')}`)
            .then(r => r.ok ? r.json() : [])
            .catch(() => [] as Quote[])
        )
      );
      const all = (results.flat() as Quote[])
        .filter(s => s.symbol && s.regularMarketPrice > 0)
        .map(s => {
          const m = STOCK_META[s.symbol];
          return m ? { ...m, ...s,
            sector:   s.sector   || m.sector,
            industry: s.industry || m.industry,
            country:  s.country  || m.country,
            beta:     s.beta     ?? m.beta,
          } : s;
        });
      setData(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Load saved watchlists + apply URL param on mount
  useEffect(() => {
    setSavedWatchlists(getWatchlists());
    const params = new URLSearchParams(window.location.search);
    const wid = params.get('watchlistId');
    if (wid) setWatchlistFilter(wid);
  }, []);

  const setFilter = (key: string, val: string) =>
    setFilters(prev => ({ ...prev, [key]: val }));

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d==='desc'?'asc':'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const activeCount = Object.entries(filters)
    .filter(([k, v]) => v !== 'any' && v !== 'elite' && v !== (DEFAULT_FILTERS[k] ?? 'any')).length;

  const activeWatchlist = savedWatchlists.find(w => w.id === watchlistFilter) ?? null;

  const filtered = useMemo(() => {
    let res = data.filter(s => passes(s, filters));
    if (tickerInput.trim()) {
      const tks = tickerInput.split(/[,\s]+/).map(t=>t.trim().toUpperCase()).filter(Boolean);
      res = res.filter(s => tks.includes(s.symbol));
    }
    if (activeWatchlist) {
      const syms = new Set(activeWatchlist.symbols);
      res = res.filter(s => syms.has(s.symbol));
    }
    return sortQ(res, sortField, sortDir);
  }, [data, filters, tickerInput, sortField, sortDir, activeWatchlist]);

  const screen = () => setFiltersOpen(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') screen();
  };

  const SortIcon = ({ f }: { f: string }) =>
    sortField !== f ? <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 inline ml-0.5" /> :
    sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-primary inline ml-0.5" /> :
    <ChevronUp className="w-3 h-3 text-primary inline ml-0.5" />;

  const tabDefs: { key: TabKey; label: string }[] = [
    { key: 'descriptive', label: 'Descriptive' },
    { key: 'fundamental', label: 'Fundamental' },
    { key: 'technical',   label: 'Technical' },
    { key: 'all',         label: 'All' },
  ];

  const currentFilters = TAB_FILTERS[activeTab];

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      <AppNav />

      {/* ── FILTER SECTION (top half) ──────────────────────────────────────── */}
      {filtersOpen && (
        <div
          className="flex flex-col shrink-0 border-b border-border dark:border-slate-700/60 bg-card dark:bg-[#0d1120] overflow-y-auto"
          style={{ maxHeight: 'calc(50vh - 68px)' }}
        >
          {/* ── Toolbar ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border dark:border-slate-800/60 bg-muted/40 dark:bg-[#0b0f1c] flex-wrap">
            {/* Order by */}
            <span className="text-[11px] text-muted-foreground font-mono">Order by</span>
            <select
              value={orderBy}
              onChange={e => { setOrderBy(e.target.value); setSortField(e.target.value); }}
              className="text-[11px] bg-background dark:bg-[#10182c] border border-border dark:border-slate-700/70 text-foreground dark:text-slate-300 rounded px-1.5 py-1 font-mono"
            >
              <option value="marketCap">Market Cap</option>
              <option value="regularMarketPrice">Price</option>
              <option value="regularMarketChangePercent">Change %</option>
              <option value="regularMarketVolume">Volume</option>
              <option value="trailingPE">P/E</option>
            </select>
            <select
              value={orderDir}
              onChange={e => { setOrderDir(e.target.value as 'asc'|'desc'); setSortDir(e.target.value as 'asc'|'desc'); }}
              className="text-[11px] bg-background dark:bg-[#10182c] border border-border dark:border-slate-700/70 text-foreground dark:text-slate-300 rounded px-1.5 py-1 font-mono"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>

            <div className="mx-1 h-4 w-px bg-border" />

            {/* Watchlist filter */}
            {savedWatchlists.length > 0 && (
              <>
                <span className="text-[11px] text-muted-foreground font-mono">Watchlist</span>
                <select
                  value={watchlistFilter}
                  onChange={e => setWatchlistFilter(e.target.value)}
                  className="text-[11px] bg-background dark:bg-[#10182c] border border-border dark:border-slate-700/70 text-foreground dark:text-slate-300 rounded px-1.5 py-1 font-mono"
                >
                  <option value="">All Stocks</option>
                  {savedWatchlists.map(wl => (
                    <option key={wl.id} value={wl.id}>{wl.name}</option>
                  ))}
                </select>
                {watchlistFilter && (
                  <button
                    onClick={() => setWatchlistFilter('')}
                    className="flex items-center gap-1 text-[11px] bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded px-1.5 py-1 hover:bg-sky-500/20 transition-colors"
                    title="Clear watchlist filter"
                  >
                    <X className="w-2.5 h-2.5" />
                    {activeWatchlist?.name}
                  </button>
                )}
                <div className="mx-1 h-4 w-px bg-border" />
              </>
            )}

            {/* Tickers input */}
            <span className="text-[11px] text-muted-foreground font-mono">Tickers</span>
            <input
              ref={tickerRef}
              type="text"
              value={tickerInput}
              onChange={e => setTickerInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="AAPL, MSFT, TSLA …"
              className="text-[11px] bg-background dark:bg-[#10182c] border border-border dark:border-slate-700/70 text-foreground dark:text-slate-300 rounded px-2 py-1 font-mono w-48 focus:outline-none focus:border-primary/60"
            />
            <button
              onClick={screen}
              className="px-2 py-1 bg-background dark:bg-[#10182c] border border-border dark:border-slate-700/70 text-muted-foreground rounded text-[11px] hover:text-foreground hover:border-primary/50 transition-colors"
            >
              →
            </button>

            <div className="mx-1 h-4 w-px bg-border" />

            {/* Result count */}
            {!loading && (
              <span className="text-[11px] text-muted-foreground font-mono">
                <span className="text-foreground font-semibold">{filtered.length}</span> results
              </span>
            )}
            {loading && <span className="text-[11px] text-muted-foreground/50 font-mono animate-pulse">Loading…</span>}

            <div className="flex-1" />

            {/* Reset */}
            {activeCount > 0 && (
              <button onClick={resetFilters} className="text-[11px] text-muted-foreground hover:text-foreground font-mono transition-colors">
                Reset ({activeCount})
              </button>
            )}

            {/* Screen button */}
            <button
              onClick={screen}
              className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/40 text-primary rounded text-[11px] font-mono font-semibold hover:bg-primary/20 transition-colors"
            >
              <SlidersHorizontal className="w-3 h-3" />
              Screen ▲
            </button>
          </div>

          {/* ── Tab bar ─────────────────────────────────────────────── */}
          <div className="flex border-b border-border dark:border-slate-800/60 px-2">
            {tabDefs.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'px-4 py-1.5 text-xs font-mono font-medium transition-colors border-b-2 -mb-px',
                  activeTab === t.key
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Filter grid (5 columns) ──────────────────────────────── */}
          <div className="px-2 py-2">
            <div
              className="grid"
              style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px 0' }}
            >
              {currentFilters.map(f => {
                const isActive = filters[f.key] !== (f.options[0]?.value ?? 'any');
                return (
                  <div key={f.key} className="flex items-center min-w-0 px-1 py-[2px]">
                    {/* Label — right-aligned, wraps for long names */}
                    <span
                      className="text-[10px] leading-tight text-slate-400 text-right pr-1.5 flex-shrink-0"
                      style={{ width: '38%', wordBreak: 'break-word', hyphens: 'auto' }}
                    >
                      {f.label}
                    </span>
                    {/* Select */}
                    <select
                      value={filters[f.key]}
                      onChange={e => setFilter(f.key, e.target.value)}
                      className={cn(
                        'flex-1 min-w-0 text-[11px] font-mono rounded-sm px-1 py-[3px] transition-colors',
                        'focus:outline-none border appearance-none cursor-pointer',
                        isActive
                          ? 'dark:bg-sky-900/40 bg-sky-100 dark:border-sky-500/60 border-sky-400 dark:text-sky-300 text-sky-700'
                          : 'dark:bg-[#0c1628] bg-white dark:border-slate-700/60 border-slate-200 dark:text-slate-300 text-slate-700 dark:hover:border-slate-600 hover:border-slate-400'
                      )}
                    >
                      {f.options.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS SECTION (bottom half / full page when screened) ──────── */}
      <div className="flex-1 overflow-auto flex flex-col min-h-0">

        {/* Results toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-1.5 border-b border-border dark:border-slate-800/60 bg-background/95 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            {!loading ? (
              <span className="text-[11px] text-muted-foreground font-mono">
                <span className="text-foreground font-bold">{filtered.length}</span>
                <span className="text-muted-foreground/60"> / {data.length} stocks</span>
                {activeCount > 0 && <span className="text-muted-foreground/60"> · {activeCount} filter{activeCount>1?'s':''} active</span>}
              </span>
            ) : (
              <span className="text-[11px] text-muted-foreground/50 font-mono animate-pulse">Loading market data…</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="text-[11px] text-muted-foreground hover:text-foreground font-mono transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={() => setFiltersOpen(f => !f)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 rounded border text-[11px] font-mono transition-colors',
                filtersOpen
                  ? 'border-primary/40 text-primary bg-primary/10 hover:bg-primary/20'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
              )}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filters {filtersOpen ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Table */}
        {!loading && (
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border dark:border-slate-800/60 bg-muted/30 dark:bg-[#07101d]/90 sticky top-0 z-10">
                  <th className="px-2 py-2 text-left text-[10px] font-mono text-muted-foreground/50 w-8">#</th>
                  <th className="px-2 py-2 text-left text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={()=>handleSort('symbol')}>
                    Ticker <SortIcon f="symbol" />
                  </th>
                  <th className="px-2 py-2 text-left text-[10px] font-mono text-muted-foreground max-w-[160px]">Company</th>
                  <th className="px-2 py-2 text-left text-[10px] font-mono text-muted-foreground hidden md:table-cell">Sector</th>
                  <th className="px-2 py-2 text-left text-[10px] font-mono text-muted-foreground hidden xl:table-cell">Industry</th>
                  <th className="px-2 py-2 text-right text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={()=>handleSort('marketCap')}>
                    Mkt Cap <SortIcon f="marketCap" />
                  </th>
                  <th className="px-2 py-2 text-right text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={()=>handleSort('trailingPE')}>
                    P/E <SortIcon f="trailingPE" />
                  </th>
                  <th className="px-2 py-2 text-right text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={()=>handleSort('regularMarketPrice')}>
                    Price <SortIcon f="regularMarketPrice" />
                  </th>
                  <th className="px-2 py-2 text-right text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={()=>handleSort('regularMarketChangePercent')}>
                    Chg% <SortIcon f="regularMarketChangePercent" />
                  </th>
                  <th className="px-2 py-2 text-right text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground select-none hidden sm:table-cell" onClick={()=>handleSort('regularMarketVolume')}>
                    Volume <SortIcon f="regularMarketVolume" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-muted-foreground/40 font-mono text-sm">
                      No stocks match the current filters.
                    </td>
                  </tr>
                ) : (
                  filtered.map((s, i) => {
                    const up = s.regularMarketChangePercent >= 0;
                    return (
                      <tr key={s.symbol} className="border-b border-border/40 dark:border-slate-800/30 hover:bg-muted/50 dark:hover:bg-slate-800/25 transition-colors">
                        <td className="px-2 py-1.5 text-[10px] text-muted-foreground/40 font-mono">{i+1}</td>
                        <td className="px-2 py-1.5">
                          <Link href={`/chart?symbol=${s.symbol}`} className="font-mono font-bold text-xs text-primary hover:text-primary/80 transition-colors">
                            {s.symbol}
                          </Link>
                        </td>
                        <td className="px-2 py-1.5 text-[11px] dark:text-slate-300 text-slate-700 max-w-[160px] truncate">{s.longName ?? s.shortName ?? '—'}</td>
                        <td className="px-2 py-1.5 text-[10px] text-muted-foreground hidden md:table-cell whitespace-nowrap">{s.sector ?? '—'}</td>
                        <td className="px-2 py-1.5 text-[10px] text-muted-foreground/60 hidden xl:table-cell max-w-[160px] truncate">{s.industry ?? '—'}</td>
                        <td className="px-2 py-1.5 text-[11px] font-mono dark:text-slate-300 text-slate-700 text-right whitespace-nowrap">{fmtCap(s.marketCap)}</td>
                        <td className="px-2 py-1.5 text-[11px] font-mono text-muted-foreground text-right">{fmtPE(s.trailingPE)}</td>
                        <td className="px-2 py-1.5 text-[11px] font-mono font-bold text-foreground text-right whitespace-nowrap">${s.regularMarketPrice.toFixed(2)}</td>
                        <td className={cn('px-2 py-1.5 text-[11px] font-mono font-semibold text-right whitespace-nowrap', up ? 'dark:text-green-400 text-green-600' : 'dark:text-red-400 text-red-600')}>
                          {fmtChg(s.regularMarketChangePercent)}
                        </td>
                        <td className="px-2 py-1.5 text-[10px] font-mono text-muted-foreground text-right hidden sm:table-cell whitespace-nowrap">{fmtVol(s.regularMarketVolume)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {loading && (
          <div className="flex-1 px-3 py-3 space-y-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="h-8 rounded bg-muted dark:bg-slate-800/30 animate-pulse" />
            ))}
          </div>
        )}

        <p className="shrink-0 text-center text-[10px] text-slate-800 font-mono py-3">
          ChartHog Screener · {UNIVERSE.length} stocks · Data via Yahoo Finance
        </p>
      </div>
    </div>
  );
}
