/* Remuneraciones: cuadro mensual por empleado (régimen, jornada, aportes, décimos, fondos de reserva y RUM) con exportación a Excel */
(function () {
  'use strict';
  const App = window.App, EC = App.EC, { $, esc, money } = App;
  const r2 = EC.r2;
  let proyectar = false; // fondos de reserva como si ya cumpliera 1 año

  /** Valores mensuales del empleado, sin novedades del mes (horas extras, anticipos, días parciales). */
  function fila(e) {
    const S = App.S, cfg = S.cfg, sal = +e.salario || 0, jor = EC.jornadaDe(e, cfg), mn = EC.salarioMinimo(e, cfg);
    const afil = e.iess !== false, modo = (m) => m || 'mensualiza';
    const patronal = afil ? (sal * cfg.iessPatronal) / 100 : 0, personal = afil ? (sal * cfg.iessPersonal) / 100 : 0; // sin redondeo intermedio, como la hoja de cálculo
    const d14 = cfg.sbu, d14m = cfg.sbu / 12; // décimos 13 y 14 obligatorios para todos
    const d13 = sal, d13m = sal / 12;
    const aplicaFR = modo(e.fr) !== 'no' && (proyectar || EC.mesesAntiguedad(e.ingreso, S.periodo) >= 12);
    const fr = aplicaFR ? (sal * cfg.fondosReserva) / 100 : 0;
    const sinDec = sal - personal;
    const conDec = (sinDec + (e.d14 !== 'acumula' ? d14m : 0) + (e.d13 !== 'acumula' ? d13m : 0) + (modo(e.fr) === 'mensualiza' ? fr : 0));
    const com = e.comision ? cfg.comisiones.find((x) => String(x.id) === String(e.comision)) : null;
    return { e, sal, jor, mn, patronal, personal, d14, d14m, d13, d13m, fr, sinDec, conDec, com };
  }
  const COLS = (cfg) => [
    ['Denominación', 'l', (f) => f.e.cargo || f.e.nombre, 30, 'txt'],
    ['Empleado', 'l', (f) => f.e.nombre, 28, 'txt'],
    ['Régimen laboral', 'l', (f) => (cfg.regimenes[cfg.regimenActivo] || cfg.regimenes.ct).nombre.split(' (')[0], 20, 'txt'],
    ['Jornada de trabajo', 'l', (f) => f.jor.texto, 16, 'txt'],
    ['Comisión · nivel', 'l', (f) => (f.com ? `N.º ${f.com.id}${f.e.nivel ? ' · ' + f.e.nivel : ''}` : '–'), 14, 'txt'],
    ['Mínimo aplicable', 'n', (f) => f.mn.valor, 13, 'sum0'],
    ['Remuneración mensual', 'n', (f) => f.sal, 15, 'sum'],
    [`Aporte patronal ${cfg.iessPatronal}%`, 'n', (f) => f.patronal, 14, 'sum'],
    [`Aporte personal ${cfg.iessPersonal}%`, 'n', (f) => f.personal, 14, 'sum'],
    ['Décimo cuarto', 'n', (f) => f.d14, 12, 'sum'],
    ['Décimo cuarto mensual', 'n', (f) => f.d14m, 13, 'sum'],
    ['Décimo tercero', 'n', (f) => f.d13, 12, 'sum'],
    ['Décimo tercero mensual', 'n', (f) => f.d13m, 13, 'sum'],
    [`Fondos de reserva (${cfg.fondosReserva}%)`, 'n', (f) => f.fr, 14, 'sum'],
    ['RUM mensual con décimos', 'n', (f) => f.conDec, 15, 'sum'],
    ['RUM mensual sin décimos', 'n', (f) => f.sinDec, 15, 'sum'],
  ];
  const lista = () => App.S.empleados.filter((e) => !e.ingreso || e.ingreso.slice(0, 7) <= App.S.periodo).map(fila);

  function exportExcel() {
    const S = App.S, X = App.xlsx, cols = COLS(S.cfg), rows = lista(), n = cols.length;
    const head = { font: { b: 1 }, fill: 'FFD8EFED', h: 'center', wrap: true, border: 1 };
    const first = 5, last = first + rows.length - 1, tot = last + 1;
    const body = rows.map((f, i) => cols.map((c, j) => { const v = c[2](f, i); return { v, s: { border: 1, fmt: c[4] === 'txt' ? undefined : 'num' } }; }));
    const totRow = cols.map((c, j) => { const L = X.colName(j);
      if (j === 0) return { v: `TOTALES (${rows.length})`, s: { font: { b: 1 }, border: 'total', fill: 'FFEEF1F4' } };
      if (c[4] !== 'sum') return { s: { border: 'total', fill: 'FFEEF1F4' } };
      return { f: `SUM(${L}${first}:${L}${last})`, v: rows.reduce((a, f) => a + c[2](f), 0), s: { font: { b: 1 }, border: 'total', fmt: 'num', fill: 'FFEEF1F4' } }; });
    const blob = X.build([{
      name: 'Remuneraciones',
      rows: [[{ v: `REMUNERACIONES ${(S.empresa.nombre || '').toUpperCase()}`.trim(), s: { font: { b: 1, sz: 16 } } }], [{ v: `${App.periodoLabel(S.periodo)} · Valores en USD`, s: { font: { i: 1, color: 'FF5A6877' } } }], [],
        cols.map((c) => ({ v: c[0], s: head })), ...body, totRow],
      widths: cols.map((c) => c[3]), merges: [`A1:${X.colName(n - 1)}1`, `A2:${X.colName(n - 1)}2`], freeze: { r: 4, c: 2 }, heights: { 3: 44 }, landscape: true,
    }]);
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `remuneraciones-${S.periodo}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  App.views.remuneraciones = (v) => {
    const S = App.S;
    if (!S.empleados.length) { v.innerHTML = '<div class="empty big"><h2>Aún no hay empleados</h2><p>Agrega empleados o carga la demo para ver el cuadro de remuneraciones.</p><div class="row center"><a class="btn primary" href="#/empleados">Ir a empleados</a></div></div>'; return; }
    const cols = COLS(S.cfg), rows = lista();
    const cell = (c, f, i) => (c[1] === 'l' ? `<td class="l">${esc(c[2](f, i))}</td>` : `<td>${c[4] === 'sum0' ? money(c[2](f)) : money(c[2](f))}</td>`);
    const sum = (c) => rows.reduce((a, f) => a + c[2](f), 0);
    v.innerHTML = `<div class="head"><div><h1>Remuneraciones</h1><p class="sub">Cuadro mensual por empleado: aportes, décimos, fondos de reserva y remuneración mensual unificada (RUM). ${esc(App.periodoLabel(S.periodo))}.</p></div>
      <div class="row wrap"><label class="check"><input type="checkbox" id="proy" ${proyectar ? 'checked' : ''}> Fondos de reserva sin esperar 1 año</label><button class="btn" id="xl">${App.icon('down')}Excel</button></div></div>
      <div class="tablewrap"><table class="list"><thead><tr><th class="nn">N.º</th>${cols.map((c) => `<th class="${c[1]}">${esc(c[0])}</th>`).join('')}</tr></thead>
      <tbody>${rows.map((f, i) => `<tr><td>${i + 1}</td>${cols.map((c) => cell(c, f, i)).join('')}</tr>`).join('')}</tbody>
      <tfoot><tr><td></td><td class="l"><b>Totales</b></td>${cols.slice(1).map((c) => `<td>${c[4] === 'sum' ? `<b>${money(sum(c))}</b>` : ''}</td>`).join('')}</tr></tfoot></table></div>
      <p class="help" style="margin-top:10px">Décimo cuarto = un SBU (${money(S.cfg.sbu)}); décimo tercero = remuneración mensual (un doceavo de lo ganado en el año). «Mensual» es la parte de cada mes. RUM con décimos = remuneración − aporte personal + los décimos y fondos que se pagan cada mes (los que se acumulan no se suman). RUM sin décimos = remuneración − aporte personal. Sin horas extras ni novedades del mes. El mínimo aplicable sale de la comisión sectorial y el nivel de la ficha (SBU si no hay).</p>`;
    $('#xl', v).onclick = exportExcel;
    $('#proy', v).onchange = (ev) => { proyectar = ev.target.checked; App.render(); };
  };
})();
