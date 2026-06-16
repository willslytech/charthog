'use client';

import { useState, useMemo, useRef, useEffect, useId } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ArrowUp, ArrowDown, Search } from 'lucide-react';

// ===== TYPES =====
type TopTab = 'insiders' | 'managers' | 'funds';
type InsiderView = 'latest' | 'top-week' | 'top-10pct';

const SORT_OPTS = [
  'Most Popular', 'Portfolio Value', 'Number of Investments',
  'New Purchased', 'Sold Out', 'Added', 'Reduced',
  'Top 10 Concentration', 'Turnover', 'Time Held (Top 10)', 'Time Held (All)',
] as const;
type SortOpt = (typeof SORT_OPTS)[number];

const TX_FILTERS = ['All Transactions', 'Buy', 'Sell', 'Option Exercise', 'Sale - Planned', 'Gift'] as const;
type TxFilter = (typeof TX_FILTERS)[number];

interface Trade {
  ticker: string; owner: string; rel: string; date: string;
  tx: string; cost: number; shares: number; value: number;
  total: number; form: string;
}
interface Holding { ticker: string; pct: number; val: string; chg: number; }
interface Entity { name: string; sub: string; portVal: string; chg: number; holdings: Holding[]; chart: number[]; }

// ===== STATIC DATA =====
const TRADES: Trade[] = [
  { ticker: 'NVDA',  owner: 'Huang Jen-Hsun',        rel: 'CEO',       date: 'Jun 09', tx: 'Sale', cost: 131.58, shares: 240000,  value: 31579200,   total: 823456789,   form: 'Jun 09 05:15 PM' },
  { ticker: 'AMZN',  owner: 'Bezos Jeffrey P.',       rel: '10% Owner', date: 'Jun 09', tx: 'Sale', cost: 241.45, shares: 25000,   value: 6036250,    total: 1042000000,  form: 'Jun 09 05:22 PM' },
  { ticker: 'META',  owner: 'Zuckerberg Mark E.',     rel: 'CEO',       date: 'Jun 09', tx: 'Sale', cost: 589.32, shares: 15000,   value: 8839800,    total: 350000000,   form: 'Jun 09 07:15 PM' },
  { ticker: 'TSLA',  owner: 'Musk Elon R.',           rel: 'CEO',       date: 'Jun 10', tx: 'Buy',  cost: 245.67, shares: 100000,  value: 24567000,   total: 715000000,   form: 'Jun 10 08:30 AM' },
  { ticker: 'AAPL',  owner: 'Cook Timothy D.',        rel: 'CEO',       date: 'Jun 10', tx: 'Sale', cost: 295.40, shares: 10000,   value: 2954000,    total: 3200000,     form: 'Jun 10 09:45 AM' },
  { ticker: 'MSFT',  owner: 'Nadella Satya',          rel: 'CEO',       date: 'Jun 10', tx: 'Sale', cost: 398.75, shares: 20000,   value: 7975000,    total: 5467891,     form: 'Jun 10 10:12 AM' },
  { ticker: 'GOOGL', owner: 'Pichai Sundar',          rel: 'CEO',       date: 'Jun 10', tx: 'Sale', cost: 168.22, shares: 35000,   value: 5887700,    total: 2345678,     form: 'Jun 10 11:00 AM' },
  { ticker: 'JPM',   owner: 'Dimon James',            rel: 'CEO',       date: 'Jun 11', tx: 'Buy',  cost: 247.83, shares: 50000,   value: 12391500,   total: 8765432,     form: 'Jun 11 06:15 PM' },
  { ticker: 'GS',    owner: 'Solomon David M.',       rel: 'CEO',       date: 'Jun 11', tx: 'Sale', cost: 591.20, shares: 8000,    value: 4729600,    total: 452341,      form: 'Jun 11 06:30 PM' },
  { ticker: 'AMD',   owner: 'Su Lisa T.',             rel: 'CEO',       date: 'Jun 11', tx: 'Sale', cost: 143.85, shares: 30000,   value: 4315500,    total: 2341567,     form: 'Jun 11 07:00 PM' },
  { ticker: 'NFLX',  owner: 'Hastings Reed',          rel: 'Director',  date: 'Jun 12', tx: 'Sale', cost: 1285.40, shares: 5000,  value: 6427000,    total: 1234567,     form: 'Jun 12 05:15 PM' },
  { ticker: 'CRM',   owner: 'Benioff Marc R.',        rel: 'CEO',       date: 'Jun 12', tx: 'Sale', cost: 318.45, shares: 40000,   value: 12738000,   total: 23456789,    form: 'Jun 12 05:45 PM' },
  { ticker: 'AVGO',  owner: 'Tan Hock E.',            rel: 'CEO',       date: 'Jun 12', tx: 'Sale', cost: 196.32, shares: 15000,   value: 2944800,    total: 3456789,     form: 'Jun 12 06:00 PM' },
  { ticker: 'LLY',   owner: 'Skovronsky Daniel M.',  rel: 'Director',  date: 'Jun 12', tx: 'Buy',  cost: 821.47, shares: 3000,    value: 2464410,    total: 876543,      form: 'Jun 12 07:30 PM' },
  { ticker: 'V',     owner: 'Schulman Al',            rel: 'CEO',       date: 'Jun 13', tx: 'Sale', cost: 342.18, shares: 12000,   value: 4106160,    total: 1567890,     form: 'Jun 13 05:15 PM' },
  { ticker: 'MA',    owner: 'Miebach Michael',        rel: 'CEO',       date: 'Jun 13', tx: 'Sale', cost: 498.75, shares: 8000,    value: 3990000,    total: 987654,      form: 'Jun 13 05:45 PM' },
  { ticker: 'XOM',   owner: 'Woods Darren W.',        rel: 'CEO',       date: 'Jun 13', tx: 'Sale', cost: 112.45, shares: 50000,   value: 5622500,    total: 2345678,     form: 'Jun 13 06:15 PM' },
  { ticker: 'CVX',   owner: 'Wirth Michael K.',       rel: 'CEO',       date: 'Jun 13', tx: 'Buy',  cost: 158.32, shares: 20000,   value: 3166400,    total: 1234567,     form: 'Jun 13 07:00 PM' },
  { ticker: 'UNH',   owner: 'Witty Andrew',           rel: 'CEO',       date: 'Jun 14', tx: 'Sale', cost: 398.45, shares: 15000,   value: 5976750,    total: 3456789,     form: 'Jun 14 05:30 PM' },
  { ticker: 'JNJ',   owner: 'Duato Joaquin',          rel: 'CEO',       date: 'Jun 14', tx: 'Sale', cost: 154.82, shares: 25000,   value: 3870500,    total: 1876543,     form: 'Jun 14 06:00 PM' },
  { ticker: 'PG',    owner: 'Moeller Jon R.',         rel: 'CEO',       date: 'Jun 14', tx: 'Sale', cost: 172.45, shares: 18000,   value: 3104100,    total: 987654,      form: 'Jun 14 06:30 PM' },
  { ticker: 'HD',    owner: 'Decker Ted',             rel: 'CEO',       date: 'Jun 14', tx: 'Buy',  cost: 384.22, shares: 10000,   value: 3842200,    total: 2345678,     form: 'Jun 14 07:15 PM' },
  { ticker: 'WMT',   owner: 'McMillon C. Douglas',    rel: 'CEO',       date: 'Jun 15', tx: 'Sale', cost: 98.34,  shares: 45000,   value: 4425300,    total: 3456789,     form: 'Jun 15 05:15 PM' },
  { ticker: 'COST',  owner: 'Galanti Richard A.',     rel: 'CFO',       date: 'Jun 15', tx: 'Sale', cost: 976.45, shares: 3000,    value: 2929350,    total: 876543,      form: 'Jun 15 05:45 PM' },
  { ticker: 'BRK-B', owner: 'Buffett Warren E.',      rel: 'CEO',       date: 'Jun 15', tx: 'Buy',  cost: 472.83, shares: 200000,  value: 94566000,   total: 1500000000,  form: 'Jun 15 06:00 PM' },
  { ticker: 'BAC',   owner: 'Moynihan Brian T.',      rel: 'CEO',       date: 'Jun 15', tx: 'Sale', cost: 48.92,  shares: 100000,  value: 4892000,    total: 4567890,     form: 'Jun 15 06:30 PM' },
  { ticker: 'INTC',  owner: 'Lip-Bu Tan',             rel: 'CEO',       date: 'Jun 15', tx: 'Buy',  cost: 22.18,  shares: 500000,  value: 11090000,   total: 12345678,    form: 'Jun 15 07:30 PM' },
  { ticker: 'ORCL',  owner: 'Ellison Larry J.',       rel: 'CTO',       date: 'Jun 15', tx: 'Sale', cost: 187.45, shares: 80000,   value: 14996000,   total: 1234567890,  form: 'Jun 15 08:00 PM' },
  { ticker: 'ADBE',  owner: 'Narayen Shantanu',       rel: 'CEO',       date: 'Jun 15', tx: 'Sale', cost: 482.34, shares: 10000,   value: 4823400,    total: 2345678,     form: 'Jun 15 08:15 PM' },
  { ticker: 'PYPL',  owner: 'Chriss Alex',            rel: 'CEO',       date: 'Jun 15', tx: 'Buy',  cost: 72.45,  shares: 25000,   value: 1811250,    total: 1234567,     form: 'Jun 15 08:30 PM' },
];

const MANAGERS: Entity[] = [
  { name: 'SUSQUEHANNA INTERNATIONAL GROUP, LLP', sub: 'Jeff Yass', portVal: '$918.33B', chg: 5.76,
    chart: [820,835,810,850,870,860,880,895,910,918],
    holdings: [{ticker:'NVDA',pct:8.07,val:'74.11B',chg:3.54},{ticker:'AAPL',pct:6.30,val:'57.85B',chg:1.82},{ticker:'MSFT',pct:5.48,val:'50.32B',chg:2.31},{ticker:'AMZN',pct:4.91,val:'45.09B',chg:3.13},{ticker:'META',pct:4.41,val:'40.50B',chg:4.67}]},
  { name: 'GOLDMAN SACHS GROUP INC', sub: 'David Solomon', portVal: '$870.14B', chg: -0.87,
    chart: [900,890,880,875,870,865,860,855,865,870],
    holdings: [{ticker:'AAPL',pct:7.12,val:'61.95B',chg:1.82},{ticker:'MSFT',pct:6.45,val:'56.13B',chg:2.31},{ticker:'AMZN',pct:5.23,val:'45.52B',chg:3.13},{ticker:'GOOGL',pct:4.87,val:'42.38B',chg:2.69},{ticker:'NVDA',pct:4.32,val:'37.59B',chg:3.54}]},
  { name: 'CITADEL ADVISORS LLC', sub: 'Ken Griffin', portVal: '$514.88B', chg: -1.29,
    chart: [540,530,520,515,510,505,510,508,512,515],
    holdings: [{ticker:'SPY',pct:12.45,val:'64.10B',chg:1.76},{ticker:'QQQ',pct:9.87,val:'50.82B',chg:3.14},{ticker:'NVDA',pct:6.54,val:'33.67B',chg:3.54},{ticker:'AAPL',pct:5.23,val:'26.93B',chg:1.82},{ticker:'TSLA',pct:4.12,val:'21.21B',chg:1.16}]},
  { name: 'WELLINGTON MANAGEMENT GROUP LLP', sub: 'Jean Hynes', portVal: '$935.46B', chg: -0.48,
    chart: [920,925,930,928,932,935,933,930,932,935],
    holdings: [{ticker:'AAPL',pct:5.87,val:'54.91B',chg:1.82},{ticker:'MSFT',pct:5.23,val:'48.92B',chg:2.31},{ticker:'AMZN',pct:4.76,val:'44.54B',chg:3.13},{ticker:'UNH',pct:3.45,val:'32.27B',chg:-0.32},{ticker:'JNJ',pct:3.12,val:'29.19B',chg:-0.16}]},
  { name: 'FISHER ASSET MANAGEMENT, LLC', sub: 'Ken Fisher', portVal: '$244.01B', chg: 6.89,
    chart: [200,210,215,220,225,228,232,237,241,244],
    holdings: [{ticker:'NVDA',pct:10.23,val:'24.97B',chg:3.54},{ticker:'AAPL',pct:8.76,val:'21.38B',chg:1.82},{ticker:'MSFT',pct:7.45,val:'18.18B',chg:2.31},{ticker:'AMZN',pct:6.12,val:'14.93B',chg:3.13},{ticker:'META',pct:5.34,val:'13.03B',chg:4.67}]},
  { name: 'BERKSHIRE HATHAWAY INC', sub: 'Warren Buffett', portVal: '$265.33B', chg: 1.24,
    chart: [255,258,260,257,261,263,262,264,265,265],
    holdings: [{ticker:'AAPL',pct:41.23,val:'109.37B',chg:1.82},{ticker:'BAC',pct:11.87,val:'31.49B',chg:0.44},{ticker:'AXP',pct:9.45,val:'25.07B',chg:0.87},{ticker:'KO',pct:8.23,val:'21.84B',chg:0.23},{ticker:'CVX',pct:6.78,val:'17.99B',chg:0.44}]},
  { name: 'MILLENNIUM MANAGEMENT LLC', sub: 'Izzy Englander', portVal: '$240.27B', chg: -3.09,
    chart: [260,255,250,248,245,242,241,240,239,240],
    holdings: [{ticker:'SPY',pct:8.45,val:'20.30B',chg:1.76},{ticker:'NVDA',pct:6.78,val:'16.30B',chg:3.54},{ticker:'AAPL',pct:5.67,val:'13.63B',chg:1.82},{ticker:'QQQ',pct:4.89,val:'11.75B',chg:3.14},{ticker:'MSFT',pct:4.23,val:'10.17B',chg:2.31}]},
  { name: 'AQR CAPITAL MANAGEMENT LLC', sub: 'Cliff Asness', portVal: '$216.27B', chg: 2.45,
    chart: [200,205,208,210,212,211,213,215,214,216],
    holdings: [{ticker:'AAPL',pct:6.34,val:'13.71B',chg:1.82},{ticker:'MSFT',pct:5.87,val:'12.70B',chg:2.31},{ticker:'NVDA',pct:5.23,val:'11.31B',chg:3.54},{ticker:'AMZN',pct:4.76,val:'10.30B',chg:3.13},{ticker:'META',pct:4.12,val:'8.91B',chg:4.67}]},
  { name: 'ARROWSTREET CAPITAL, LIMITED PARTNERSHIP', sub: 'Peter Rathjens', portVal: '$184.75B', chg: -2.14,
    chart: [195,192,190,188,186,185,183,184,183,185],
    holdings: [{ticker:'AAPL',pct:7.45,val:'13.76B',chg:1.82},{ticker:'MSFT',pct:6.78,val:'12.53B',chg:2.31},{ticker:'AMZN',pct:5.89,val:'10.88B',chg:3.13},{ticker:'GOOGL',pct:5.12,val:'9.46B',chg:2.69},{ticker:'NVDA',pct:4.67,val:'8.63B',chg:3.54}]},
  { name: 'DODGE & COX', sub: 'Dana Emery', portVal: '$301.98B', chg: 1.77,
    chart: [285,288,290,293,295,297,298,300,301,302],
    holdings: [{ticker:'CSCO',pct:5.45,val:'16.46B',chg:0.98},{ticker:'BAC',pct:5.12,val:'15.46B',chg:0.44},{ticker:'WFC',pct:4.87,val:'14.71B',chg:0.57},{ticker:'C',pct:4.23,val:'12.77B',chg:0.67},{ticker:'JPM',pct:3.98,val:'12.02B',chg:-0.41}]},
  { name: 'D.E. SHAW & CO., INC.', sub: 'David E. Shaw', portVal: '$356.25B', chg: -0.89,
    chart: [365,362,360,358,356,355,354,355,356,356],
    holdings: [{ticker:'NVDA',pct:7.23,val:'25.76B',chg:3.54},{ticker:'AAPL',pct:6.78,val:'24.15B',chg:1.82},{ticker:'MSFT',pct:6.12,val:'21.80B',chg:2.31},{ticker:'AMZN',pct:5.45,val:'19.41B',chg:3.13},{ticker:'SPY',pct:4.89,val:'17.42B',chg:1.76}]},
  { name: 'PRIMECAP MANAGEMENT CO/CA/', sub: 'Joel Fried', portVal: '$127.01B', chg: 3.44,
    chart: [110,113,115,118,120,122,124,125,126,127],
    holdings: [{ticker:'AMGN',pct:8.45,val:'10.73B',chg:1.23},{ticker:'LLY',pct:7.23,val:'9.18B',chg:-0.32},{ticker:'BIIB',pct:6.78,val:'8.61B',chg:2.14},{ticker:'VRTX',pct:5.89,val:'7.48B',chg:1.87},{ticker:'GILD',pct:5.12,val:'6.50B',chg:0.76}]},
];

const FUNDS: Entity[] = [
  { name: 'FIDELITY BLUE CHIP GROWTH FUND', sub: 'FIDELITY SECURITIES FUNDS', portVal: '$89.50B', chg: 1.37,
    chart: [80,82,83,84,85,86,87,88,89,90],
    holdings: [{ticker:'NVDA',pct:13.54,val:'12.12B',chg:3.54},{ticker:'AAPL',pct:11.28,val:'10.09B',chg:1.82},{ticker:'MSFT',pct:9.87,val:'8.83B',chg:2.31},{ticker:'META',pct:6.78,val:'6.07B',chg:4.67},{ticker:'AMZN',pct:5.67,val:'5.07B',chg:3.13}]},
  { name: 'T. ROWE PRICE CAPITAL APPRECIATION FUND', sub: 'T. Rowe Price Capital Appreciation Fund', portVal: '$66.00B', chg: -0.52,
    chart: [68,67,67,66,66,66,65,66,66,66],
    holdings: [{ticker:'AAPL',pct:9.23,val:'6.09B',chg:1.82},{ticker:'MSFT',pct:8.45,val:'5.58B',chg:2.31},{ticker:'GOOGL',pct:6.78,val:'4.48B',chg:2.69},{ticker:'JPM',pct:5.34,val:'3.52B',chg:-0.41},{ticker:'UNH',pct:4.56,val:'3.01B',chg:-0.32}]},
  { name: 'VANGUARD HEALTH CARE FUND', sub: 'VANGUARD SPECIALIZED FUNDS', portVal: '$35.10B', chg: -1.44,
    chart: [37,36.5,36,36,35.5,35,35,35,35,35],
    holdings: [{ticker:'LLY',pct:9.17,val:'3.22B',chg:-0.32},{ticker:'UNH',pct:8.45,val:'2.97B',chg:-0.32},{ticker:'JNJ',pct:7.12,val:'2.50B',chg:-0.16},{ticker:'MRK',pct:6.78,val:'2.38B',chg:0.43},{ticker:'ABBV',pct:5.89,val:'2.07B',chg:0.89}]},
  { name: 'SELECT SEMICONDUCTORS PORTFOLIO', sub: 'SELECT PORTFOLIOS', portVal: '$32.75B', chg: 7.02,
    chart: [27,28,29,30,30.5,31,31.5,32,32.5,33],
    holdings: [{ticker:'NVDA',pct:24.50,val:'8.02B',chg:3.54},{ticker:'AVGO',pct:18.76,val:'6.14B',chg:3.11},{ticker:'AMD',pct:9.87,val:'3.23B',chg:6.98},{ticker:'QCOM',pct:7.45,val:'2.44B',chg:1.23},{ticker:'INTC',pct:5.23,val:'1.71B',chg:0.87}]},
  { name: 'SELECT TECHNOLOGY PORTFOLIO', sub: 'SELECT PORTFOLIOS', portVal: '$77.42B', chg: -0.43,
    chart: [79,78.5,78,77.5,77,77,77,77,77.5,77],
    holdings: [{ticker:'MSFT',pct:15.87,val:'12.29B',chg:2.31},{ticker:'AAPL',pct:14.23,val:'11.02B',chg:1.82},{ticker:'NVDA',pct:13.45,val:'10.41B',chg:3.54},{ticker:'AVGO',pct:8.78,val:'6.80B',chg:3.11},{ticker:'CRM',pct:5.67,val:'4.39B',chg:1.45}]},
  { name: 'HARBOR CAPITAL APPRECIATION FUND', sub: 'HARBOR FUNDS', portVal: '$25.65B', chg: 2.27,
    chart: [23,23.5,24,24.5,25,25,25.2,25.4,25.5,25.6],
    holdings: [{ticker:'NVDA',pct:11.23,val:'2.88B',chg:3.54},{ticker:'MSFT',pct:9.87,val:'2.53B',chg:2.31},{ticker:'AAPL',pct:8.45,val:'2.17B',chg:1.82},{ticker:'META',pct:7.12,val:'1.83B',chg:4.67},{ticker:'AMZN',pct:6.78,val:'1.74B',chg:3.13}]},
  { name: 'CALVERT® INTERNATIONAL VALUE FUND', sub: 'CALVERT CAPITAL MANAGEMENT TRUL', portVal: '$17.47B', chg: 0.47,
    chart: [17,17.1,17.2,17.3,17.4,17.5,17.4,17.4,17.5,17.5],
    holdings: [{ticker:'ASML',pct:5.87,val:'1.03B',chg:2.12},{ticker:'NOVO-B',pct:4.78,val:'0.83B',chg:-1.23},{ticker:'SAP',pct:4.23,val:'0.74B',chg:1.45},{ticker:'TM',pct:3.87,val:'0.68B',chg:0.56},{ticker:'NESN',pct:3.45,val:'0.60B',chg:0.23}]},
  { name: 'T. ROWE PRICE EQUITY INCOME FUND', sub: 'T. Rowe Price Equity Income Fund', portVal: '$56.13B', chg: -0.12,
    chart: [57,56.8,56.6,56.4,56.2,56.1,56,56,56.1,56.1],
    holdings: [{ticker:'JPM',pct:6.78,val:'3.81B',chg:-0.41},{ticker:'BAC',pct:5.23,val:'2.94B',chg:0.44},{ticker:'WFC',pct:4.87,val:'2.73B',chg:0.57},{ticker:'XOM',pct:4.45,val:'2.50B',chg:-4.14},{ticker:'CVX',pct:4.12,val:'2.31B',chg:0.44}]},
  { name: 'AMG YACKTMAN FUND', sub: 'AMG FUNDS', portVal: '$6.01B', chg: 3.19,
    chart: [5.5,5.6,5.7,5.8,5.85,5.9,5.92,5.95,5.98,6.0],
    holdings: [{ticker:'MSFT',pct:12.45,val:'0.75B',chg:2.31},{ticker:'AAPL',pct:10.87,val:'0.65B',chg:1.82},{ticker:'WMT',pct:8.23,val:'0.49B',chg:-0.16},{ticker:'JNJ',pct:7.45,val:'0.45B',chg:-0.16},{ticker:'AMGN',pct:6.78,val:'0.41B',chg:1.23}]},
  { name: 'VANGUARD INTERNATIONAL GROWTH FUND', sub: 'VANGUARD INTERNATIONAL FUNDS', portVal: '$52.34B', chg: 0.89,
    chart: [50,50.5,51,51.5,52,52,52.1,52.2,52.3,52.3],
    holdings: [{ticker:'ASML',pct:7.23,val:'3.79B',chg:2.12},{ticker:'LVMH',pct:5.87,val:'3.07B',chg:1.23},{ticker:'NOVO-B',pct:5.12,val:'2.68B',chg:-1.23},{ticker:'SAP',pct:4.78,val:'2.50B',chg:1.45},{ticker:'NVO',pct:4.23,val:'2.22B',chg:-0.87}]},
  { name: 'BARON PARTNERS FUND', sub: 'BARON SELECT FUNDS', portVal: '$11.71B', chg: 4.82,
    chart: [9,9.5,10,10.5,10.8,11,11.2,11.4,11.6,11.7],
    holdings: [{ticker:'TSLA',pct:28.45,val:'3.33B',chg:1.16},{ticker:'SPOT',pct:12.87,val:'1.51B',chg:3.45},{ticker:'NVDA',pct:9.23,val:'1.08B',chg:3.54},{ticker:'CAVA',pct:5.78,val:'0.68B',chg:2.34},{ticker:'UBER',pct:4.56,val:'0.53B',chg:1.87}]},
  { name: 'PRIMECAP ODYSSEY GROWTH FUND', sub: 'PRIMECAP ODYSSEY FUNDS', portVal: '$8.23B', chg: 2.67,
    chart: [7.5,7.6,7.7,7.8,7.9,7.95,8.0,8.1,8.2,8.2],
    holdings: [{ticker:'AMGN',pct:9.45,val:'0.78B',chg:1.23},{ticker:'LLY',pct:8.23,val:'0.68B',chg:-0.32},{ticker:'VRTX',pct:7.12,val:'0.59B',chg:1.87},{ticker:'BIIB',pct:6.45,val:'0.53B',chg:2.14},{ticker:'GILD',pct:5.87,val:'0.48B',chg:0.76}]},
];

// ===== HELPERS =====
function fmt(n: number) { return n.toLocaleString('en-US'); }

function buildSparkline(vals: number[], w: number, h: number) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pad = 4;
  return vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return { x, y };
  });
}

// ===== SPARKLINE =====
function Sparkline({ vals, chg, id }: { vals: number[]; chg: number; id: string }) {
  const W = 240, H = 52;
  const pts = buildSparkline(vals, W, H);
  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const fillD = `${pathD} L ${W} ${H} L 0 ${H} Z`;
  const color = chg >= 0 ? '#22c55e' : '#ef4444';
  const gradId = `g-${id}`;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// ===== FILTER DROPDOWN =====
function FilterDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1 text-xs bg-muted border border-border rounded hover:bg-muted/80 text-foreground"
      >
        {value}
        <ChevronDown className="w-3 h-3 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 w-44 bg-popover border border-border rounded shadow-xl py-1">
          {TX_FILTERS.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors',
                opt === value ? 'text-sky-400 bg-sky-500/10' : 'text-foreground')}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== SORT BY DROPDOWN =====
function SortBy({ value, onChange, asc, onToggle }: {
  value: SortOpt; onChange: (v: SortOpt) => void; asc: boolean; onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const visible = SORT_OPTS.filter(o => o.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Sort by</span>
      <div className="relative" ref={ref}>
        <button onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1.5 px-3 py-1 text-xs bg-muted border border-border rounded hover:bg-muted/80 text-foreground min-w-32">
          <span className="truncate">{value}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
        {open && (
          <div className="absolute z-50 top-full mt-1 right-0 w-56 bg-popover border border-border rounded shadow-xl">
            <div className="p-2 border-b border-border">
              <div className="flex items-center gap-1.5 bg-muted rounded px-2 py-1">
                <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                  placeholder="Search..."
                  className="bg-transparent text-xs outline-none w-full text-foreground placeholder:text-muted-foreground" />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {visible.map(opt => (
                <button key={opt} onClick={() => { onChange(opt); setOpen(false); setQ(''); }}
                  className={cn('w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors',
                    opt === value ? 'text-sky-400 bg-sky-500/10' : 'text-foreground')}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <button onClick={onToggle}
        className={cn('p-1 rounded border transition-colors', asc ? 'border-sky-500 text-sky-400 bg-sky-500/10' : 'border-border text-muted-foreground hover:text-foreground')}>
        <ArrowUp className="w-3.5 h-3.5" />
      </button>
      <button onClick={onToggle}
        className={cn('p-1 rounded border transition-colors', !asc ? 'border-sky-500 text-sky-400 bg-sky-500/10' : 'border-border text-muted-foreground hover:text-foreground')}>
        <ArrowDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ===== ENTITY CARD (Managers + Funds) =====
function EntityCard({ item, idx }: { item: Entity; idx: number }) {
  const pos = item.chg >= 0;
  const safeId = `${idx}-${item.name.slice(0, 8).replace(/\W/g, '')}`;
  return (
    <div className="bg-card border border-border rounded overflow-hidden hover:border-muted-foreground/40 transition-colors">
      <div className="px-3 pt-2.5 pb-1 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-foreground leading-tight">{item.name}</div>
          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.sub}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs font-bold text-foreground">{item.portVal}</div>
          <div className={cn('text-[10px] font-medium', pos ? 'text-green-400' : 'text-red-400')}>
            {pos ? '+' : ''}{item.chg.toFixed(2)}% Last Q
          </div>
        </div>
      </div>

      <div className="px-3 pb-1">
        <Sparkline vals={item.chart} chg={item.chg} id={safeId} />
      </div>

      <div className="px-3 pb-3 border-t border-border/50 pt-2">
        <div className="grid grid-cols-3 gap-x-1 text-[10px] text-muted-foreground mb-1">
          <span>Ticker</span>
          <span className="text-right">Chg %</span>
          <span className="text-right">Value</span>
        </div>
        {item.holdings.map(h => (
          <div key={h.ticker} className="grid grid-cols-3 gap-x-1 text-[10px] py-[2px]">
            <span className="text-sky-400 font-medium">{h.ticker}</span>
            <span className={cn('text-right font-medium', h.chg >= 0 ? 'text-green-400' : 'text-red-400')}>
              {h.chg >= 0 ? '+' : ''}{h.chg.toFixed(2)}%
            </span>
            <span className="text-right text-muted-foreground">${h.val}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== INSIDERS TAB =====
function InsidersTab() {
  const [view, setView] = useState<InsiderView>('latest');
  const [txFilter, setTxFilter] = useState<string>('All Transactions');
  const [sortOpt, setSortOpt] = useState<SortOpt>('Most Popular');
  const [asc, setAsc] = useState(false);

  const rows = useMemo(() => {
    let list = [...TRADES];
    if (txFilter !== 'All Transactions') {
      list = list.filter(t => {
        if (txFilter === 'Buy') return t.tx === 'Buy';
        if (txFilter === 'Sell') return t.tx === 'Sale';
        if (txFilter === 'Sale - Planned') return t.tx === 'Sale - Planned';
        if (txFilter === 'Gift') return t.tx === 'Gift';
        if (txFilter === 'Option Exercise') return t.tx === 'Option Exercise';
        return true;
      });
    }
    if (view === 'top-week') list = [...list].sort((a, b) => b.value - a.value).slice(0, 20);
    if (view === 'top-10pct') list = list.filter(t => t.rel.includes('Owner') || t.rel === 'CEO');
    return list;
  }, [txFilter, view]);

  const subTabs: { key: InsiderView; label: string }[] = [
    { key: 'latest',    label: 'Latest Insider Trading' },
    { key: 'top-week',  label: 'Top Insider Trading Recent Week' },
    { key: 'top-10pct', label: 'Top 10% Owner Trading Recent Week' },
  ];

  return (
    <div>
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-border bg-card/30">
        <div className="flex items-center gap-0 text-xs flex-wrap">
          {subTabs.map((t, i) => (
            <span key={t.key} className="flex items-center">
              {i > 0 && <span className="text-border mx-2 select-none">|</span>}
              <button onClick={() => setView(t.key)}
                className={cn('hover:text-foreground transition-colors py-0.5',
                  view === t.key
                    ? 'text-foreground font-semibold underline underline-offset-2 decoration-sky-400'
                    : 'text-muted-foreground')}>
                {t.label}
              </button>
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Filter</span>
            <FilterDropdown value={txFilter} onChange={setTxFilter} />
          </div>
          <SortBy value={sortOpt} onChange={setSortOpt} asc={asc} onToggle={() => setAsc(a => !a)} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-muted/40 text-muted-foreground border-b border-border text-left">
              <th className="px-3 py-2 w-8 font-medium">#</th>
              <th className="px-3 py-2 font-medium">Ticker</th>
              <th className="px-3 py-2 font-medium">Owner</th>
              <th className="px-3 py-2 font-medium">Relationship</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Transaction</th>
              <th className="px-3 py-2 text-right font-medium">Cost</th>
              <th className="px-3 py-2 text-right font-medium">#Shares</th>
              <th className="px-3 py-2 text-right font-medium">Value ($)</th>
              <th className="px-3 py-2 text-right font-medium">#Shares Total</th>
              <th className="px-3 py-2 font-medium">SEC Form 4</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const buy = row.tx === 'Buy';
              return (
                <tr key={i} className={cn('border-b border-border/40 hover:brightness-125 transition-all',
                  buy ? 'bg-green-950/25' : 'bg-red-950/20')}>
                  <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-1.5">
                    <span className="text-sky-400 font-semibold cursor-pointer hover:underline">{row.ticker}</span>
                  </td>
                  <td className="px-3 py-1.5 text-foreground whitespace-nowrap">{row.owner}</td>
                  <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{row.rel}</td>
                  <td className="px-3 py-1.5 text-muted-foreground whitespace-nowrap">{row.date}</td>
                  <td className="px-3 py-1.5">
                    <span className={cn('font-semibold', buy ? 'text-green-400' : 'text-red-400')}>{row.tx}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-foreground">${row.cost.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground">{fmt(row.shares)}</td>
                  <td className="px-3 py-1.5 text-right text-foreground">${fmt(row.value)}</td>
                  <td className="px-3 py-1.5 text-right text-muted-foreground">{fmt(row.total)}</td>
                  <td className="px-3 py-1.5">
                    <span className="text-sky-400 text-[10px] cursor-pointer hover:underline whitespace-nowrap">{row.form}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== MANAGERS TAB =====
function ManagersTab() {
  const [sortOpt, setSortOpt] = useState<SortOpt>('Most Popular');
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...MANAGERS];
    if (sortOpt === 'Portfolio Value') {
      const parse = (s: string) => parseFloat(s.replace(/[$B]/g, ''));
      arr.sort((a, b) => asc ? parse(a.portVal) - parse(b.portVal) : parse(b.portVal) - parse(a.portVal));
    }
    return arr;
  }, [sortOpt, asc]);

  return (
    <div>
      <div className="flex items-center justify-end px-4 py-2 border-b border-border bg-card/30">
        <SortBy value={sortOpt} onChange={setSortOpt} asc={asc} onToggle={() => setAsc(a => !a)} />
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((m, i) => <EntityCard key={m.name} item={m} idx={i} />)}
      </div>
    </div>
  );
}

// ===== FUNDS TAB =====
function FundsTab() {
  const [sortOpt, setSortOpt] = useState<SortOpt>('Most Popular');
  const [asc, setAsc] = useState(false);

  const sorted = useMemo(() => {
    const arr = [...FUNDS];
    if (sortOpt === 'Portfolio Value') {
      const parse = (s: string) => parseFloat(s.replace(/[$B]/g, ''));
      arr.sort((a, b) => asc ? parse(a.portVal) - parse(b.portVal) : parse(b.portVal) - parse(a.portVal));
    }
    return arr;
  }, [sortOpt, asc]);

  return (
    <div>
      <div className="flex items-center justify-end px-4 py-2 border-b border-border bg-card/30">
        <SortBy value={sortOpt} onChange={setSortOpt} asc={asc} onToggle={() => setAsc(a => !a)} />
      </div>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {sorted.map((f, i) => <EntityCard key={f.name} item={f} idx={100 + i} />)}
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function InsiderPage() {
  const [tab, setTab] = useState<TopTab>('insiders');

  const tabs: { key: TopTab; label: string }[] = [
    { key: 'insiders', label: 'Insiders' },
    { key: 'managers', label: 'Managers' },
    { key: 'funds',    label: 'Funds' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top tabs */}
      <div className="flex items-center gap-0 px-4 pt-3 border-b border-border bg-card/20">
        {tabs.map((t, i) => (
          <span key={t.key} className="flex items-center">
            {i > 0 && <span className="text-border/60 mx-3 text-sm select-none">|</span>}
            <button
              onClick={() => setTab(t.key)}
              className={cn(
                'pb-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                tab === t.key
                  ? 'text-sky-400 border-sky-400'
                  : 'text-muted-foreground border-transparent hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          </span>
        ))}
      </div>

      {tab === 'insiders' && <InsidersTab />}
      {tab === 'managers' && <ManagersTab />}
      {tab === 'funds'    && <FundsTab />}
    </div>
  );
}
