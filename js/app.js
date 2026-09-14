/**
 * Arranque de la aplicación.
 */

import { qs, esc } from './lib/dom.js';
import { icon } from './lib/icons.js';
import { dateMedium } from './lib/format.js';
import { applyTheme, getTheme, cycleTheme, effectiveTheme } from './lib/storage.js';
import { installCrestFallback } from './components/crest.js';
import { installSearchOverlay, open as openSearch } from './components/searchOverlay.js';
import { installAuthWidget } from './components/authWidget.js';
import { load, subscribe, nextFixtures } from './data/store.js';
import { startRouter, route } from './router.js';
import { initAuth, subscribe as subscribeAuth } from './data/auth.js';
import { clubShort } from './data/clubs.js';

/* ---------- tema ---------- */

function paintThemeButton() {
  const button = qs('#theme-btn');
  if (!button) return;
  const current = effectiveTheme();
  button.innerHTML = current === 'dark' ? icon('sun') : icon('moon');
  button.title = `Tema: ${getTheme() === 'auto' ? 'automático' : getTheme()}`;
  button.setAttribute('aria-label', button.title);
}

function installTheme() {
  applyTheme(getTheme());
  paintThemeButton();
  qs('#theme-btn')?.addEventListener('click', () => {
    cycleTheme();
    paintThemeButton();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', paintThemeButton);
}

/* ---------- topbar ---------- */

function renderTopbar() {
  const el = qs('#topbar');
  if (!el) return;
  const next = nextFixtures(1)[0];
  if (!next) {
    el.innerHTML = '';
    return;
  }
  el.innerHTML = `<div class="shell topbar__inner">
      <span>Próximo partido</span>
      <strong>${esc(dateMedium(next.date))} · vs ${esc(clubShort(next.club))}</strong>
      <span>${esc(next.family.short)}</span>
    </div>`;
}

/* ---------- header ---------- */

function installHeader() {
  const header = qs('.site-header');
  const onScroll = () => header.classList.toggle('is-stuck', window.scrollY > 4);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  qs('#search-btn')?.addEventListener('click', () => openSearch());
  qs('#search-btn-mobile')?.addEventListener('click', () => openSearch());

  installAuthWidget();
  subscribeAuth(() => {
    if (routerStarted) route();
  });
}

/* ---------- estados de carga ---------- */

function skeletonHTML() {
  return `<div class="shell section">
      <div style="display:grid;gap:18px;max-width:640px">
        <div class="skeleton" style="height:26px;width:180px"></div>
        <div class="skeleton" style="height:64px"></div>
        <div class="skeleton" style="height:20px;width:80%"></div>
      </div>
      <div class="piece-grid" style="margin-top:44px">
        ${Array.from({ length: 8 }, () => '<div class="skeleton skeleton-card"></div>').join('')}
      </div>
    </div>`;
}

function errorHTML(error) {
  return `<div class="shell section">
      <div class="empty">
        <h4>No se pudo abrir el archivo</h4>
        <p>${esc(error && error.message ? error.message : 'Error de conexión')}</p>
        <button type="button" class="btn btn--primary btn--sm" onclick="location.reload()">Reintentar</button>
      </div>
    </div>`;
}

/* ---------- arranque ---------- */

let routerStarted = false;

function boot() {
  installTheme();
  installHeader();
  installCrestFallback();
  installSearchOverlay();
  initAuth();

  const view = qs('#view');
  view.innerHTML = skeletonHTML();

  // Se espera al archivo completo antes de pintar: las estadísticas y los
  // filtros se calculan sobre el total, y mostrar cifras a medias y corregirlas
  // un segundo después es peor que esperar. La caché de sesión hace que la
  // segunda visita sea instantánea.
  subscribe((s) => {
    if (s.status === 'error') {
      view.innerHTML = errorHTML(s.error);
      return;
    }
    if (s.status === 'ready' && !routerStarted) {
      routerStarted = true;
      renderTopbar();
      startRouter();
    }
  });

  load().catch((error) => console.error('No se pudo cargar el archivo:', error));
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

