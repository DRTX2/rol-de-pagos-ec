/* Nómina: resumen, rol de pagos en vivo, empleados, documentos imprimibles y exportación */
(function () {
  'use strict';
  const App = window.App, EC = App.EC, { $, $$, esc, money, icon, uid, tip } = App;

  const activo = (e, p) => !e.ingreso || e.ingreso.slice(0, 7) <= p;
  const iniciales = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
  const hue = (s) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
  const avatar = (e) => `<span class="av" style="--h:${hue(e.nombre)}">${esc(iniciales(e.nombre))}</span>`;
  const n2 = (x) => (x ? x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '–');
  const MODOS = {
    d13: [['mensualiza', 'Se paga cada mes en el rol'], ['acumula', 'Se acumula (pago hasta el 24 de diciembre)'], ['no', 'No aplica']],
    d14: [['mensualiza', 'Se paga cada mes en el rol'], ['acumula', 'Se acumula (pago según región)'], ['no', 'No aplica']],
    fr: [['mensualiza', 'Se paga cada mes en el rol'], ['acumula', 'Se deposita en el IESS (a pedido del trabajador)'], ['no', 'No aplica']],
  };
  const modoTag = (m) => ({ mensualiza: '<span class="tag">Mensual</span>', acumula: '<span class="tag warn">Acumula</span>', no: '<span class="tag mute">No aplica</span>' }[m || 'mensualiza']);
  const regNombre = (e) => (App.S.cfg.regimenes[e.regimen] || {}).nombre || '';

  /* ---------- Tabla del SRI (se reutiliza en ficha, herramientas y ajustes) ---------- */
  App.irTableHTML = (base, cargas) => {
    const c = App.S.cfg, ci = Math.min(c.canastas.length - 1, Math.floor(+cargas || 0));
    const rows = c.irTabla.map((t) => { const on = base !== undefined && base >= t.desde && (t.hasta === null || base <= t.hasta);
      return `<tr class="${on ? 'hl' : ''}"><td>${money(t.desde)}</td><td>${t.hasta === null ? 'en adelante' : money(t.hasta)}</td><td>${money(t.base)}</td><td>${t.pct}%</td></tr>`; }).join('');
    const gr = c.canastas.map((k, i) => `<tr class="${i === ci ? 'hl' : ''}"><td>${i === c.canastas.length - 1 ? `${i} o más` : i}</td><td>${k}</td><td>${money(k * c.canasta)}</td><td>${money((k * c.canasta * c.rebajaGastos) / 100)}</td></tr>`).join('');
    return `<div class="irt"><h5>Impuesto a la renta anual · personas naturales ${c.anio}</h5>
      <table><thead><tr><th>Fracción básica</th><th>Exceso hasta</th><th>Impuesto base</th><th>% del excedente</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="help">Impuesto = impuesto base + % × (base anual − fracción básica). Base anual = (ingresos − aporte IESS) × 12. ${base !== undefined ? `Base de este empleado: <b>${money(base)}</b> (fila resaltada).` : ''}</p>
      <h5>Gastos personales: tope anual y rebaja máxima (canasta ${money(c.canasta)})</h5>
      <table><thead><tr><th>Cargas</th><th>Canastas</th><th>Gasto máximo</th><th>Rebaja máxima (${c.rebajaGastos}%)</th></tr></thead><tbody>${gr}</tbody></table>
      <p class="help">Rebaja = ${c.rebajaGastos}% del menor entre tus gastos, el tope por cargas y el ${c.topeIngresos}% de los ingresos. Se resta del impuesto, no de la base. Retención mensual = (impuesto − rebaja) ÷ 12.</p></div>`;
  };

  /* ---------- Fórmula en palabras de cada línea del rol ---------- */
  function fxText(k, c, e) {
    const cfg = App.S.cfg, reg = cfg.regimenes[e.regimen] || cfg.regimenes.ct, m = money, sal = m(+e.salario || 0);
    const rd = c.rentaDet;
    return ({
      sueldo: `${sal} ÷ ${cfg.diasMes} × ${c.dias} días`,
      pagoSup: `(${sal} ÷ ${cfg.horasMes} h) × ${1 + reg.suplementaria / 100} × ${c.hSup} h`,
      pagoExt: `(${sal} ÷ ${cfg.horasMes} h) × ${1 + reg.extraordinaria / 100} × ${c.hExt} h`,
      pagoNoc: `(${sal} ÷ ${cfg.horasMes} h) × ${reg.nocturno / 100} × ${c.hNoc} h`,
      bonos: 'Valor ingresado · aporta al IESS, décimos y fondos',
      otrosIng: 'Valor ingresado · no aporta al IESS',
      d13Pago: `${m(c.aportable)} (sueldo + extras + bonos) ÷ 12`,
      d14Pago: `SBU ${m(cfg.sbu)} ÷ 12 × ${c.dias}/${cfg.diasMes} días`,
      frPago: `${m(c.aportable)} × ${cfg.fondosReserva}%`,
      iessEmp: `${m(c.aportable)} × ${cfg.iessPersonal}%`,
      renta: e.rentaModo === 'manual' ? 'Valor manual de la ficha del empleado' : `(impuesto anual ${m(rd.impuestoAnual)} − rebaja ${m(rd.rebaja)}) ÷ 12`,
      anticipo: 'Valor ingresado', prestamos: 'Valor ingresado', otrosDesc: 'Valor ingresado',
    })[k] || '';
  }

  /* ---------- Rol individual (impresión) ---------- */
  App.slipHTML = (e, c) => {
    const S = App.S, E = S.empresa;
    const ing = [[`Sueldo (${c.dias} días)`, c.sueldo]];
    if (c.pagoSup) ing.push([`Horas suplementarias (${c.hSup} h)`, c.pagoSup]);
    if (c.pagoExt) ing.push([`Horas extraordinarias (${c.hExt} h)`, c.pagoExt]);
    if (c.pagoNoc) ing.push([`Recargo nocturno (${c.hNoc} h)`, c.pagoNoc]);
    if (c.bonos) ing.push(['Bonos y comisiones', c.bonos]);
    if (c.otrosIng) ing.push(['Otros ingresos', c.otrosIng]);
    if (c.d13Pago) ing.push(['Décimo tercer sueldo (mensualizado)', c.d13Pago]);
    if (c.d14Pago) ing.push(['Décimo cuarto sueldo (mensualizado)', c.d14Pago]);
    if (c.frPago) ing.push(['Fondos de reserva', c.frPago]);
    const egr = [];
    if (c.iessEmp) egr.push([`Aporte personal IESS (${S.cfg.iessPersonal}%)`, c.iessEmp]);
    if (c.renta) egr.push(['Retención impuesto a la renta', c.renta]);
    if (c.anticipo) egr.push(['Anticipo de sueldo', c.anticipo]);
    if (c.prestamos) egr.push(['Préstamos', c.prestamos]);
    if (c.otrosDesc) egr.push(['Otros descuentos', c.otrosDesc]);
    const filas = Math.max(ing.length, egr.length);
    const rows = Array.from({ length: filas }, (_, i) => `<tr><td>${ing[i] ? esc(ing[i][0]) : ''}</td><td class="n">${ing[i] ? n2(ing[i][1]) : ''}</td><td>${egr[i] ? esc(egr[i][0]) : ''}</td><td class="n">${egr[i] ? n2(egr[i][1]) : ''}</td></tr>`).join('');
    const acum = [['Décimo tercero', c.prov13], ['Décimo cuarto', c.prov14], ['Fondos de reserva', c.provFR]].filter((x) => x[1] > 0);
    return `<section class="pr"><header class="pr-h"><div><b>${esc(E.nombre || 'Empresa')}</b><small>${E.ruc ? 'RUC ' + esc(E.ruc) : ''}${E.direccion ? ' · ' + esc(E.direccion) : ''}</small></div><div class="pr-t"><h2>ROL DE PAGOS</h2><span>${esc(App.periodoLabel(S.periodo).toUpperCase())}</span></div></header>
      <table class="pr-emp"><tr><th>Empleado</th><td colspan="3">${esc(e.nombre)}</td><th>Cédula</th><td>${esc(e.cedula || '—')}</td></tr>
      <tr><th>Cargo</th><td>${esc(e.cargo || '—')}</td><th>Ingreso</th><td>${esc(e.ingreso || '—')}</td><th>Días trabajados</th><td>${c.dias}</td></tr>
      <tr><th>Régimen</th><td colspan="3">${esc(regNombre(e))}</td><th>Salario base</th><td>${money(+e.salario || 0)}</td></tr></table>
      <table class="pr-mov"><thead><tr><th colspan="2">INGRESOS</th><th colspan="2">EGRESOS</th></tr></thead><tbody>${rows}</tbody>
      <tfoot><tr><td>Total ingresos</td><td class="n">${n2(c.totalIngresos)}</td><td>Total egresos</td><td class="n">${n2(c.totalEgresos)}</td></tr></tfoot></table>
      <div class="pr-net"><span>NETO A RECIBIR</span><b>${money(c.neto)}</b></div>
      <p class="pr-let"><b>Son:</b> ${esc(App.letras(c.neto))}</p>
      ${acum.length ? `<p class="pr-note">Valores acumulados este mes y no pagados en este rol: ${acum.map(([l, v]) => `${l} ${money(v)}`).join(' · ')}.</p>` : ''}
      <div class="pr-sig"><div>Empleador</div><div>Recibí conforme<br><small>${esc(e.nombre)}</small></div></div></section>`;
  };

  /* ---------- Consolidado (impresión horizontal) ---------- */
  function consolidadoHTML() {
    const S = App.S, E = S.empresa, rows = S.empleados.filter((e) => activo(e, S.periodo)).map((e) => [e, App.calc(e)]);
    const col = (t, f, cls = '') => ({ t, f, cls });
    const groups = [
      ['Empleado', 'g0', [col('Nombre', null), col('Cédula', null), col('Días', (c) => c.dias, 'c')]],
      ['Ingresos', 'g1', [col('Sueldo', (c) => c.sueldo), col('Horas extra', (c) => c.horasExtras), col('Bonos y otros', (c) => c.bonos + c.otrosIng), col('13º', (c) => c.d13Pago), col('14º', (c) => c.d14Pago), col('F. reserva', (c) => c.frPago), col('Total ingresos', (c) => c.totalIngresos, 'tt')]],
      ['Egresos', 'g2', [col('IESS', (c) => c.iessEmp), col('Renta', (c) => c.renta), col('Anticipos y préstamos', (c) => c.anticipo + c.prestamos), col('Otros', (c) => c.otrosDesc), col('Total egresos', (c) => c.totalEgresos, 'tt')]],
      ['Neto', 'g3', [col('A pagar', (c) => c.neto, 'tt')]],
    ];
    const cols = groups.flatMap((g) => g[2]);
    const sum = (f) => rows.reduce((a, [, c]) => a + f(c), 0);
    return `<section class="pcons"><header class="pc-h"><div><b>${esc(E.nombre || 'Empresa')}</b><small>${E.ruc ? 'RUC ' + esc(E.ruc) : ''}</small></div><div class="pc-t"><h2>ROL DE PAGOS CONSOLIDADO</h2><span>${esc(App.periodoLabel(S.periodo).toUpperCase())} · Valores en USD</span></div></header>
      <table><colgroup><col style="width:3%"><col style="width:15%"><col style="width:8%"><col style="width:3.5%">${'<col style="width:4.8%">'.repeat(13)}<col style="width:8%"></colgroup><thead><tr><th rowspan="2" class="nn">N.º</th>${groups.map((g) => `<th colspan="${g[2].length}" class="${g[1]}">${g[0]}</th>`).join('')}<th rowspan="2" class="firma">Firma</th></tr>
      <tr>${groups.map((g) => g[2].map((c) => `<th class="${g[1]}s">${c.t}</th>`).join('')).join('')}</tr></thead>
      <tbody>${rows.map(([e, c], i) => `<tr><td class="c">${i + 1}</td>${cols.map((k, j) => `<td class="${k.cls} ${j === 0 ? 'nm' : ''}">${j === 0 ? esc(e.nombre) : j === 1 ? esc(e.cedula || '') : k.cls === 'c' ? k.f(c) : n2(k.f(c))}</td>`).join('')}<td></td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="4">TOTALES (${rows.length} empleados)</td>${cols.slice(3).map((k) => `<td>${n2(sum(k.f))}</td>`).join('')}<td></td></tr></tfoot></table>
      <div class="pc-sig"><div>Elaborado por</div><div>Revisado por</div><div>Aprobado por</div></div></section>`;
  }

  /* ---------- Exportar a Excel (.xlsx con colores y áreas) ---------- */
  function exportExcel() {
    const S = App.S, X = App.xlsx, lista = S.empleados.filter((e) => activo(e, S.periodo));
    const K = { navy: 'FF0E1B2C', teal: 'FF0B7A75', coral: 'FFC8402F', blue: 'FF3D5A80', green: 'FF137A43', lteal: 'FFD8EFED', lcoral: 'FFFBE3DF', lblue: 'FFE1E8F2', lgray: 'FFEEF1F4', lgreen: 'FFDCF3E4', white: 'FFFFFFFF' };
    const G = [['DATOS DEL EMPLEADO', K.navy, K.lgray], ['INGRESOS', K.teal, K.lteal], ['EGRESOS', K.coral, K.lcoral], ['NETO', K.green, K.lgreen], ['APORTES Y PROVISIONES DE LA EMPRESA', K.blue, K.lblue]];
    const c = (g, t, w, v, o = {}) => Object.assign({ g, t, w, v }, o);
    const cols = [
      c(0, 'N.º', 6, (e, r, i) => i + 1, { fmt: 'int', h: 'center' }), c(0, 'Empleado', 30, (e) => e.nombre), c(0, 'Cédula', 14, (e) => e.cedula || '', { fmt: 'text', h: 'center' }), c(0, 'Cargo', 24, (e) => e.cargo || ''),
      c(0, 'Fecha de ingreso', 14, (e) => e.ingreso || '', { fmt: 'text', h: 'center' }), c(0, 'Días', 7, (e, r) => r.dias, { fmt: 'int', h: 'center' }),
      c(1, 'Sueldo', 12, (e, r) => r.sueldo, { sum: 1 }), c(1, 'H. suplementarias', 13, (e, r) => r.pagoSup, { sum: 1 }), c(1, 'H. extraordinarias', 13, (e, r) => r.pagoExt, { sum: 1 }), c(1, 'Recargo nocturno', 12, (e, r) => r.pagoNoc, { sum: 1 }),
      c(1, 'Bonos y comisiones', 12, (e, r) => r.bonos, { sum: 1 }), c(1, 'Otros ingresos', 12, (e, r) => r.otrosIng, { sum: 1 }), c(1, '13º mensualizado', 13, (e, r) => r.d13Pago, { sum: 1 }), c(1, '14º mensualizado', 13, (e, r) => r.d14Pago, { sum: 1 }), c(1, 'Fondos de reserva', 12, (e, r) => r.frPago, { sum: 1 }),
      c(1, 'TOTAL INGRESOS', 14, (e, r) => r.totalIngresos, { sum: 1, strong: 1, f: (n) => `SUM(G${n}:O${n})` }),
      c(2, 'IESS personal', 12, (e, r) => r.iessEmp, { sum: 1 }), c(2, 'Impuesto a la renta', 12, (e, r) => r.renta, { sum: 1 }), c(2, 'Anticipo', 11, (e, r) => r.anticipo, { sum: 1 }), c(2, 'Préstamos', 11, (e, r) => r.prestamos, { sum: 1 }), c(2, 'Otros descuentos', 12, (e, r) => r.otrosDesc, { sum: 1 }),
      c(2, 'TOTAL EGRESOS', 14, (e, r) => r.totalEgresos, { sum: 1, strong: 1, f: (n) => `SUM(Q${n}:U${n})` }),
      c(3, 'NETO A PAGAR', 15, (e, r) => r.neto, { sum: 1, strong: 1, f: (n) => `P${n}-V${n}` }),
      c(4, 'Aporte patronal IESS', 13, (e, r) => r.patronal, { sum: 1 }), c(4, 'SECAP + IECE', 11, (e, r) => EC.r2(r.secap + r.iece), { sum: 1 }), c(4, 'Prov. 13º', 11, (e, r) => r.prov13, { sum: 1 }), c(4, 'Prov. 14º', 11, (e, r) => r.prov14, { sum: 1 }),
      c(4, 'Prov. fondos de reserva', 13, (e, r) => r.provFR, { sum: 1 }), c(4, 'Prov. vacaciones', 12, (e, r) => r.provVac, { sum: 1 }),
      c(4, 'COSTO TOTAL EMPLEADOR', 16, (e, r) => r.costoEmpleador, { sum: 1, strong: 1, f: (n) => `P${n}+SUM(X${n}:AC${n})` }),
    ];
    const first = 6, last = first + lista.length - 1, tot = last + 1;
    const title = [{ v: `ROL DE PAGOS · ${App.periodoLabel(S.periodo).toUpperCase()}`, s: { font: { b: 1, sz: 16 } } }];
    const sub = [{ v: `${S.empresa.nombre || ''}${S.empresa.ruc ? ' · RUC ' + S.empresa.ruc : ''} · Valores en USD`, s: { font: { i: 1, color: 'FF5A6877' } } }];
    const grp = [], hdr = []; let pos = 0; const merges = [`A1:${X.colName(cols.length - 1)}1`, `A2:${X.colName(cols.length - 1)}2`];
    G.forEach(([t, dark], gi) => { const n = cols.filter((k) => k.g === gi).length; grp.push({ v: t, s: { font: { b: 1, color: K.white }, fill: dark, h: 'center', border: 1 } }); for (let i = 1; i < n; i++) grp.push({ s: { fill: dark, border: 1 } }); if (n > 1) merges.push(`${X.colName(pos)}4:${X.colName(pos + n - 1)}4`); pos += n; });
    cols.forEach((k) => hdr.push({ v: k.t, s: { font: { b: 1 }, fill: G[k.g][2], h: 'center', wrap: true, border: 1 } }));
    const body = lista.map((e, i) => { const r = App.calc(e), n = first + i;
      return cols.map((k, j) => { const v = k.v(e, r, i), s = { border: 1, fmt: k.fmt || (typeof v === 'number' ? 'num' : undefined), h: k.h, font: k.strong ? { b: 1 } : undefined, fill: k.strong ? G[k.g][2] : undefined };
        return k.f ? { f: k.f(n), v, s } : { v, s }; }); });
    const totRow = cols.map((k, j) => { const col = X.colName(j), s = { border: 'total', fmt: 'num', font: { b: 1 }, fill: G[k.g][2] };
      if (j === 0) return { v: `TOTALES (${lista.length} empleados)`, s: { border: 'total', font: { b: 1 }, fill: K.lgray } };
      if (!k.sum) return { s: { border: 'total', fill: K.lgray } };
      return { f: `SUM(${col}${first}:${col}${last})`, v: EC.r2(lista.reduce((a, e, i) => a + k.v(e, App.calc(e), i), 0)), s }; });
    merges.push(`A${tot}:F${tot}`);
    const cfg = S.cfg, par = [['Parámetros usados en este rol', ''], ['Periodo', App.periodoLabel(S.periodo)], ['SBU', cfg.sbu], ['Aporte personal IESS %', cfg.iessPersonal], ['Aporte patronal IESS %', cfg.iessPatronal], ['SECAP %', cfg.secap], ['IECE %', cfg.iece], ['Fondos de reserva %', cfg.fondosReserva], ['Horas por mes', cfg.horasMes], ['Días por mes', cfg.diasMes], ['IVA %', cfg.iva]]
      .map(([a, b], i) => [{ v: a, s: i ? { border: 1 } : { font: { b: 1, sz: 14 } } }, i ? { v: b, s: { border: 1, h: 'right' } } : null]);
    const blob = X.build([
      { name: 'Rol de pagos', rows: [title, sub, [], grp, hdr, ...body, totRow], widths: cols.map((k) => k.w), merges, freeze: { r: 5, c: 2 }, heights: { 3: 22, 4: 38 }, landscape: true },
      { name: 'Parámetros', rows: par, widths: [34, 18] },
    ]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `rol-de-pagos-${S.periodo}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function exportCSV() {
    const S = App.S, q = (x) => `"${String(x ?? '').replace(/"/g, '""')}"`, txt = (x) => (x ? `="${x}"` : ''); // ="..." evita que Excel quite ceros o use notación científica
    const head = ['Empleado', 'Cédula', 'Cargo', 'Fecha de ingreso', 'Días', 'Sueldo', 'Horas extras', 'Bonos', 'Otros ingresos', '13 mensualizado', '14 mensualizado', 'Fondos de reserva', 'Total ingresos', 'IESS personal', 'Renta', 'Anticipo', 'Préstamos', 'Otros descuentos', 'Total egresos', 'Neto', 'IESS patronal', 'SECAP+IECE', 'Prov. 13', 'Prov. 14', 'Prov. fondos', 'Prov. vacaciones', 'Costo empleador'];
    const lines = S.empleados.filter((e) => activo(e, S.periodo)).map((e) => { const c = App.calc(e);
      return [e.nombre, txt(e.cedula), e.cargo, txt(e.ingreso), c.dias, c.sueldo, c.horasExtras, c.bonos, c.otrosIng, c.d13Pago, c.d14Pago, c.frPago, c.totalIngresos, c.iessEmp, c.renta, c.anticipo, c.prestamos, c.otrosDesc, c.totalEgresos, c.neto, c.patronal, EC.r2(c.secap + c.iece), c.prov13, c.prov14, c.provFR, c.provVac, c.costoEmpleador]; });
    App.download(`rol-de-pagos-${S.periodo}.csv`, '﻿' + [head, ...lines].map((r) => r.map((v) => (typeof v === 'string' && v.startsWith('="') ? `"${v.replace(/"/g, '""')}"` : q(v))).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
  }

  const emptyNomina = (v, t) => { v.innerHTML = `<div class="empty big"><h2>${t}</h2><p>Carga los datos de demostración para explorar todos los módulos, o empieza agregando tu primer empleado.</p>
    <div class="row center"><button class="btn primary" id="seed">Cargar demo</button><a class="btn" href="#/empleados">Agregar empleado</a></div></div>`;
    $('#seed').onclick = () => { App.seedDemo(); App.render(); }; };

  /* ---------- Resumen ---------- */
  const VENC = [['Décimo tercero', 12, 24, 'Hasta el 24 de diciembre'], ['Participación de utilidades', 4, 15, 'Hasta el 15 de abril'], ['Décimo cuarto · Costa y Galápagos', 3, 15, 'Hasta el 15 de marzo'], ['Décimo cuarto · Sierra y Oriente', 8, 15, 'Hasta el 15 de agosto'], ['Formulario 107 y anexo RDEP', 1, 31, 'Enero; el anexo se escalona por noveno dígito del RUC']];
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
    for (let m = 1; m <= 12; m++) { const pp = `${year}-${String(m).padStart(2, '0')}`; if (pp > p) break; const t = App.totalesPeriodo(pp); if (t.n) meses.push({ label: App.MESES[m - 1].slice(0, 3), vals: { neto: t.neto, desc: t.egresos, pat: t.patronal || 0, prov: t.prov } }); }
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

  /* ---------- Rol del mes ---------- */
  let modo = 'vivo', showFx = true;
  const regTxt = (e, k) => { const r = App.S.cfg.regimenes[e.regimen] || App.S.cfg.regimenes.ct; return r[k]; };
  const CAMPOS = [
    ['dias', 'Días trabajados', 0, 30, 1, () => 'Días del mes que trabajó (máximo 30). Si ingresó este mes, se calcula solo desde su fecha de ingreso.'],
    ['hSup', 'Horas suplementarias', 0, 60, 1, (e) => `Horas extra hasta las 24h00 en días laborables. Se pagan con ${regTxt(e, 'suplementaria')}% de recargo.`],
    ['hExt', 'Horas extraordinarias', 0, 40, 1, (e) => `Madrugada (24h00 a 6h00), sábados, domingos y feriados. Se pagan con ${regTxt(e, 'extraordinaria')}% de recargo.`],
    ['hNoc', 'Horas nocturnas', 0, 80, 1, (e) => `Horas de jornada normal entre 19h00 y 6h00: recargo de ${regTxt(e, 'nocturno')}% sobre el valor de la hora.`],
  ];
  const MONEY = [
    ['bonos', 'Bonos o comisiones', 'Pagos habituales por resultados. Aportan al IESS y entran en el cálculo del décimo tercero y los fondos de reserva.'],
    ['otrosIng', 'Otros ingresos', 'Movilización, alimentación u otros pagos que no aportan al IESS.'],
    ['anticipo', 'Anticipo de sueldo', 'Adelanto entregado durante el mes; se descuenta del neto.'],
    ['prestamos', 'Préstamos', 'Cuotas de préstamos IESS (quirografarios, hipotecarios) o de la empresa.'],
    ['otrosDesc', 'Otros descuentos', 'Multas, convenios u otros descuentos autorizados por el trabajador.'],
  ];
  const LINEAS = [
    ['ing', 'sueldo', (c) => `Sueldo · ${c.dias} días`], ['ing', 'pagoSup', (c) => `Horas suplementarias · ${c.hSup} h`], ['ing', 'pagoExt', (c) => `Horas extraordinarias · ${c.hExt} h`],
    ['ing', 'pagoNoc', (c) => `Recargo nocturno · ${c.hNoc} h`], ['ing', 'bonos', () => 'Bonos y comisiones'], ['ing', 'otrosIng', () => 'Otros ingresos'],
    ['ing', 'd13Pago', () => 'Décimo tercero mensualizado'], ['ing', 'd14Pago', () => 'Décimo cuarto mensualizado'], ['ing', 'frPago', () => 'Fondos de reserva'],
    ['egr', 'iessEmp', () => `Aporte IESS ${App.S.cfg.iessPersonal}%`], ['egr', 'renta', () => 'Retención de impuesto a la renta'], ['egr', 'anticipo', () => 'Anticipo'], ['egr', 'prestamos', () => 'Préstamos'], ['egr', 'otrosDesc', () => 'Otros descuentos'],
  ];
  const STATS = [
    ['neto', 'Total a pagar', 'Suma del neto de todos los empleados del mes: lo que se transfiere a los trabajadores.'],
    ['ingresos', 'Total ingresos', 'Todo lo devengado: sueldos, horas extras, bonos y décimos o fondos mensualizados. Antes de descuentos.'],
    ['iess', 'Planilla IESS', 'Lo que se paga al IESS: aporte personal 9,45% (retenido al trabajador) + patronal 11,15% + SECAP 0,5% + IECE 0,5%.'],
    ['costo', 'Costo empleador', 'Lo que realmente cuesta la nómina: ingresos + aporte patronal + SECAP/IECE + provisiones de décimos, fondos y vacaciones.'],
  ];
  App.views.rol = (v) => {
    const S = App.S, p = S.periodo;
    if (!S.empleados.length) return emptyNomina(v, 'Aún no hay empleados');
    const lista = S.empleados.filter((e) => activo(e, p));
    if (!lista.length) { v.innerHTML = `<div class="empty big"><h2>Nadie en nómina en ${App.periodoLabel(p)}</h2><p>Los empleados aparecen desde su mes de ingreso. Cambia el periodo arriba.</p></div>`; return; }
    if (!lista.find((e) => e.id === S.selEmp)) S.selEmp = lista[0].id;
    v.innerHTML = `<div class="head"><div><h1>Rol de pagos · ${App.periodoLabel(p)}</h1><p class="sub">Elige un empleado, ingresa sus novedades del mes y el rol se recalcula al instante.</p></div>
      <div class="row wrap"><div class="seg" role="group" aria-label="Vista"><button data-m="vivo" class="${modo === 'vivo' ? 'on' : ''}">En vivo</button><button data-m="tabla" class="${modo === 'tabla' ? 'on' : ''}">Tabla</button></div>
      <button class="btn" id="copy">${icon('undo')}Copiar mes anterior</button><button class="btn" id="xls">${icon('down')}Excel</button><button class="btn" id="csv">${icon('down')}CSV</button><button class="btn" id="pc">${icon('print')}Consolidado</button><button class="btn primary" id="pa">${icon('print')}Imprimir roles</button></div></div>
      <details class="card guide"><summary>¿Cómo leer esta pantalla?</summary><div class="guide-b"><ul>
        <li><b>Tarjetas de arriba:</b> son totales de <i>todos</i> los empleados del mes. Pasa el mouse por el signo «?» para ver qué suma cada una.</li>
        <li><b>Lista de la izquierda:</b> cada empleado con su neto del mes. Al elegir uno, el panel de la derecha muestra su rol.</li>
        <li><b>Controles (novedades):</b> lo que cambia de un mes a otro: días, horas extras, bonos, anticipos y descuentos. Puedes mover el slider o escribir el número.</li>
        <li><b>Rol (ingresos y egresos):</b> se calcula solo con la ficha del empleado y las novedades. Activa «Mostrar cómo se calcula» para ver la fórmula de cada línea.</li>
        <li><b>Neto a recibir:</b> total de ingresos menos total de egresos. Es lo que se deposita al trabajador.</li></ul></div></details>
      <div class="stats" id="stats"></div><div id="body"></div>`;
    $$('.seg button', v).forEach((b) => (b.onclick = () => { modo = b.dataset.m; App.render(); }));
    $('#xls').onclick = exportExcel; $('#csv').onclick = exportCSV;
    $('#pc').onclick = () => App.print(consolidadoHTML(), 'landscape');
    $('#pa').onclick = () => App.print(lista.map((e) => App.slipHTML(e, App.calc(e))).join(''));
    $('#copy').onclick = async () => {
      const prev = App.shiftPeriodo(p, -1), src = S.periodos[prev];
      if (!src || !Object.keys(src).length) return App.toast(`No hay novedades en ${App.periodoLabel(prev)}`);
      if (!(await App.confirm({ title: 'Copiar mes anterior', text: `Se reemplazan las novedades de ${App.periodoLabel(p)} con las de ${App.periodoLabel(prev)}.`, ok: 'Copiar' }))) return;
      const snap = JSON.stringify(S.periodos[p] || {}); S.periodos[p] = JSON.parse(JSON.stringify(src)); App.save(); App.render();
      App.toast('Novedades copiadas', () => { S.periodos[p] = JSON.parse(snap); App.save(); App.render(); });
    };
    (modo === 'vivo' ? vivo : tabla)($('#body', v), lista);
    refreshStats();
  };
  function refreshStats() {
    const T = App.totalesPeriodo(App.S.periodo), el = $('#stats');
    if (!el) return;
    if (!el.children.length) el.innerHTML = STATS.map(([k, l, t]) => `<div class="stat"><span>${l}${tip(t)}</span><b data-k="${k}">$0.00</b></div>`).join('');
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
    const base = (k) => (k === 'dias' ? EC.diasDefault(e, S.periodo, S.cfg) : 0);
    const val = (k) => (nv[k] === undefined || nv[k] === '' ? base(k) : +nv[k]);
    ctl.innerHTML = `<div class="who-h">${avatar(e)}<div><h2>${esc(e.nombre)}</h2><p class="sub">${esc(e.cargo)} · ${esc(regNombre(e).split(' (')[0])} · salario ${money(+e.salario)}</p></div><button class="btn sm" id="vr">${icon('print')}Rol individual</button></div>
      <div class="sliders">${CAMPOS.map(([k, l, mn, mx, st, t]) => { const off = e.horasExtras === false && k !== 'dias', x = val(k);
        return `<div class="sl ${off ? 'off' : ''}"><span>${l}${tip(t(e))}</span><div class="slr"><input type="range" data-k="${k}" min="${mn}" max="${Math.max(mx, x)}" step="${st}" value="${x}" ${off ? 'disabled' : ''} aria-label="${l}"><input class="num" type="number" data-k="${k}" step="any" min="0" value="${x}" ${off ? 'disabled' : ''} aria-label="${l}"></div></div>`; }).join('')}</div>
      <div class="money">${MONEY.map(([k, l, t]) => `<label><span class="lt">${l}${tip(t)}</span><span class="cur"><i>$</i><input data-k="${k}" type="number" min="0" step="any" inputmode="decimal" placeholder="0.00" value="${esc(nv[k] ?? '')}"></span></label>`).join('')}</div>
      ${e.horasExtras === false ? '<p class="hint">Este empleado no tiene horas extras habilitadas (cargo de dirección o confianza). <button class="lnk" id="enHE">Habilitar horas extras</button></p>' : ''}`;
    const he = $('#enHE', ctl); if (he) he.onclick = () => { e.horasExtras = true; App.save(); drawPanel(host, lista); };
    const line = (l) => `<li class="ln" data-k="${l[1]}"><div><span class="lb"><span class="t"></span><small class="fx"></small></span><b class="vl">$0.00</b></div></li>`;
    slip.innerHTML = `<div class="slip2 ${showFx ? 'fx-on' : ''}"><div class="slip-top"><h3>Rol del mes</h3><label class="switch"><input type="checkbox" id="fx" ${showFx ? 'checked' : ''}><span>Mostrar cómo se calcula</span></label></div>
      <div class="cols-s"><div><h4>Ingresos</h4><ul id="li-ing">${LINEAS.filter((l) => l[0] === 'ing').map(line).join('')}</ul><div class="tot"><span>Total ingresos</span><b id="t-ing">$0.00</b></div></div>
      <div><h4>Egresos</h4><ul id="li-egr">${LINEAS.filter((l) => l[0] === 'egr').map(line).join('')}</ul><div class="tot"><span>Total egresos</span><b id="t-egr">$0.00</b></div></div></div>
      <div class="net2"><span>Neto a recibir<small>Total ingresos − total egresos</small></span><b id="t-neto">$0.00</b></div><div class="flow-bar" id="fb"></div><ul class="legend inline" id="fl"></ul>
      <details class="bd more"><summary><span>Costo para la empresa</span><b id="t-costo">$0.00</b>${icon('chev')}</summary><dl id="emp-dl"></dl></details><ul class="warns" id="avs"></ul></div>`;
    $('#fx', slip).onchange = (ev) => { showFx = ev.target.checked; $('.slip2', slip).classList.toggle('fx-on', showFx); };
    $('#vr', ctl).onclick = () => App.print(App.slipHTML(e, App.calc(e)));
    const upd = () => {
      const c = App.calc(e);
      LINEAS.forEach(([g, k, lab]) => { const li = $(`#li-${g} li[data-k="${k}"]`, slip), x = c[k]; li.classList.toggle('show', x > 0 || k === 'sueldo'); $('.t', li).textContent = lab(c); $('.fx', li).textContent = fxText(k, c, e); App.setNum($('.vl', li), x); });
      App.setNum($('#t-ing', slip), c.totalIngresos); App.setNum($('#t-egr', slip), c.totalEgresos); App.setNum($('#t-neto', slip), c.neto); App.setNum($('#t-costo', slip), c.costoEmpleador);
      const parts = [['Neto', c.neto, 'var(--c-neto)'], ['IESS', c.iessEmp, 'var(--c-pat)'], ['Renta', c.renta, 'var(--c-prov)'], ['Otros descuentos', c.anticipo + c.prestamos + c.otrosDesc, 'var(--c-desc)']];
      const tot = Math.max(0.01, c.totalIngresos);
      $('#fb', slip).innerHTML = parts.map(([l, n, col]) => `<i style="width:${Math.max(0, (n / tot) * 100)}%;background:${col}" title="${l}: ${money(n)}"></i>`).join('');
      $('#fl', slip).innerHTML = parts.map(([l, n, col]) => `<li><i style="background:${col}"></i>${l} <b>${money(n)}</b></li>`).join('');
      $('#emp-dl', slip).innerHTML = costoRows(c);
      $('#avs', slip).innerHTML = c.avisos.map((a) => `<li>${esc(a)}</li>`).join('');
      const mini = $(`[data-n="${e.id}"]`, host); if (mini) App.setNum(mini, c.neto);
      refreshStats();
    };
    ctl.addEventListener('input', (ev) => {
      const k = ev.target.dataset.k; if (!k) return;
      const v = ev.target.value;
      if (v === '') delete nv[k]; else nv[k] = v;
      if (ev.target.type === 'range' || ev.target.classList.contains('num')) { // slider y número siempre sincronizados
        $$(`input[data-k="${k}"]`, ctl).forEach((o) => { if (o === ev.target) return; if (o.type === 'range') o.max = Math.max(+o.max, +v || 0); o.value = v === '' ? base(k) : v; });
      }
      App.save(); upd();
    });
    upd();
  }
  App.consolidadoHTML = consolidadoHTML;
  /** Desglose del costo para la empresa, con su fórmula. */
  function costoRows(c) {
    const cfg = App.S.cfg, r = (l, f, v, cls = '') => `<dt class="${cls}">${l}${f ? `<small>${f}</small>` : ''}</dt><dd class="${cls}">${money(v)}</dd>`;
    return r('Total ingresos pagados', 'lo que recibe el trabajador antes de descuentos', c.totalIngresos)
      + r(`Aporte patronal IESS ${cfg.iessPatronal}%`, `${money(c.aportable)} × ${cfg.iessPatronal}%`, c.patronal)
      + r(`SECAP ${cfg.secap}% + IECE ${cfg.iece}%`, `${money(c.aportable)} × ${cfg.secap + cfg.iece}%`, EC.r2(c.secap + c.iece))
      + (c.prov13 ? r('Provisión décimo tercero', `${money(c.aportable)} ÷ 12`, c.prov13) : '') + (c.prov14 ? r('Provisión décimo cuarto', `SBU ÷ 12 × días/${cfg.diasMes}`, c.prov14) : '')
      + (c.provFR ? r('Provisión fondos de reserva', `${money(c.aportable)} × ${cfg.fondosReserva}%`, c.provFR) : '') + r('Provisión de vacaciones', `${money(c.aportable)} ÷ 24`, c.provVac)
      + r('Costo total del empleado', '', c.costoEmpleador, 'tot');
  }

  function tabla(host, lista) {
    const S = App.S, COLS = [['dias', 'Días'], ['hSup', 'H. suplem.'], ['hExt', 'H. extraord.'], ['hNoc', 'H. noct.'], ['bonos', 'Bonos'], ['otrosIng', 'Otros ing.'], ['anticipo', 'Anticipo'], ['prestamos', 'Préstamos'], ['otrosDesc', 'Otros desc.']];
    host.innerHTML = `<div class="tablewrap tbl-rol"><table id="tbl"><thead><tr class="grp"><th rowspan="2" class="l">Empleado</th><th colspan="${COLS.length}" class="g-nov">Novedades del mes (editables)</th><th colspan="3" class="g-res">Resultado</th><th rowspan="2"></th></tr>
      <tr>${COLS.map((c) => `<th class="s-nov">${c[1]}</th>`).join('')}<th class="s-res">Ingresos</th><th class="s-res">Egresos</th><th class="s-res">Neto</th></tr></thead><tbody>
      ${lista.map((e) => `<tr data-id="${e.id}"><td class="l"><div class="cellp">${avatar(e)}<span><b>${esc(e.nombre)}</b><small>${esc(e.cargo)}</small></span></div></td>${COLS.map(([k]) => `<td><input data-k="${k}" type="number" min="0" step="any" value="${esc(App.novedades(e.id)[k] ?? '')}" placeholder="${k === 'dias' ? EC.diasDefault(e, S.periodo, S.cfg) : 0}" aria-label="${k}"></td>`).join('')}<td data-o="ing" class="res"></td><td data-o="egr" class="res"></td><td data-o="neto" class="neto"></td><td><button class="btn sm" data-ver>Ver rol</button></td></tr>`).join('')}</tbody>
      <tfoot><tr><td class="l">Totales</td>${COLS.map(() => '<td></td>').join('')}<td data-t="ing" class="res"></td><td data-t="egr" class="res"></td><td data-t="neto" class="neto"></td><td></td></tr></tfoot></table></div><div id="avisos"></div>`;
    const upd = () => {
      const av = [], T = { ing: 0, egr: 0, neto: 0 };
      lista.forEach((e) => { const c = App.calc(e), tr = $(`tr[data-id="${e.id}"]`, host); App.setNum($('[data-o=ing]', tr), c.totalIngresos); App.setNum($('[data-o=egr]', tr), c.totalEgresos); App.setNum($('[data-o=neto]', tr), c.neto);
        T.ing += c.totalIngresos; T.egr += c.totalEgresos; T.neto += c.neto; c.avisos.forEach((a) => av.push(`${e.nombre}: ${a}`)); });
      ['ing', 'egr', 'neto'].forEach((k) => App.setNum($(`[data-t=${k}]`, host), EC.r2(T[k])));
      $('#avisos', host).innerHTML = av.length ? `<div class="card" style="margin-top:16px"><h2>Avisos</h2><ul class="warns">${av.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></div>` : '';
      refreshStats();
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
        <td class="l">${esc(regNombre(e).split(' (')[0])}</td><td>${money(+e.salario)}</td><td class="l">${esc(e.ingreso)}</td><td>${modoTag(e.d13)}</td><td>${modoTag(e.d14)}</td><td>${modoTag(e.fr)}</td><td>${e.horasExtras === false ? '<span class="tag mute">No</span>' : '<span class="tag ok">Sí</span>'}</td>
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

  /** Ficha del empleado: secciones cortas, ayudas en «?» y vista previa con desglose desplegable. */
  function form(e) {
    const S = App.S, abiertos = {};
    const n = e ? JSON.parse(JSON.stringify(e)) : { id: uid(), nombre: '', cedula: '', cargo: '', regimen: 'ct', salario: S.cfg.sbu, ingreso: '', region: 'sierra', d13: 'mensualiza', d14: 'mensualiza', fr: 'mensualiza', horasExtras: true, iess: true, rentaModo: 'auto', renta: 0, gastosPersonales: 0, cargas: 0 };
    const sel = (id, opts, val) => `<select id="${id}">${opts.map(([v, t]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    const lab = (t, h, cls = '', body = '') => `<label class="${cls}"><span class="lt">${t}${h ? tip(h) : ''}</span>${body}</label>`;
    const d = App.modal(`<div class="row between"><h3>${e ? 'Editar' : 'Nuevo'} empleado</h3><button class="btn sm ghost" id="x" type="button">${icon('x')}Cerrar</button></div>
      <form id="f"><div class="docform"><div class="fsecs">
      <section class="fs"><h4>Datos personales</h4><div class="grid2">
        ${lab('Nombre completo', '', 'span2', `<input id="nombre" required value="${esc(n.nombre)}" autocomplete="off">`)}
        ${lab('Cédula', 'Se valida el dígito verificador. Una cédula inválida no impide guardar.', '', `<input id="cedula" inputmode="numeric" maxlength="10" value="${esc(n.cedula)}" autocomplete="off"><small id="cm"></small>`)}
        ${lab('Cargo', '', '', `<input id="cargo" value="${esc(n.cargo)}" autocomplete="off">`)}</div></section>
      <section class="fs"><h4>Contrato</h4><div class="grid2">
        ${lab('Régimen laboral', 'Código del Trabajo: empresa privada. LOSEP: sector público. Define los recargos de horas extras (editables en Ajustes).', '', sel('regimen', Object.entries(S.cfg.regimenes).map(([k, r]) => [k, r.nombre.split(' (')[0]]), n.regimen))}
        ${lab('Región', 'Fija la fecha del décimo cuarto: 15 de agosto en Sierra y Oriente, 15 de marzo en Costa y Galápagos.', '', sel('region', [['sierra', 'Sierra y Oriente'], ['costa', 'Costa y Galápagos']], n.region))}
        ${lab('Salario mensual (USD)', `El SBU ${S.cfg.anio} es ${money(S.cfg.sbu)}. Un salario menor genera una alerta pero igual se calcula.`, '', `<input id="salario" type="number" min="0" step="any" required value="${n.salario}">`)}
        ${lab('Fecha de ingreso', 'Prorratea los días del primer mes y define desde cuándo corresponden fondos de reserva (12 meses cumplidos).', '', `<input id="ingreso" type="date" value="${esc(n.ingreso)}">`)}</div></section>
      <section class="fs"><h4>Beneficios</h4><div class="grid2">
        ${lab('Décimo tercero', 'Un doceavo de lo ganado en el año. «Cada mes» lo suma al rol; «Se acumula» lo provisiona.', '', sel('d13', MODOS.d13, n.d13))}
        ${lab('Décimo cuarto', 'Un SBU al año, proporcional a los días trabajados.', '', sel('d14', MODOS.d14, n.d14))}
        ${lab('Fondos de reserva', '8,33% del sueldo desde el segundo año. Antes de cumplir 12 meses no se calcula, aunque elijas «Cada mes».', 'span2', sel('fr', MODOS.fr, n.fr))}
        <label class="check"><input id="he" type="checkbox" ${n.horasExtras !== false ? 'checked' : ''}> Recibe horas extras</label><label class="check"><input id="iess" type="checkbox" ${n.iess !== false ? 'checked' : ''}> Afiliado al IESS</label></div></section>
      <section class="fs"><h4>Impuesto a la renta</h4><div class="grid2">
        ${lab('Cálculo de la retención', 'Automático: proyecta el año con la tabla del SRI. Manual: tú fijas el valor mensual (por ejemplo, el de tu contador).', '', sel('rm', [['auto', 'Automático (tabla del SRI)'], ['manual', 'Valor manual']], n.rentaModo || 'auto'))}
        ${lab('Retención mensual (USD)', '', 'rl', `<input id="renta" type="number" min="0" step="any" value="${n.renta || 0}">`)}
        ${lab('Cargas familiares', 'Hijos o dependientes. Aumentan el tope de gastos personales deducibles y el reparto de utilidades (5% por cargas).', '', `<input id="cargas" type="number" min="0" step="any" value="${n.cargas || 0}">`)}
        ${lab('Gastos personales al año (USD)', 'Vivienda, educación, salud, alimentación, vestimenta y turismo. Generan una rebaja del impuesto, con tope según las cargas.', 'ra', `<input id="gastos" type="number" min="0" step="any" value="${n.gastosPersonales || 0}">`)}</div>
        <details class="bd flat" id="irx"><summary><span>Ver tabla del SRI y topes de gastos</span>${icon('chev')}</summary><div id="irt"></div></details></section></div>
      <aside class="sumbox" id="pv"></aside></div>
      <div class="row end" style="margin-top:16px"><button class="btn" type="button" id="cancel">Cancelar</button><button class="btn primary" type="submit">Guardar</button></div></form>`, { wide: true });
    $('#x', d).onclick = $('#cancel', d).onclick = App.closeModal;
    d.addEventListener('toggle', (ev) => { if (ev.target.dataset && ev.target.dataset.k) abiertos[ev.target.dataset.k] = ev.target.open; }, true);
    const ced = $('#cedula', d);
    const read = () => Object.assign(n, { nombre: $('#nombre', d).value.trim(), cedula: ced.value.trim(), cargo: $('#cargo', d).value.trim(), regimen: $('#regimen', d).value, region: $('#region', d).value, salario: +$('#salario', d).value || 0, ingreso: $('#ingreso', d).value,
      d13: $('#d13', d).value, d14: $('#d14', d).value, fr: $('#fr', d).value, cargas: +$('#cargas', d).value || 0, gastosPersonales: +$('#gastos', d).value || 0, rentaModo: $('#rm', d).value, renta: +$('#renta', d).value || 0, horasExtras: $('#he', d).checked, iess: $('#iess', d).checked });
    const row = (l, v, f, cls = '') => `<dt class="${cls}">${l}${f ? `<small>${f}</small>` : ''}</dt><dd class="${cls}">${v}</dd>`;
    const bd = (k, label, total, inner) => `<details class="bd" data-k="${k}" ${abiertos[k] ? 'open' : ''}><summary><span>${label}</span><b>${money(total)}</b>${icon('chev')}</summary><dl>${inner}</dl></details>`;
    const prev = () => {
      read();
      $$('.rl', d).forEach((x) => (x.hidden = n.rentaModo !== 'manual')); $$('.ra', d).forEach((x) => (x.hidden = n.rentaModo === 'manual'));
      $('#cm', d).innerHTML = !n.cedula ? '' : EC.cedulaValida(n.cedula) ? '<span class="good">Cédula válida</span>' : '<span class="bad">Dígito verificador inválido</span>';
      const c = EC.calcular(n, {}, S.cfg, S.periodo), cfg = S.cfg;
      const ing = row('Sueldo', money(c.sueldo), `${money(n.salario)} ÷ ${cfg.diasMes} × ${c.dias} días`)
        + (c.d13Pago ? row('Décimo tercero', money(c.d13Pago), `${money(c.aportable)} ÷ 12`) : '') + (c.d14Pago ? row('Décimo cuarto', money(c.d14Pago), `SBU ${money(cfg.sbu)} ÷ 12`) : '')
        + (c.frPago ? row('Fondos de reserva', money(c.frPago), `${money(c.aportable)} × ${cfg.fondosReserva}%`) : '');
      const rd = c.rentaDet;
      const dsc = row('Aporte IESS', money(c.iessEmp), `${money(c.aportable)} × ${cfg.iessPersonal}%`)
        + row('Retención de renta', money(c.renta), rd ? `(impuesto ${money(rd.impuestoAnual)} − rebaja ${money(rd.rebaja)}) ÷ 12` : 'valor manual');
      const emp = row('Ingresos pagados', money(c.totalIngresos), '') + row(`Aporte patronal ${cfg.iessPatronal}%`, money(c.patronal), `${money(c.aportable)} × ${cfg.iessPatronal}%`) + row(`SECAP + IECE ${cfg.secap + cfg.iece}%`, money(EC.r2(c.secap + c.iece)), '')
        + (c.prov13 ? row('Provisión 13º', money(c.prov13), `${money(c.aportable)} ÷ 12`) : '') + (c.prov14 ? row('Provisión 14º', money(c.prov14), 'SBU ÷ 12') : '') + (c.provFR ? row('Provisión fondos', money(c.provFR), `× ${cfg.fondosReserva}%`) : '')
        + row('Provisión vacaciones', money(c.provVac), `${money(c.aportable)} ÷ 24`) + row('Costo total', money(c.costoEmpleador), '', 'tot');
      $('#pv', d).innerHTML = `<h4>Vista previa mensual</h4><p class="sub">${App.periodoLabel(S.periodo)} · sin horas extras ni novedades</p>${bd('ing', 'Ingresos', c.totalIngresos, ing)}${bd('dsc', 'Descuentos', c.totalEgresos, dsc)}
        <div class="bd-net"><span>Neto a recibir</span><b>${money(c.neto)}</b></div>${bd('emp', 'Costo para la empresa', c.costoEmpleador, emp)}${c.avisos.length ? `<ul class="errs">${c.avisos.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}`;
      $('#irt', d).innerHTML = App.irTableHTML(rd ? rd.base : undefined, n.cargas);
    };
    $('#f', d).addEventListener('input', prev); $('#f', d).addEventListener('change', prev); prev();
    $('#f', d).onsubmit = (ev) => {
      ev.preventDefault();
      read(); if (e) Object.assign(e, n); else S.empleados.push(n);
      S.selEmp = n.id;
      let msg = 'Empleado guardado';
      if (n.ingreso && n.ingreso.slice(0, 7) > S.periodo) { S.periodo = n.ingreso.slice(0, 7); msg += ` · periodo cambiado a ${App.periodoLabel(S.periodo)} (su mes de ingreso)`; }
      App.save(); App.closeModal(); App.render(); App.toast(msg);
    };
  }
})();
