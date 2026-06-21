const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1440, height: 900 });

  const BASE = 'https://charthog.com';

  const pages = [
    { name: 'home',      path: '/home'        },
    { name: 'heatmap',   path: '/heatmap'     },
    { name: 'calendar',  path: '/calendar'    },
    { name: 'portfolio', path: '/portfolio'   },
    { name: 'stock-aapl',path: '/stock/AAPL'  },
    { name: 'insider',   path: '/insider'     },
    { name: 'news',      path: '/news'        },
    { name: 'screener',  path: '/screener'    },
  ];

  for (const p of pages) {
    console.log(`Capturing ${p.name}…`);
    await page.goto(BASE + p.path, { waitUntil: 'networkidle', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: `C:/Users/psylv/Desktop/charthog/screenshots/${p.name}.png`,
      fullPage: false,
    });
    console.log(`  ✓ ${p.name}`);
  }

  await browser.close();
  console.log('Done.');
})();
