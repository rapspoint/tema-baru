/* =============================================
   RAPSPOINT BLOGGER THEME — script.js
   Live Prices | TOC | AOS | Scroll Effects
   ============================================= */

'use strict';

/* =============================================
   1. INIT — Run after DOM ready
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  initAOS();
  initTheme();
  initScrollEffects();
  initReadingProgress();
  fetchLivePrices();
  initTOC();
  initReadTime();
  setFooterYear();
});

/* =============================================
   2. AOS — Animate on Scroll
   ============================================= */
function initAOS() {
  if (typeof AOS !== 'undefined') {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
      delay: 0,
    });
  }
}

/* =============================================
   3. THEME TOGGLE (Dark / Light)
   ============================================= */
function initTheme() {
  const saved = localStorage.getItem('raps-theme') || 'dark';
  applyTheme(saved);
}

function applyTheme(theme) {
  const body = document.body;
  const icon = document.getElementById('theme-icon');
  if (theme === 'light') {
    body.classList.remove('dark');
    body.classList.add('light');
    if (icon) icon.textContent = '☀️';
  } else {
    body.classList.remove('light');
    body.classList.add('dark');
    if (icon) icon.textContent = '🌙';
  }
  localStorage.setItem('raps-theme', theme);
}

function toggleTheme() {
  const current = localStorage.getItem('raps-theme') || 'dark';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* =============================================
   4. SCROLL EFFECTS — Back to Top, Header shrink
   ============================================= */
function initScrollEffects() {
  const btt = document.getElementById('back-to-top');
  const header = document.getElementById('site-header');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;

    // Back to top visibility
    if (btt) {
      scrollY > 400 ? btt.classList.add('visible') : btt.classList.remove('visible');
    }

    // Header compact on scroll
    if (header) {
      scrollY > 80
        ? header.style.setProperty('box-shadow', '0 4px 24px rgba(0,0,0,0.5)')
        : header.style.removeProperty('box-shadow');
    }
  }, { passive: true });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =============================================
   5. READING PROGRESS BAR
   ============================================= */
function initReadingProgress() {
  const bar = document.getElementById('reading-progress');
  if (!bar) return;

  // Only show on single post page
  const postBody = document.getElementById('post-body');
  if (!postBody) {
    bar.style.display = 'none';
    return;
  }

  window.addEventListener('scroll', () => {
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = (window.scrollY / docH) * 100;
    bar.style.width = Math.min(scrolled, 100) + '%';
  }, { passive: true });
}

/* =============================================
   6. LIVE PRICE TICKER — CoinGecko API
   ============================================= */

// Asset config: [id for CoinGecko, display symbol, is gold/xau]
const ASSETS = [
  { id: 'bitcoin',       symbol: 'BTC',  isCrypto: true  },
  { id: 'ethereum',      symbol: 'ETH',  isCrypto: true  },
  { id: 'ripple',        symbol: 'XRP',  isCrypto: true  },
  { id: 'solana',        symbol: 'SOL',  isCrypto: true  },
  { id: 'tether',        symbol: 'USDT', isCrypto: true  },
  { id: 'usd-coin',      symbol: 'USDC', isCrypto: true  },
  { id: 'arbitrum',      symbol: 'ARB',  isCrypto: true  },
  { id: 'gold',          symbol: 'GOLD', isCrypto: false },
];

const COINGECKO_IDS = ASSETS.map(a => a.id).join(',');
const CACHE_KEY     = 'raps-price-cache';
const CACHE_TTL     = 60 * 1000; // 1 minute

async function fetchLivePrices() {
  // Check cache first
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      renderTicker(cached.data);
      renderSidebarPrices(cached.data);
      return;
    }
  } catch (_) {}

  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${COINGECKO_IDS}&vs_currencies=usd&include_24hr_change=true`;

  try {
    const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();

    // Cache it
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));

    renderTicker(data);
    renderSidebarPrices(data);

    // Refresh every 60s
    setTimeout(fetchLivePrices, 60000);

  } catch (err) {
    console.warn('Price fetch failed:', err.message);
    showTickerError();
  }
}

function formatPrice(price) {
  if (price >= 1000) return '$' + price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1)    return '$' + price.toFixed(2);
  return '$' + price.toFixed(4);
}

function formatChange(change) {
  if (change === undefined || change === null) return { text: '—', cls: '' };
  const isUp  = change >= 0;
  const text  = (isUp ? '+' : '') + change.toFixed(2) + '%';
  return { text, cls: isUp ? 'up' : 'down' };
}

function renderTicker(data) {
  const inner = document.getElementById('ticker-inner');
  if (!inner) return;

  let html = '';
  ASSETS.forEach(asset => {
    const d = data[asset.id];
    if (!d) return;
    const price  = d.usd;
    const change = d.usd_24h_change;
    const { text: changeText, cls: changeCls } = formatChange(change);

    html += `
      <span class="ticker-item">
        <span class="ticker-symbol">${asset.symbol}</span>
        <span class="ticker-price">${formatPrice(price)}</span>
        <span class="ticker-change ${changeCls}">${changeText}</span>
      </span>`;
  });

  // Duplicate for seamless loop
  inner.innerHTML = html + html;
}

function renderSidebarPrices(data) {
  const container = document.getElementById('sidebar-prices');
  if (!container) return;

  // Show top 5 in sidebar
  const top5 = ASSETS.slice(0, 5);
  let html = '';

  top5.forEach(asset => {
    const d = data[asset.id];
    if (!d) return;
    const price  = d.usd;
    const change = d.usd_24h_change;
    const { text: changeText, cls: changeCls } = formatChange(change);

    html += `
      <div class="sidebar-price-item">
        <span class="sidebar-price-symbol">${asset.symbol}</span>
        <div class="sidebar-price-right">
          <span class="sidebar-price-value">${formatPrice(price)}</span>
          <span class="sidebar-price-change ${changeCls}">${changeText}</span>
        </div>
      </div>`;
  });

  container.innerHTML = html || '<div class="price-loading">Data tidak tersedia</div>';
}

function showTickerError() {
  const inner = document.getElementById('ticker-inner');
  if (inner) {
    inner.innerHTML = `<span class="ticker-loading">Gagal memuat data harga. Mencoba lagi...</span>`;
  }
  const sidebar = document.getElementById('sidebar-prices');
  if (sidebar) {
    sidebar.innerHTML = `<div class="price-loading">Gagal memuat data</div>`;
  }
  // Retry after 30s
  setTimeout(fetchLivePrices, 30000);
}

/* =============================================
   7. TABLE OF CONTENTS — Auto Generate
   ============================================= */
function initTOC() {
  const postBody = document.getElementById('post-body');
  const tocNav   = document.getElementById('toc-nav');
  const tocWrap  = document.getElementById('toc-container');

  if (!postBody || !tocNav || !tocWrap) return;

  const headings = postBody.querySelectorAll('h2, h3');
  if (headings.length < 2) {
    tocWrap.style.display = 'none';
    return;
  }

  let html = '<ol>';
  headings.forEach((h, i) => {
    // Generate anchor ID if not present
    if (!h.id) {
      h.id = 'section-' + i + '-' + h.textContent.trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 50);
    }

    const isH3 = h.tagName === 'H3';
    const cls  = isH3 ? 'toc-h3' : 'toc-h2';

    html += `
      <li class="${cls}">
        <a href="#${h.id}" onclick="smoothScrollTOC(event, '${h.id}')">${h.textContent.trim()}</a>
      </li>`;
  });
  html += '</ol>';

  tocNav.innerHTML = html;

  // Highlight active heading on scroll
  initTOCHighlight(headings);
}

function smoothScrollTOC(event, id) {
  event.preventDefault();
  const el = document.getElementById(id);
  if (!el) return;
  const offset = 120;
  const top = el.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: 'smooth' });
}

function initTOCHighlight(headings) {
  const links = document.querySelectorAll('.toc-nav a');
  if (!links.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.style.color = '');
        const active = document.querySelector(`.toc-nav a[href="#${entry.target.id}"]`);
        if (active) active.style.color = 'var(--neon)';
      }
    });
  }, { rootMargin: '-20% 0px -70% 0px' });

  headings.forEach(h => observer.observe(h));
}

function toggleTOC() {
  const nav = document.getElementById('toc-nav');
  const btn = document.querySelector('.toc-toggle');
  if (!nav || !btn) return;
  const isHidden = nav.classList.toggle('hidden');
  btn.textContent = isHidden ? '+' : '−';
}

/* =============================================
   8. READ TIME ESTIMATE
   ============================================= */
function initReadTime() {
  const postBody = document.getElementById('post-body');
  const readTime = document.getElementById('read-time');
  if (!postBody || !readTime) return;

  const words   = postBody.innerText.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  readTime.textContent = `· ${minutes} menit baca`;
}

/* =============================================
   9. SEARCH BAR TOGGLE
   ============================================= */
function toggleSearch() {
  const bar = document.getElementById('search-bar');
  if (!bar) return;
  bar.classList.toggle('active');
  if (bar.classList.contains('active')) {
    setTimeout(() => bar.querySelector('input')?.focus(), 100);
  }
}

/* =============================================
   10. MOBILE MENU TOGGLE
   ============================================= */
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('mobile-menu-btn');
  if (!menu) return;
  menu.classList.toggle('active');
}

// Close mobile menu on outside click
document.addEventListener('click', (e) => {
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('mobile-menu-btn');
  if (menu && menu.classList.contains('active')) {
    if (!menu.contains(e.target) && !btn?.contains(e.target)) {
      menu.classList.remove('active');
    }
  }
});

/* =============================================
   11. FOOTER YEAR
   ============================================= */
function setFooterYear() {
  const el = document.getElementById('year');
  if (el) el.textContent = new Date().getFullYear();
}

/* =============================================
   12. CLOSE SEARCH ON ESC
   ============================================= */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('search-bar')?.classList.remove('active');
    document.getElementById('mobile-menu')?.classList.remove('active');
  }
});
