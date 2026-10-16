/* Nómina: resumen, rol de pagos en vivo, empleados */
(function () {
  'use strict';
  const App = window.App, EC = App.EC, { $, $$, esc, money, icon, uid } = App;

  const activo = (e, p) => !e.ingreso || e.ingreso.slice(0, 7) <= p;
  const iniciales = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const hue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const avatar = (e) => `<span class="av" style="--h:${hue(e.nombre)}">${esc(iniciales(e.nombre))}</span>`;
  const MODOS = [['mensualiza', 'Se paga cada mes'], ['acumula', 'Se acumula y paga en su fecha'], ['no', 'No aplica']];
  const modoTag = (m) => ({ mensualiza: '<span class="tag">Mensual</span>', acumula: '<span class="tag warn">Acumula</span>', no: '<span class="tag mute">No aplica</span>' }[m || 'mensualiza']);

  /* ---------- Documentos imprimibles ---------- */
  App.slipHTML = (e, c, print) => {
    const S = App.S, L = (k, v, cls = '') => `<dt class="${cls}">${k}</dt><dd class="${cls}">${v}</dd>`;
    const ing = [L(`Sueldo (${c.dias} días)`, money(c.sueldo))];
    if (c.pagoSup) ing.push(L(`Horas suplementarias (${c.hSup} h)`, money(c.pagoSup)));
    if (c.pagoExt) ing.push(L(`Horas extraordinarias (${c.hExt} h)`, money(c.pagoExt)));
    if (c.pagoNoc) ing.push(L(`Recargo nocturno (${c.hNoc} h)`, money(c.pagoNoc)));
    if (c.bonos) ing.push(L('Bonos / comisiones', money(c.bonos)));
    if (c.otrosIng) ing.push(L('Otros ingresos', money(c.otrosIng)));
    if (c.d13Pago) ing.push(L('Décimo tercero mensualizado', money(c.d13Pago)));
    if (c.d14Pago) ing.push(L('Décimo cuarto mensualizado', money(c.d14Pago)));
    if (c.frPago) ing.push(L('Fondos de reserva', money(c.frPago)));
    const egr = [];
    if (c.iessEmp) egr.push(L(`Aporte IESS (${S.cfg.iessPersonal}%)`, money(c.iessEmp)));
    if (c.renta) egr.push(L('Retención impuesto a la renta', money(c.renta)));
    if (c.anticipo) egr.push(L('Anticipo de sueldo', money(c.anticipo)));
    if (c.prestamos) egr.push(L('Préstamos', money(c.prestamos)));
    if (c.otrosDesc) egr.push(L('Otros descuentos', money(c.otrosDesc)));
    if (!egr.length) egr.push(L('Sin descuentos', money(0)));
    return `<section class="pslip"><h2>ROL DE PAGOS</h2><p class="c">${esc(App.periodoLabel(S.periodo).toUpperCase())}</p>
      <p class="c">${esc(S.empresa.nombre || 'Empresa')}${S.empresa.ruc ? ' · RUC ' + esc(S.empresa.ruc) : ''}</p>
      <p><b>${esc(e.nombre)}</b> · C.I. ${esc(e.cedula || '—')} · ${esc(e.cargo || '')}<br>${esc(S.cfg.regimenes[e.regimen]?.nombre || '')} · Salario base ${money(+e.salario)}</p>
      <div class="two"><div><h3>Ingresos</h3><dl>${ing.join('')}${L('Total ingresos', money(c.totalIngresos), 'tot')}</dl></div>
      <div><h3>Egresos</h3><dl>${egr.join('')}${L('Total egresos', money(c.totalEgresos), 'tot')}</dl></div></div>
      <dl class="net">${L('NETO A RECIBIR', money(c.neto), 'tot')}</dl>
      <div class="sig"><div>Empleador</div><div>Recibí conforme · ${esc(e.nombre)}</div></div></section>`;
  };
  function consolidadoHTML() {
    const S = App.S, rows = S.empleados.filter((e) => activo(e, S.periodo)).map((e) => [e, App.calc(e)]);
    const sum = (f) => rows.reduce((a, [, c]) => a + f(c), 0);
    const cols = [['Sueldo', (c) => c.sueldo], ['H. extra', (c) => c.horasExtras], ['Bonos/otros', (c) => c.bonos + c.otrosIng], ['13º', (c) => c.d13Pago], ['14º', (c) => c.d14Pago],
      ['F. reserva', (c) => c.frPago], ['Ingresos', (c) => c.totalIngresos], ['IESS', (c) => c.iessEmp], ['Renta', (c) => c.renta], ['Otros desc.', (c) => c.totalEgresos - c.iessEmp - c.renta], ['Neto', (c) => c.neto]];
    return `<section class="pcons"><h2 style="text-align:center">ROL DE PAGOS CONSOLIDADO · ${esc(App.periodoLabel(S.periodo).toUpperCase())}</h2><p style="text-align:center">${esc(S.empresa.nombre)} ${S.empresa.ruc ? '· RUC ' + esc(S.empresa.ruc) : ''}</p>
      <table><thead><tr><th>Empleado</th>${cols.map((c) => `<th>${c[0]}</th>`).join('')}<th>Firma</th></tr></thead>
      <tbody>${rows.map(([e, c]) => `<tr><td>${esc(e.nombre)}</td>${cols.map(([, f]) => `<td>${money(f(c))}</td>`).join('')}<td style="width:90px"></td></tr>`).join('')}</tbody>
      <tfoot><tr><td>TOTAL</td>${cols.map(([, f]) => `<td>${money(sum(f))}</td>`).join('')}<td></td></tr></tfoot></table></section>`;
  }
  function exportCSV() {
    const S = App.S, q = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`;
    const head = ['Empleado', 'Cédula', 'Cargo', 'Días', 'Sueldo', 'Horas extras', 'Bonos', 'Otros ingresos', '13 mensualizado', '14 mensualizado', 'Fondos reserva mensualizado', 'Total ingresos', 'IESS personal', 'Renta', 'Anticipo', 'Préstamos', 'Otros desc.', 'Total egresos', 'Neto', 'IESS patronal', 'SECAP+IECE', 'Prov. 13', 'Prov. 14', 'Prov. FR', 'Prov. vacaciones', 'Costo empleador'];
    const lines = S.empleados.filter((e) => activo(e, S.periodo)).map((e) => { const c = App.calc(e);
      return [e.nombre, e.cedula, e.cargo, c.dias, c.sueldo, c.horasExtras, c.bonos, c.otrosIng, c.d13Pago, c.d14Pago, c.frPago, c.totalIngresos, c.iessEmp, c.renta, c.anticipo, c.prestamos, c.otrosDesc, c.totalEgresos, c.neto, c.patronal, c.secap + c.iece, c.prov13, c.prov14, c.provFR, c.provVac, c.costoEmpleador]; });
    App.download(`rol-${S.periodo}.csv`, '﻿' + [head, ...lines].map((r) => r.map(q).join(';')).join('\n'), 'text/csv;charset=utf-8');
  }

  const emptyNomina = (v, t) => { v.innerHTML = `<div class="empty big"><h2>${t}</h2><p>Carga los datos de demostración para explorar todos los módulos, o empieza agregando tu primer empleado.</p>
    <div class="row center"><button class="btn primary" id="seed">Cargar demo</button><a class="btn" href="#/empleados">Agregar empleado</a></div></div>`;
    $('#seed').onclick = () => { App.seedDemo(); App.render(); }; };

  /* ---------- Resumen ---------- */
  const VENC = [['Décimo tercero', 12, 24, 'Hasta el 24 de diciembre'], ['Participación de utilidades', 4, 15, 'Hasta el 15 de abril'], ['Décimo cuarto · Costa y Galápagos', 3, 15, 'Hasta el 15 de marzo'], ['Décimo cuarto · Sierra y Oriente', 8, 15, 'Hasta el 15 de agosto'], ['Formulario 107 y RDEP', 2, 28, 'Hasta fines de febrero']];
  function proximos() {
    const h = new Date(); h.setHours(0, 0, 0, 0);
    return VENC.map(([n, m, d, t]) => { let f = new Date(h.getFullYear(), m - 1, d); if (f < h) f = new Date(h.getFullYear() + 1, m - 1, d); return { n, t, dias: Math.round((f - h) / 864e5), f }; }).sort((a, b) => a.dias - b.dias).slice(0, 4);
  }
  App.views.resumen = (v) => {
    const S = App.S;
    if (!S.empleados.length) return emptyNomina(v, 'Aún no hay datos');
    const p = S.periodo, T = App.totalesPeriodo(p);
    const act = S.empleados.filter((e) => activo(e, p)).map((e) => [e, App.calc(e)]).sort((a, b) => b[1].neto - a[1].neto);
    const max = Math.max(1, ...act.map(([, c]) => c.neto));
    const seg = [['Neto a empleados', T.neto, 'var(--c-neto)'], ['Descuentos al trabajador', T.egresos, 'var(--c-desc)'], ['IESS patronal, SECAP e IECE', T.patronal || 0, 'var(--c-pat)'], ['Provisiones (13º, 14º, vacaciones)', T.prov, 'var(--c-prov)']];
    const year = p.slice(0, 4), meses = [];
    for (let m = 1; m <= 12; m++) { const pp = `${year}-${String(m).padStart(2, '0')}`; if (S.periodos[pp]) { const t = App.totalesPeriodo(pp); meses.push({ label: App.MESES[m - 1].slice(0, 3), vals: { neto: t.neto, desc: t.egresos, pat: t.patronal || 0, prov: t.prov } }); } }
    const alerts = [];
    S.empleados.forEach((e) => { if (e.cedula && !EC.cedulaValida(e.cedula)) alerts.push(`${e.nombre}: cédula con dígito verificador inválido.`); if (+e.salario < S.cfg.sbu) alerts.push(`${e.nombre}: salario menor al SBU.`); });
    if (!EC.validarRUC(S.empresa.ruc).valido) alerts.push('RUC de la empresa vacío o inválido (Ajustes).');
    act.forEach(([e, c]) => c.avisos.filter((a) => !a.startsWith('Fondos')).forEach((a) => alerts.push(`${e.nombre}: ${a}`)));
    v.innerHTML = `<div class="head"><div><h1>Resumen de nómina</h1><p class="sub">${esc(S.empresa.nombre || 'Tu empresa')} · ${App.periodoLabel(p)}</p></div>
        <div class="row"><a class="btn" href="#/rol">${icon('rol')}Abrir rol del mes</a></div></div>
      <section class="hero"><div class="hero-main"><span class="k">Total neto a pagar</span><b class="hero-n" id="hn">$0.00</b><span class="k2">a ${T.n} empleados · costo total para la empresa <b id="hc">$0.00</b></span></div>
        <div class="hero-split"><span class="k">¿A dónde va cada dólar del costo?</span><div class="split" id="split">${seg.map(([l, n, c]) => `<i style="width:0;background:${c}" data-w="${T.costo ? (n / T.costo) * 100 : 0}" title="${l}: ${money(n)}"></i>`).join('')}</div>
        <ul class="legend">${seg.map(([l, n, c]) => `<li><i style="background:${c}"></i><span>${l}</span><b>${money(n)}</b></li>`).join('')}</ul></div></section>
      <div class="stats">${[['Sueldos base', T.sueldos], ['Horas extras', T.extras], ['Décimos y fondos pagados', T.decimos], ['Planilla IESS del mes', T.iess]].map(([l, n]) => `<div class="stat"><span>${l}</span><b data-n="${n}">$0.00</b></div>`).join('')}</div>
      <div class="cols2"><section class="card"><h2>Costo mensual de la nómina ${year}</h2>${meses.length ? App.stackedBars(meses, seg.map(([l, , c], i) => ({ k: ['neto', 'desc', 'pat', 'prov'][i], label: l, color: c }))) : '<div class="empty">Sin periodos en este año</div>'}
          <ul class="legend inline">${seg.map(([l, , c]) => `<li><i style="background:${c}"></i>${l}</li>`).join('')}</ul></section>
        <section class="card"><h2>Neto por empleado</h2><ul class="rank">${act.map(([e, c]) => `<li><a href="#/rol" data-e="${e.id}">${avatar(e)}<span class="nm">${esc(e.nombre.split(' ').slice(0, 2).join(' '))}</span><span class="bar"><i style="width:0" data-w="${(c.neto / max) * 100}"></i></span><b>${money(c.neto)}</b></a></li>`).join('')}</ul></section></div>
      <div class="cols2"><section class="card"><h2>Próximos vencimientos</h2><ul class="due">${proximos().map((d) => `<li><div><b>${d.n}</b><small>${d.t}</small></div><span class="days ${d.dias < 30 ? 'soon' : ''}">${d.dias} d</span></li>`).join('')}</ul></section>
        <section class="card"><h2>Revisión</h2>${alerts.length ? `<ul class="warns">${alerts.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '<p class="okmsg">Sin observaciones: cédulas válidas, salarios sobre el SBU y datos de empresa completos.</p>'}</section></div>`;
    App.setNum($('#hn', v), T.neto); App.setNum($('#hc', v), T.costo);
    $$('.stat b[data-n]', v).forEach((b) => App.setNum(b, +b.dataset.n));
    requestAnimationFrame(() => requestAnimationFrame(() => $$('[data-w]', v).forEach((i) => (i.style.width = i.dataset.w + '%'))));
    $$('.rank a', v).forEach((a) => (a.onclick = () => { S.selEmp = a.dataset.e; App.save(); }));
  };

  /* ---------- Rol del mes (en vivo) ---------- */
  let modo = 'vivo';
  const CAMPOS = [['dias', 'Días trabajados', 0, 30, 1], ['hSup', 'Horas suplementarias (50%)', 0, 60, 1], ['hExt', 'Horas extraordinarias (100%)', 0, 40, 1], ['hNoc', 'Horas nocturnas (25%)', 0, 80, 1]];
  const MONEY = [['bonos', 'Bonos o comisiones (aportan IESS)'], ['otrosIng', 'Otros ingresos'], ['anticipo', 'Anticipo de sueldo'], ['prestamos', 'Préstamos (IESS, empresa)'], ['otrosDesc', 'Otros descuentos']];
  const LINEAS = [
    ['ing', 'sueldo', (c) => `Sueldo · ${c.dias} días`, 'sueldo'], ['ing', 'pagoSup', (c) => `Horas suplementarias · ${c.hSup} h`, 'pagoSup'], ['ing', 'pagoExt', (c) => `Horas extraordinarias · ${c.hExt} h`, 'pagoExt'],
    ['ing', 'pagoNoc', (c) => `Recargo nocturno · ${c.hNoc} h`, 'pagoNoc'], ['ing', 'bonos', () => 'Bonos y comisiones', 'bonos'], ['ing', 'otrosIng', () => 'Otros ingresos', 'otrosIng'],
    ['ing', 'd13Pago', () => 'Décimo tercero mensualizado', 'd13Pago'], ['ing', 'd14Pago', () => 'Décimo cuarto mensualizado', 'd14Pago'], ['ing', 'frPago', () => 'Fondos de reserva', 'frPago'],
    ['egr', 'iessEmp', () => `Aporte IESS ${App.S.cfg.iessPersonal}%`, 'iessEmp'], ['egr', 'renta', () => 'Retención de impuesto a la renta', 'renta'], ['egr', 'anticipo', () => 'Anticipo', 'anticipo'], ['egr', 'prestamos', () => 'Préstamos', 'prestamos'], ['egr', 'otrosDesc', () => 'Otros descuentos', 'otrosDesc'],
  ];
  App.views.rol = (v) => {
    const S = App.S, p = S.periodo;
    if (!S.empleados.length) return emptyNomina(v, 'Aún no hay empleados');
    const lista = S.empleados.filter((e) => activo(e, p));
    if (!lista.length) { v.innerHTML = `<div class="empty big"><h2>Nadie en nómina en ${App.periodoLabel(p)}</h2><p>Los empleados aparecen desde su mes de ingreso. Cambia el periodo arriba.</p></div>`; return; }
    if (!lista.find((e) => e.id === S.selEmp)) S.selEmp = lista[0].id;
    v.innerHTML = `<div class="head"><div><h1>Rol de pagos · ${App.periodoLabel(p)}</h1><p class="sub">Mueve los controles y mira el rol recalcularse al instante.</p></div>
      <div class="row wrap"><div class="seg" role="group" aria-label="Vista"><button data-m="vivo" class="${modo === 'vivo' ? 'on' : ''}">En vivo</button><button data-m="tabla" class="${modo === 'tabla' ? 'on' : ''}">Tabla</button></div>
      <button class="btn" id="copy">${icon('undo')}Copiar mes anterior</button><button class="btn" id="csv">${icon('down')}CSV</button><button class="btn" id="pc">${icon('print')}Consolidado</button><button class="btn primary" id="pa">${icon('print')}Imprimir roles</button></div></div>
      <div class="stats" id="stats"></div><div id="body"></div>`;
    $$('.seg button', v).forEach((b) => (b.onclick = () => { modo = b.dataset.m; App.render(); }));
    $('#csv').onclick = exportCSV;
    $('#pc').onclick = () => App.print(consolidadoHTML());
    $('#pa').onclick = () => App.print(lista.map((e) => App.slipHTML(e, App.calc(e))).join(''));
    $('#copy').onclick = async () => {
      const prev = App.shiftPeriodo(p, -1), src = S.periodos[prev];
      if (!src || !Object.keys(src).length) return App.toast(`No hay novedades en ${App.periodoLabel(prev)}`);
      if (!(await App.confirm({ title: 'Copiar mes anterior', text: `Se reemplazan las novedades de ${App.periodoLabel(p)} con las de ${App.periodoLabel(prev)}.`, ok: 'Copiar' }))) return;
      const snap = JSON.stringify(S.periodos[p] || {}); S.periodos[p] = JSON.parse(JSON.stringify(src)); App.save(); App.render();
      App.toast('Novedades copiadas', () => { S.periodos[p] = JSON.parse(snap); App.save(); App.render(); });
    };
    (modo === 'vivo' ? vivo : tabla)($('#body', v), lista);
    refreshStats(lista);
  };
  function refreshStats(lista) {
    const T = App.totalesPeriodo(App.S.periodo), el = $('#stats');
    if (!el) return;
    if (!el.children.length) el.innerHTML = [['neto', 'Total a pagar'], ['ingresos', 'Total ingresos'], ['iess', 'Planilla IESS'], ['costo', 'Costo empleador']].map(([k, l]) => `<div class="stat"><span>${l}</span><b data-k="${k}">$0.00</b></div>`).join('');
    $$('b[data-k]', el).forEach((b) => App.setNum(b, T[b.dataset.k]));
  }

  function vivo(host, lista) {
    const S = App.S;
    host.innerHTML = `<div class="live"><aside class="rail"><ul>${lista.map((e) => `<li><button data-id="${e.id}" class="${e.id === S.selEmp ? 'on' : ''}">${avatar(e)}<span class="who"><b>${esc(e.nombre)}</b><small>${esc(e.cargo)}</small></span><span class="mini" data-n="${e.id}">$0.00</span></button></li>`).join('')}</ul></aside>
      <div class="panel"><div id="ctl"></div><div id="slip"></div></div></div>`;
    lista.forEach((e) => App.setNum($(`[data-n="${e.id}"]`, host), App.calc(e).neto));
    $$('.rail button', host).forEach((b) => (b.onclick = () => { S.selEmp = b.dataset.id; App.save(); $$('.rail button', host).forEach((x) => x.classList.toggle('on', x === b)); drawPanel(host, lista); }));
    drawPanel(host, lista);
  }
  function drawPanel(host, lista) {
    const S = App.S, e = S.empleados.find((x) => x.id === S.selEmp), nv = App.novedades(e.id);
    const ctl = $('#ctl', host), slip = $('#slip', host);
    const val = (k) => (nv[k] === undefined || nv[k] === '' ? (k === 'dias' ? S.cfg.diasMes : 0) : +nv[k]);
    ctl.innerHTML = `<div class="who-h">${avatar(e)}<div><h2>${esc(e.nombre)}</h2><p class="sub">${esc(e.cargo)} · ${esc(S.cfg.regimenes[e.regimen]?.nombre.split(' (')[0])} · salario ${money(+e.salario)}</p></div><button class="btn sm" id="vr">${icon('print')}Rol individual</button></div>
      <div class="sliders">${CAMPOS.map(([k, l, mn, mx, st]) => { const off = e.horasExtras === false && k !== 'dias'; return `<label class="sl ${off ? 'off' : ''}"><span>${l}<output data-o="${k}">${val(k)}</output></span><input type="range" data-k="${k}" min="${mn}" max="${mx}" step="${st}" value="${val(k)}" ${off ? 'disabled' : ''}></label>`; }).join('')}</div>
      <div class="money">${MONEY.map(([k, l]) => `<label>${l}<span class="cur"><i>$</i><input data-k="${k}" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0.00" value="${esc(nv[k] ?? '')}"></span></label>`).join('')}</div>
      ${e.horasExtras === false ? '<p class="hint">Este empleado no tiene horas extras habilitadas (cargo de dirección o confianza). Cámbialo en su ficha.</p>' : ''}`;
    slip.innerHTML = `<div class="slip2"><div class="cols-s"><div><h3>Ingresos</h3><ul id="li-ing">${LINEAS.filter((l) => l[0] === 'ing').map((l, i) => `<li class="ln" data-k="${l[1]}"><div><span class="lb"></span><b class="vl">$0.00</b></div></li>`).join('')}</ul><div class="tot"><span>Total ingresos</span><b id="t-ing">$0.00</b></div></div>
      <div><h3>Egresos</h3><ul id="li-egr">${LINEAS.filter((l) => l[0] === 'egr').map((l) => `<li class="ln" data-k="${l[1]}"><div><span class="lb"></span><b class="vl">$0.00</b></div></li>`).join('')}</ul><div class="tot"><span>Total egresos</span><b id="t-egr">$0.00</b></div></div></div>
      <div class="net2"><span>Neto a recibir</span><b id="t-neto">$0.00</b></div><div class="flow-bar" id="fb"></div><ul class="legend inline" id="fl"></ul>
      <details class="more"><summary>Aportes y provisiones de la empresa</summary><dl id="emp-dl"></dl></details><ul class="warns" id="avs"></ul></div>`;
    $('#vr', ctl).onclick = () => App.print(App.slipHTML(e, App.calc(e)));
    const upd = () => {
      const c = App.calc(e);
      LINEAS.forEach(([g, k, lab, f]) => { const li = $(`#li-${g} li[data-k="${k}"]`, slip); const x = c[f]; const on = x > 0 || (k === 'sueldo'); li.classList.toggle('show', on); $('.lb', li).textContent = lab(c); App.setNum($('.vl', li), x); });
      App.setNum($('#t-ing', slip), c.totalIngresos); App.setNum($('#t-egr', slip), c.totalEgresos); App.setNum($('#t-neto', slip), c.neto);
      const parts = [['Neto', c.neto, 'var(--c-neto)'], ['IESS', c.iessEmp, 'var(--c-pat)'], ['Renta', c.renta, 'var(--c-prov)'], ['Otros descuentos', c.anticipo + c.prestamos + c.otrosDesc, 'var(--c-desc)']];
      const tot = Math.max(0.01, c.totalIngresos);
      $('#fb', slip).innerHTML = parts.map(([l, n, col]) => `<i style="width:${Math.max(0, (n / tot) * 100)}%;background:${col}" title="${l}: ${money(n)}"></i>`).join('');
      $('#fl', slip).innerHTML = parts.map(([l, n, col]) => `<li><i style="background:${col}"></i>${l} <b>${money(n)}</b></li>`).join('');
      const rd = c.rentaDet;
      $('#emp-dl', slip).innerHTML = `<dt>Aporte patronal (${S.cfg.iessPatronal}%)</dt><dd>${money(c.patronal)}</dd><dt>SECAP + IECE</dt><dd>${money(c.secap + c.iece)}</dd>${c.prov13 ? `<dt>Provisión décimo tercero</dt><dd>${money(c.prov13)}</dd>` : ''}${c.prov14 ? `<dt>Provisión décimo cuarto</dt><dd>${money(c.prov14)}</dd>` : ''}${c.provFR ? `<dt>Provisión fondos de reserva</dt><dd>${money(c.provFR)}</dd>` : ''}<dt>Provisión vacaciones</dt><dd>${money(c.provVac)}</dd><dt class="tot">Costo total del empleado</dt><dd class="tot">${money(c.costoEmpleador)}</dd>
        ${rd ? `<dt class="sep">Renta proyectada: base anual ${money(rd.base)}</dt><dd class="sep">impuesto ${money(rd.impuestoAnual)} − rebaja ${money(rd.rebaja)}</dd>` : ''}`;
      $('#avs', slip).innerHTML = c.avisos.map((a) => `<li>${esc(a)}</li>`).join('');
      const mini = $(`[data-n="${e.id}"]`, host); if (mini) App.setNum(mini, c.neto);
      refreshStats(lista);
    };
    ctl.addEventListener('input', (ev) => {
      const k = ev.target.dataset.k; if (!k) return;
      if (ev.target.value === '') delete nv[k]; else nv[k] = ev.target.value;
      if (ev.target.type === 'range') $(`output[data-o="${k}"]`, ctl).textContent = ev.target.value;
      App.save(); upd();
    });
    upd();
  }

  function tabla(host, lista) {
    const S = App.S, COLS = [['dias', 'Días'], ['hSup', 'H. sup.'], ['hExt', 'H. extra'], ['hNoc', 'H. noct.'], ['bonos', 'Bonos'], ['otrosIng', 'Otros ing.'], ['anticipo', 'Anticipo'], ['prestamos', 'Préstamos'], ['otrosDesc', 'Otros desc.']];
    host.innerHTML = `<div class="tablewrap"><table id="tbl"><thead><tr><th class="l">Empleado</th>${COLS.map((c) => `<th>${c[1]}</th>`).join('')}<th>Ingresos</th><th>Egresos</th><th>Neto</th><th></th></tr></thead><tbody>
      ${lista.map((e) => `<tr data-id="${e.id}"><td class="l"><div class="cellp">${avatar(e)}<span><b>${esc(e.nombre)}</b><small>${esc(e.cargo)}</small></span></div></td>${COLS.map(([k]) => `<td><input data-k="${k}" type="number" min="0" step="any" value="${esc(App.novedades(e.id)[k] ?? '')}" placeholder="${k === 'dias' ? S.cfg.diasMes : 0}"></td>`).join('')}<td data-o="ing"></td><td data-o="egr"></td><td data-o="neto" class="neto"></td><td><button class="btn sm" data-ver>Ver</button></td></tr>`).join('')}</tbody></table></div><div id="avisos"></div>`;
    const upd = () => {
      const av = [];
      lista.forEach((e) => { const c = App.calc(e), tr = $(`tr[data-id="${e.id}"]`, host); App.setNum($('[data-o=ing]', tr), c.totalIngresos); App.setNum($('[data-o=egr]', tr), c.totalEgresos); App.setNum($('[data-o=neto]', tr), c.neto); c.avisos.forEach((a) => av.push(`${e.nombre}: ${a}`)); });
      $('#avisos', host).innerHTML = av.length ? `<div class="card" style="margin-top:16px"><h2>Avisos</h2><ul class="warns">${av.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '';
      refreshStats(lista);
    };
    host.addEventListener('input', (ev) => { const inp = ev.target.closest('input[data-k]'); if (!inp) return; const nv = App.novedades(inp.closest('tr').dataset.id); inp.value === '' ? delete nv[inp.dataset.k] : (nv[inp.dataset.k] = inp.value); App.save(); upd(); });
    host.addEventListener('click', (ev) => { const b = ev.target.closest('[data-ver]'); if (!b) return; const e = S.empleados.find((x) => x.id === b.closest('tr').dataset.id); S.selEmp = e.id; modo = 'vivo'; App.save(); App.render(); });
    upd();
  }

  /* ---------- Empleados ---------- */
  App.views.empleados = (v) => {
    const S = App.S;
    v.innerHTML = `<div class="head"><div><h1>Empleados</h1><p class="sub">Cada ficha define régimen, salario y qué beneficios recibe.</p></div><div class="row"><button class="btn ghost" id="vaciar">${icon('trash')}Vaciar</button><button class="btn primary" id="add">${icon('plus')}Nuevo empleado</button></div></div>
      ${S.empleados.length ? `<div class="tablewrap"><table class="list"><thead><tr><th class="l">Empleado</th><th class="l">Cédula</th><th class="l">Régimen</th><th>Salario</th><th class="l">Ingreso</th><th>13º</th><th>14º</th><th>F. reserva</th><th>H. extra</th><th></th></tr></thead><tbody>
      ${S.empleados.map((e) => `<tr data-id="${e.id}"><td class="l"><div class="cellp">${avatar(e)}<span><b>${esc(e.nombre)}</b><small>${esc(e.cargo)}</small></span></div></td><td class="l">${esc(e.cedula)} ${e.cedula && !EC.cedulaValida(e.cedula) ? '<span class="tag bad">inválida</span>' : ''}</td>
        <td class="l">${esc(S.cfg.regimenes[e.regimen]?.nombre.split(' (')[0])}</td><td>${money(+e.salario)}</td><td class="l">${esc(e.ingreso)}</td><td>${modoTag(e.d13)}</td><td>${modoTag(e.d14)}</td><td>${modoTag(e.fr)}</td><td>${e.horasExtras === false ? '<span class="tag mute">No</span>' : '<span class="tag ok">Sí</span>'}</td>
        <td class="acts"><button class="btn sm" data-a="ed">Editar</button><button class="btn sm ghost" data-a="liq">Liquidar</button><button class="btn sm ghost danger" data-a="del" aria-label="Borrar">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>`
      : '<div class="empty big"><h2>Sin empleados</h2><p>Agrega el primero o carga la demo.</p><div class="row center"><button class="btn primary" id="seed">Cargar demo</button></div></div>'}`;
    $('#add').onclick = () => form(); $('#vaciar').onclick = () => App.clearModule('empleados');
    const sd = $('#seed'); if (sd) sd.onclick = () => { App.seedDemo(); App.render(); };
    $$('tbody tr', v).forEach((tr) => tr.addEventListener('click', (ev) => {
      const b = ev.target.closest('button'); if (!b) return; const e = S.empleados.find((x) => x.id === tr.dataset.id);
      if (b.dataset.a === 'ed') form(e);
      if (b.dataset.a === 'liq') { S.liqEmp = e.id; App.save(); App.go('liquidaciones'); }
      if (b.dataset.a === 'del') { const snap = JSON.stringify(S); S.empleados = S.empleados.filter((x) => x !== e); Object.values(S.periodos).forEach((pp) => delete pp[e.id]); App.save(); App.render(); App.toast(`${e.nombre} eliminado`, () => { App.replace(JSON.parse(snap)); App.render(); }); }
    }));
  };
  function form(e) {
    const S = App.S;
    const n = e ? JSON.parse(JSON.stringify(e)) : { id: uid(), nombre: '', cedula: '', cargo: '', regimen: 'ct', salario: S.cfg.sbu, ingreso: '', region: 'sierra', d13: 'mensualiza', d14: 'mensualiza', fr: 'mensualiza', horasExtras: true, iess: true, rentaModo: 'auto', renta: 0, gastosPersonales: 0, cargas: 0 };
    const sel = (id, opts, val) => `<select id="${id}">${opts.map(([v, t]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    const d = App.modal(`<div class="row between"><h3>${e ? 'Editar' : 'Nuevo'} empleado</h3><button class="btn sm ghost" id="x" type="button">${icon('x')}Cerrar</button></div>
      <form id="f" method="dialog"><div class="docform"><div class="grid2">
      <label class="span2">Nombre completo<input id="nombre" required value="${esc(n.nombre)}"></label>
      <label>Cédula<input id="cedula" inputmode="numeric" maxlength="10" value="${esc(n.cedula)}"><small id="cm"></small></label><label>Cargo<input id="cargo" value="${esc(n.cargo)}"></label>
      <label>Régimen laboral${sel('regimen', Object.entries(S.cfg.regimenes).map(([k, r]) => [k, r.nombre]), n.regimen)}</label><label>Región (define fecha del 14º)${sel('region', [['sierra', 'Sierra y Oriente'], ['costa', 'Costa y Galápagos']], n.region)}</label>
      <label>Salario mensual (USD)<input id="salario" type="number" min="0" step="0.01" required value="${n.salario}"></label><label>Fecha de ingreso<input id="ingreso" type="date" required value="${esc(n.ingreso)}"></label>
      <label>Décimo tercero${sel('d13', MODOS, n.d13)}</label><label>Décimo cuarto${sel('d14', MODOS, n.d14)}</label><label>Fondos de reserva (desde el 2.º año)${sel('fr', MODOS, n.fr)}</label>
      <label>Cargas familiares<input id="cargas" type="number" min="0" step="1" value="${n.cargas || 0}"></label>
      <label>Gastos personales proyectados al año<input id="gastos" type="number" min="0" step="1" value="${n.gastosPersonales || 0}"></label>
      <label>Retención de renta${sel('rm', [['auto', 'Calcular con la tabla del SRI'], ['manual', 'Ingresar valor manual']], n.rentaModo || 'auto')}</label>
      <label id="rl" ${n.rentaModo === 'manual' ? '' : 'hidden'}>Retención mensual (USD)<input id="renta" type="number" min="0" step="0.01" value="${n.renta || 0}"></label>
      <label class="check"><input id="he" type="checkbox" ${n.horasExtras !== false ? 'checked' : ''}> Recibe horas extras</label><label class="check"><input id="iess" type="checkbox" ${n.iess !== false ? 'checked' : ''}> Afiliado al IESS</label></div>
      <aside class="sumbox" id="pv"></aside></div>
      <div class="row end" style="margin-top:16px"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="ok">Guardar</button></div></form>`, { wide: true });
    $('#x', d).onclick = App.closeModal;
    const ced = $('#cedula', d);
    const read = () => Object.assign(n, { nombre: $('#nombre', d).value.trim(), cedula: ced.value.trim(), cargo: $('#cargo', d).value.trim(), regimen: $('#regimen', d).value, region: $('#region', d).value, salario: +$('#salario', d).value, ingreso: $('#ingreso', d).value,
      d13: $('#d13', d).value, d14: $('#d14', d).value, fr: $('#fr', d).value, cargas: +$('#cargas', d).value || 0, gastosPersonales: +$('#gastos', d).value || 0, rentaModo: $('#rm', d).value, renta: +$('#renta', d).value || 0, horasExtras: $('#he', d).checked, iess: $('#iess', d).checked });
    const prev = () => {
      read(); $('#rl', d).hidden = n.rentaModo !== 'manual';
      $('#cm', d).innerHTML = !n.cedula ? '' : EC.cedulaValida(n.cedula) ? '<span class="good">Cédula válida</span>' : '<span class="bad">Dígito verificador inválido</span>';
      const c = EC.calcular(n, {}, S.cfg, S.periodo);
      $('#pv', d).innerHTML = `<h4>Vista previa mensual</h4><p class="sub">Sin horas extras ni novedades</p><dl><dt>Ingresos</dt><dd>${money(c.totalIngresos)}</dd><dt>IESS personal</dt><dd>${money(c.iessEmp)}</dd><dt>Retención de renta</dt><dd>${money(c.renta)}</dd><dt class="big">Neto</dt><dd class="big">${money(c.neto)}</dd><dt>Costo para la empresa</dt><dd>${money(c.costoEmpleador)}</dd></dl>${c.salario < S.cfg.sbu ? '' : ''}${c.avisos.length ? `<ul class="errs">${c.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}`;
    };
    $('#f', d).addEventListener('input', prev); $('#f', d).addEventListener('change', prev); prev();
    $('#f', d).onsubmit = (ev) => { if (ev.submitter && ev.submitter.value === 'cancel') return; read(); if (e) Object.assign(e, n); else S.empleados.push(n); S.selEmp = n.id; App.save(); App.render(); App.toast('Empleado guardado'); };
  }
})();
