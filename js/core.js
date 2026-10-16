/* Núcleo: estado, almacenamiento, utilidades de UI. Expone window.App */
(function () {
  'use strict';
  const EC = window.EC;
  const KEY = 'rolpagos-ec-v2';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => (n < 0 ? '-$' : '$') + Math.abs(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const uid = () => Math.random().toString(36).slice(2, 9);
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  const hoy = new Date();
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  const blank = () => ({
    v: 2, demo: false,
    cfg: JSON.parse(JSON.stringify(EC.DEFAULTS)),
    empresa: { nombre: '', ruc: '', direccion: '', establecimiento: '001', punto: '001', ambiente: '1', regimen: 'General' },
    empleados: [], periodos: {}, checks: {},
    clientes: [], productos: [], docs: [], seq: {},
    finiquitos: [], utilidades: { valor: 0, anio: hoy.getFullYear() - 1 },
    periodo: mesActual, selEmp: null,
  });

  const App = { views: {}, EC, $, $$, esc, money, uid, MESES, blank };
  App.S = blank();
  let fresh = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { fresh = false; const j = JSON.parse(raw); App.S = Object.assign(blank(), j, { cfg: Object.assign({}, EC.DEFAULTS, j.cfg) }); }
  } catch (e) { /* sin storage */ }
  App.fresh = fresh;
  App.save = () => { try { localStorage.setItem(KEY, JSON.stringify(App.S)); } catch (e) { /* ignorar */ } };
  App.replace = (s) => { App.S = Object.assign(blank(), s, { cfg: Object.assign({}, EC.DEFAULTS, s.cfg) }); App.save(); };

  App.periodoLabel = (p) => { const [y, m] = p.split('-'); return `${MESES[+m - 1]} ${y}`; };
  App.shiftPeriodo = (p, d) => { const [y, m] = p.split('-').map(Number); const dt = new Date(y, m - 1 + d, 1); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`; };
  App.novedades = (id, p) => { const S = App.S; return ((S.periodos[p || S.periodo] ||= {})[id] ||= {}); };
  App.calc = (e, p) => EC.calcular(e, (App.S.periodos[p || App.S.periodo] || {})[e.id] || {}, App.S.cfg, p || App.S.periodo);
  App.totalesPeriodo = (p) => {
    const T = { neto: 0, ingresos: 0, egresos: 0, iess: 0, iessEmp: 0, renta: 0, prov: 0, costo: 0, n: 0, sueldos: 0, extras: 0, decimos: 0 };
    App.S.empleados.forEach((e) => {
      if (EC.mesesAntiguedad(e.ingreso, p) < 0 || (e.ingreso && e.ingreso.slice(0, 7) > p)) return;
      const c = App.calc(e, p); T.n++;
      T.neto += c.neto; T.ingresos += c.totalIngresos; T.egresos += c.totalEgresos; T.iessEmp += c.iessEmp; T.renta += c.renta;
      T.iess += c.iessEmp + c.patronal + c.secap + c.iece; T.prov += c.prov13 + c.prov14 + c.provFR + c.provVac; T.costo += c.costoEmpleador;
      T.sueldos += c.sueldo; T.extras += c.horasExtras; T.decimos += c.d13Pago + c.d14Pago + c.frPago;
      T.patronal = (T.patronal || 0) + c.patronal + c.secap + c.iece;
    });
    Object.keys(T).forEach((k) => (T[k] = EC.r2(T[k])));
    return T;
  };

  /* ---------- Iconos ---------- */
  const P = {
    dash: 'M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10',
    rol: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
    users: 'M16 19v-1a4 4 0 00-4-4H7a4 4 0 00-4 4v1M9.5 10a3 3 0 100-6 3 3 0 000 6zM21 19v-1a4 4 0 00-3-3.9M15 4.1a3 3 0 010 5.8',
    exit: 'M9 4H5v16h4M16 8l4 4-4 4M20 12H9',
    doc: 'M7 3h8l4 4v14H7zM14 3v5h5M10 13h6M10 17h6',
    cart: 'M3 4h2l2.4 11h10.2L20 8H6.2M10 20a1 1 0 100-2 1 1 0 000 2zM17 20a1 1 0 100-2 1 1 0 000 2z',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5',
    tool: 'M14.7 6.3a4 4 0 01-5 5L4 17l3 3 5.7-5.7a4 4 0 005-5l-2.4 2.4-2.6-.6-.6-2.6z',
    cog: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z',
    plus: 'M12 5v14M5 12h14', x: 'M6 6l12 12M18 6L6 18', check: 'M5 12.5l4.5 4.5L19 7.5',
    trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',
    down: 'M12 4v12M7 11l5 5 5-5M5 20h14', up: 'M12 20V8M7 13l5-5 5 5M5 4h14',
    alert: 'M12 3l10 18H2zM12 10v5M12 18v.5',
    left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7',
    sun: 'M12 16a4 4 0 100-8 4 4 0 000 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
    moon: 'M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z',
    send: 'M4 12l16-8-6 16-3-7z', edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
    truck: 'M3 6h11v10H3zM14 9h4l3 3v4h-7M7 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z',
    menu: 'M4 7h16M4 12h16M4 17h16', undo: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
    search: 'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-5-5', calc: 'M6 3h12v18H6zM9 7h6M9 12h1M14 12h1M9 16h1M14 16h1',
  };
  App.icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n] || ''}"/></svg>`;

  /* ---------- Números animados ---------- */
  App.setNum = (el, v, fmt = money) => {
    if (!el) return;
    const from = el._v === undefined ? v : el._v;
    el._v = v;
    if (from === v || reduce()) { el.textContent = fmt(v); return; }
    cancelAnimationFrame(el._raf);
    const t0 = performance.now(), D = 520;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
    const step = (t) => {
      const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(from + (v - from) * e);
      if (k < 1) el._raf = requestAnimationFrame(step); else el.textContent = fmt(v);
    };
    el._raf = requestAnimationFrame(step);
  };

  /* ---------- Toast con deshacer ---------- */
  App.toast = (msg, undo) => {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="lnk" id="tundo">Deshacer</button>' : ''}`;
    t.classList.add('on');
    if (undo) $('#tundo').onclick = () => { undo(); t.classList.remove('on'); };
    clearTimeout(App.toast.t); App.toast.t = setTimeout(() => t.classList.remove('on'), undo ? 7000 : 2400);
  };

  /* ---------- Diálogos ---------- */
  App.modal = (html, { wide = false, onClose } = {}) => {
    const d = $('#dlg'); d.className = wide ? 'wide' : '';
    d.innerHTML = html; if (!d.open) d.showModal();
    d.onclose = () => { d.innerHTML = ''; onClose && onClose(); };
    return d;
  };
  App.closeModal = () => { const d = $('#dlg'); if (d.open) d.close(); };
  App.confirm = ({ title, text, ok = 'Confirmar', danger = false }) => new Promise((res) => {
    const d = $('#cfm');
    d.innerHTML = `<h3>${esc(title)}</h3><p>${esc(text || '')}</p><div class="row end"><button class="btn" value="no">Cancelar</button><button class="btn ${danger ? 'danger-solid' : 'primary'}" value="yes">${esc(ok)}</button></div>`;
    d.showModal();
    d.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; d.close(); res(b.value === 'yes'); };
    d.oncancel = () => res(false);
  });

  /* ---------- Vaciar módulos (con deshacer) ---------- */
  App.MODULOS = {
    empleados: { nombre: 'Empleados y roles de pago', desc: 'Fichas de empleados y novedades de todos los meses', count: (S) => S.empleados.length, clear: (S) => { S.empleados = []; S.periodos = {}; S.selEmp = null; } },
    liquidaciones: { nombre: 'Liquidaciones y utilidades', desc: 'Finiquitos calculados y cálculo de utilidades', count: (S) => S.finiquitos.length, clear: (S) => { S.finiquitos = []; S.utilidades = { valor: 0, anio: S.utilidades.anio }; } },
    comprobantes: { nombre: 'Comprobantes SRI (simulador)', desc: 'Facturas, notas, guías y retenciones emitidas', count: (S) => S.docs.length, clear: (S) => { S.docs = []; S.seq = {}; } },
    catalogo: { nombre: 'Clientes y productos', desc: 'Catálogo usado al emitir comprobantes', count: (S) => S.clientes.length + S.productos.length, clear: (S) => { S.clientes = []; S.productos = []; } },
    checklist: { nombre: 'Checklist de cumplimiento', desc: 'Casillas marcadas', count: (S) => Object.values(S.checks).filter(Boolean).length, clear: (S) => { S.checks = {}; } },
    empresa: { nombre: 'Datos de la empresa', desc: 'Razón social, RUC, establecimiento', count: (S) => (S.empresa.nombre ? 1 : 0), clear: (S) => { S.empresa = blank().empresa; } },
    params: { nombre: 'Parámetros legales', desc: 'Restaura SBU, tasas, recargos y tabla de renta', count: () => 0, clear: (S) => { S.cfg = JSON.parse(JSON.stringify(EC.DEFAULTS)); } },
  };
  App.clearModule = async (key, silent) => {
    const m = App.MODULOS[key];
    if (!silent && !(await App.confirm({ title: `Vaciar «${m.nombre}»`, text: `${m.desc}. Podrás deshacerlo unos segundos.`, ok: 'Vaciar', danger: true }))) return false;
    const snap = JSON.stringify(App.S);
    m.clear(App.S); App.save(); App.render();
    App.toast(`${m.nombre}: vaciado`, () => { App.replace(JSON.parse(snap)); App.render(); });
    return true;
  };
  App.clearAll = async () => {
    if (!(await App.confirm({ title: 'Borrar todos los datos', text: 'Se eliminan empleados, roles, comprobantes, catálogo, liquidaciones y ajustes de este navegador.', ok: 'Borrar todo', danger: true }))) return;
    const snap = JSON.stringify(App.S);
    App.replace(Object.assign(blank(), { cfg: JSON.parse(JSON.stringify(EC.DEFAULTS)) })); App.render();
    App.toast('Todos los datos borrados', () => { App.replace(JSON.parse(snap)); App.render(); });
  };

  /* ---------- Descargas e impresión ---------- */
  App.download = (nombre, texto, tipo) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([texto], { type: tipo })); a.download = nombre; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  App.print = (html) => { $('#printArea').innerHTML = html; window.print(); };

  /* ---------- Gráficos SVG ---------- */
  // Barras apiladas por mes. series: [{k, label, color}] ; data: [{label, vals:{k:n}}]
  App.stackedBars = (data, series, h = 220) => {
    const W = 640, pad = { l: 44, r: 8, t: 10, b: 26 };
    const tot = data.map((d) => series.reduce((a, s) => a + (d.vals[s.k] || 0), 0));
    const max = Math.max(1, ...tot) * 1.08, bw = (W - pad.l - pad.r) / data.length;
    const y = (v) => pad.t + (h - pad.t - pad.b) * (1 - v / max);
    let g = '';
    for (let i = 0; i <= 3; i++) { const v = (max / 3) * i; g += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}" class="gl"/><text x="${pad.l - 6}" y="${y(v) + 4}" class="gt" text-anchor="end">${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v)}</text>`; }
    data.forEach((d, i) => {
      let acc = 0; const x = pad.l + i * bw + bw * 0.16, w = bw * 0.68;
      series.forEach((s) => { const v = d.vals[s.k] || 0; if (!v) return; const y1 = y(acc + v), y0 = y(acc);
        g += `<rect class="bar" style="--d:${i * 40}ms" x="${x}" y="${y1}" width="${w}" height="${Math.max(0, y0 - y1)}" rx="2" fill="${s.color}"><title>${d.label} · ${s.label}: ${money(v)}</title></rect>`; acc += v; });
      g += `<text x="${x + w / 2}" y="${h - 8}" class="gt" text-anchor="middle">${d.label}</text>`;
    });
    return `<svg viewBox="0 0 ${W} ${h}" class="chart" role="img" aria-label="Costo mensual de la nómina">${g}</svg>`;
  };

  /* ---------- Shell ---------- */
  const NAV = [
    ['Nómina', [['resumen', 'dash', 'Resumen'], ['rol', 'rol', 'Rol de pagos'], ['empleados', 'users', 'Empleados'], ['liquidaciones', 'exit', 'Liquidaciones']]],
    ['Facturación', [['comprobantes', 'doc', 'Comprobantes'], ['catalogo', 'cart', 'Clientes y productos']]],
    ['Normativa', [['legal', 'shield', 'Cumplimiento'], ['herramientas', 'tool', 'Herramientas']]],
    ['Sistema', [['ajustes', 'cog', 'Ajustes y datos']]],
  ];
  App.route = () => (location.hash.replace(/^#\/?/, '') || 'resumen').split('?')[0];
  App.go = (r) => { location.hash = '#/' + r; };
  App.render = () => {
    const r = App.route(); const v = App.views[r] || App.views.resumen;
    $$('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r));
    $('#empresaLabel').textContent = App.S.empresa.nombre || 'Sin empresa configurada';
    $('#demoBar').hidden = !App.S.demo;
    const view = $('#view'); view.dataset.view = r;
    v(view);
    document.body.classList.remove('nav-open');
  };
  App.mount = () => {
    $('#nav').innerHTML = NAV.map(([g, items]) => `<div class="ng">${g}</div>${items.map(([r, ic, l]) => `<a href="#/${r}" data-r="${r}">${App.icon(ic)}<span>${l}</span></a>`).join('')}`).join('');
    window.addEventListener('hashchange', () => { App.render(); $('#view').scrollTop = 0; window.scrollTo(0, 0); });
    $('#menuBtn').onclick = () => document.body.classList.toggle('nav-open');
    $('#scrim').onclick = () => document.body.classList.remove('nav-open');
    const th = () => { try { return localStorage.getItem('rol-theme'); } catch (e) { return null; } };
    const applyTheme = (t) => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
    applyTheme(th());
    $('#themeBtn').onclick = () => {
      const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      const t = dark ? 'light' : 'dark'; applyTheme(t); try { localStorage.setItem('rol-theme', t); } catch (e) { /* */ }
    };
    $('#perPrev').onclick = () => { App.S.periodo = App.shiftPeriodo(App.S.periodo, -1); App.save(); App.render(); };
    $('#perNext').onclick = () => { App.S.periodo = App.shiftPeriodo(App.S.periodo, 1); App.save(); App.render(); };
    $('#perLabel').onclick = () => $('#perPick').showPicker ? $('#perPick').showPicker() : $('#perPick').focus();
    $('#perPick').onchange = (e) => { if (e.target.value) { App.S.periodo = e.target.value; App.save(); App.render(); } };
    $('#demoClear').onclick = async () => { if (await App.confirm({ title: 'Empezar de cero', text: 'Se borran los datos de demostración para que ingreses los tuyos.', ok: 'Borrar demo', danger: true })) { App.replace(blank()); App.render(); } };
    $('#dlg').addEventListener('click', (e) => { if (e.target === $('#dlg')) App.closeModal(); });
    const sync = () => { $('#perLabel').textContent = App.periodoLabel(App.S.periodo); $('#perPick').value = App.S.periodo; };
    const _r = App.render; App.render = () => { sync(); _r(); };
    App.render();
  };
  window.App = App;
})();
