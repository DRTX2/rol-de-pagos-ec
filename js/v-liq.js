/* Liquidaciones (finiquito) y participación de utilidades */
(function () {
  'use strict';
  const App = window.App, EC = App.EC, { $, $$, esc, money, icon, uid } = App;
  let tab = 'finiquito';

  const finiqHTML = (f) => {
    const r = f.res, e = f.emp, E = App.S.empresa;
    const L = (k, v, cls = '') => `<dt class="${cls}">${k}</dt><dd class="${cls}">${v}</dd>`;
    return `<section class="pslip"><h2>ACTA DE FINIQUITO</h2><p class="c">${esc(E.nombre)} · RUC ${esc(E.ruc)}</p>
      <p><b>${esc(e.nombre)}</b> · C.I. ${esc(e.cedula)} · ${esc(e.cargo)}<br>Ingreso: ${esc(e.ingreso)} · Salida: ${esc(f.opt.salida)} · Causa: ${esc(r.causa)}<br>Tiempo de servicio: ${r.anios.toFixed(2)} años · Último salario: ${money(+e.salario)}</p>
      <h3>Haberes</h3><dl>${L('Sueldo pendiente', money(r.sueldoPend))}${r.d13 ? L('Décimo tercero proporcional', money(r.d13)) : ''}${r.d14 ? L('Décimo cuarto proporcional', money(r.d14)) : ''}${L(`Vacaciones no gozadas (${r.vacPend} días)`, money(r.vacValor))}
      ${r.utilidades ? L('Utilidades pendientes', money(r.utilidades)) : ''}${r.fondos ? L('Fondos de reserva pendientes', money(r.fondos)) : ''}${r.desahucio ? L('Bonificación por desahucio (25%)', money(r.desahucio)) : ''}${r.indemn ? L('Indemnización por despido intempestivo', money(r.indemn)) : ''}${L('Total haberes', money(r.ingresos), 'tot')}</dl>
      <h3>Descuentos</h3><dl>${L('Aporte IESS', money(r.iess))}${r.otros ? L('Otros', money(r.otros)) : ''}${L('Total descuentos', money(r.egresos), 'tot')}</dl><dl class="net">${L('VALOR A PAGAR', money(r.neto), 'tot')}</dl>
      <p style="margin-top:12px;font-size:11px">Cálculo referencial. El finiquito debe legalizarse ante el Ministerio de Trabajo o inspector del trabajo dentro de los plazos legales.</p>
      <div class="sig"><div>Empleador</div><div>Trabajador</div></div></section>`;
  };

  App.views.liquidaciones = (v) => {
    v.innerHTML = `<div class="head"><div><h1>Liquidaciones y utilidades</h1><p class="sub">Terminación de contrato y reparto del 15% de utilidades.</p></div><button class="btn ghost" id="vaciar">${icon('trash')}Vaciar</button></div>
      <div class="seg wide" role="tablist"><button data-t="finiquito" class="${tab === 'finiquito' ? 'on' : ''}">Finiquito</button><button data-t="utilidades" class="${tab === 'utilidades' ? 'on' : ''}">Utilidades 15%</button></div><div id="tb"></div>`;
    $('#vaciar').onclick = () => App.clearModule('liquidaciones');
    $$('.seg button', v).forEach((b) => (b.onclick = () => { tab = b.dataset.t; App.render(); }));
    (tab === 'finiquito' ? finiquito : utilidades)($('#tb', v));
  };

  function finiquito(host) {
    const S = App.S;
    if (!S.empleados.length) { host.innerHTML = '<div class="empty big"><h2>Sin empleados</h2><p>Agrega empleados para calcular su liquidación.</p></div>'; return; }
    const st = (S.liqForm ||= { salida: new Date().toISOString().slice(0, 10), causa: 'despido', vacTomadas: 0, vacExtra: 0, utilidades: 0, fondosPend: 0, descuentos: 0 });
    if (!S.liqEmp || !S.empleados.find((e) => e.id === S.liqEmp)) S.liqEmp = S.empleados[0]?.id;
    host.innerHTML = `<div class="cols2 start"><section class="card"><h2>Calculadora de finiquito</h2><div class="grid2">
      <label class="span2">Empleado<select id="emp">${S.empleados.map((e) => `<option value="${e.id}" ${e.id === S.liqEmp ? 'selected' : ''}>${esc(e.nombre)} · ingreso ${esc(e.ingreso)}</option>`).join('')}</select></label>
      <label>Fecha de salida<input type="date" id="salida" value="${st.salida}"></label>
      <label>Causa de terminación<select id="causa">${Object.entries(EC.CAUSAS).map(([k, t]) => `<option value="${k}" ${k === st.causa ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Días de vacaciones ya tomados<input type="number" id="vacTomadas" min="0" step="0.5" value="${st.vacTomadas}"></label><label>Días adicionales por antigüedad<input type="number" id="vacExtra" min="0" step="1" value="${st.vacExtra}"></label>
      <label>Utilidades pendientes (USD)<input type="number" id="utilidades" min="0" step="0.01" value="${st.utilidades}"></label><label>Fondos de reserva pendientes (USD)<input type="number" id="fondosPend" min="0" step="0.01" value="${st.fondosPend}"></label>
      <label class="span2">Otros descuentos (USD)<input type="number" id="descuentos" min="0" step="0.01" value="${st.descuentos}"></label></div>
      <div class="row end" style="margin-top:14px"><button class="btn primary" id="guardar">Guardar liquidación</button></div></section>
      <section class="card sticky" id="res"></section></div>
      <section class="card"><h2>Liquidaciones guardadas</h2>${S.finiquitos.length ? `<div class="tablewrap flat"><table class="list"><thead><tr><th class="l">Empleado</th><th class="l">Salida</th><th class="l">Causa</th><th>Valor a pagar</th><th></th></tr></thead><tbody>${S.finiquitos.map((f) => `<tr data-id="${f.id}"><td class="l"><b>${esc(f.emp.nombre)}</b></td><td class="l">${esc(f.opt.salida)}</td><td class="l">${esc(f.res.causa)}</td><td>${money(f.res.neto)}</td><td class="acts"><button class="btn sm" data-a="print">${icon('print')}Acta</button><button class="btn sm ghost danger" data-a="del" aria-label="Eliminar">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>Sin liquidaciones guardadas</b><p>Calcula una y guárdala para imprimir el acta.</p></div>'}</section>`;
    const calc = () => EC.finiquito(S.empleados.find((e) => e.id === S.liqEmp), st, S.cfg);
    const draw = () => {
      if (!S.empleados.length) return;
      const r = calc(), e = S.empleados.find((x) => x.id === S.liqEmp);
      const row = (k, v, cls = '') => `<dt class="${cls}">${k}</dt><dd class="${cls}" data-v="${v}">$0.00</dd>`;
      $('#res', host).innerHTML = `<h2>Resultado</h2><p class="sub">${r.anios.toFixed(2)} años de servicio (${r.aniosCompletos} años para indemnizaciones) · salario ${money(+e.salario)}</p>
        <dl class="rows">${row('Sueldo pendiente', r.sueldoPend)}${row('Décimo tercero proporcional' + (e.d13 === 'acumula' ? '' : ' (mensualizado)'), r.d13)}${row('Décimo cuarto proporcional' + (e.d14 === 'acumula' ? '' : ' (mensualizado)'), r.d14)}${row(`Vacaciones no gozadas · ${r.vacPend} d`, r.vacValor)}
        ${row('Utilidades pendientes', r.utilidades)}${row('Fondos de reserva pendientes', r.fondos)}${row('Bonificación por desahucio 25%', r.desahucio)}${row('Indemnización por despido', r.indemn)}${row('Total haberes', r.ingresos, 'tot')}${row('Aporte IESS y descuentos', -r.egresos)}</dl>
        <div class="net2"><span>Valor a pagar</span><b id="fnet">$0.00</b></div>
        <ul class="hint-list"><li>Despido intempestivo: hasta 3 años = 3 sueldos; más de 3 años = 1 sueldo por año (máx. 25), más el 25% de desahucio.</li><li>La fracción de año cuenta como año completo.</li><li>Referencial: confirma con el Ministerio de Trabajo antes de pagar.</li></ul>`;
      $$('[data-v]', host).forEach((d) => App.setNum(d, +d.dataset.v)); App.setNum($('#fnet', host), r.neto);
    };
    $('#emp', host).onchange = (e) => { S.liqEmp = e.target.value; App.save(); draw(); };
    ['salida', 'causa', 'vacTomadas', 'vacExtra', 'utilidades', 'fondosPend', 'descuentos'].forEach((k) => { $('#' + k, host).oninput = (e) => { st[k] = ['salida', 'causa'].includes(k) ? e.target.value : +e.target.value; App.save(); draw(); }; });
    const g = $('#guardar', host); if (g) g.onclick = () => { const e = S.empleados.find((x) => x.id === S.liqEmp); if (!e) return; S.finiquitos.push({ id: uid(), fecha: st.salida, emp: JSON.parse(JSON.stringify(e)), opt: JSON.parse(JSON.stringify(st)), res: calc() }); App.save(); App.render(); App.toast('Liquidación guardada'); };
    $$('.list tbody tr', host).forEach((tr) => tr.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; const f = S.finiquitos.find((x) => x.id === tr.dataset.id);
      if (b.dataset.a === 'print') App.print(finiqHTML(f));
      if (b.dataset.a === 'del') { S.finiquitos = S.finiquitos.filter((x) => x !== f); App.save(); App.render(); App.toast('Liquidación eliminada', () => { S.finiquitos.push(f); App.save(); App.render(); }); } }));
    draw();
  }

  function utilidades(host) {
    const S = App.S, u = S.utilidades;
    const filas = () => S.empleados.map((e) => {
      const ini = e.ingreso > `${u.anio}-01-01` ? e.ingreso : `${u.anio}-01-01`;
      const dias = e.ingreso > `${u.anio}-12-31` ? 0 : Math.min(360, EC.d360(ini, `${u.anio}-12-31`));
      return { id: e.id, dias, cargas: +e.cargas || 0 };
    });
    host.innerHTML = `<div class="cols2 start"><section class="card"><h2>Utilidad del ejercicio</h2><p class="sub">El 15% de la utilidad líquida se reparte: 10% por días trabajados y 5% por cargas familiares.</p><div class="grid2">
      <label>Ejercicio fiscal<input type="number" id="anio" value="${u.anio}" step="1"></label><label>Utilidad líquida (USD)<span class="cur"><i>$</i><input type="number" id="val" min="0" step="0.01" value="${u.valor}"></span></label></div>
      <div class="split big" id="sp"></div><ul class="legend inline" id="lg"></ul></section><section class="card sticky"><h2>Resumen</h2><dl class="rows" id="rs"></dl><p class="hint">Las cargas familiares y los días se toman de la ficha de cada empleado. La ley fija topes por salario digno; confirma con tu contador.</p></section></div>
      <section class="card"><h2>Reparto por empleado</h2><div class="tablewrap flat"><table class="list" id="tt"></table></div></section>`;
    const draw = () => {
      const f = filas(), r = EC.utilidades(u.valor, f, S.cfg);
      $('#rs', host).innerHTML = `<dt>Utilidad líquida</dt><dd data-v="${u.valor}">$0.00</dd><dt>15% a repartir</dt><dd class="tot" data-v="${r.total}">$0.00</dd><dt>10% por días trabajados</dt><dd data-v="${r.p10}">$0.00</dd><dt>5% por cargas familiares</dt><dd data-v="${r.p5}">$0.00</dd>`;
      $$('#rs [data-v]', host).forEach((d) => App.setNum(d, +d.dataset.v));
      const tot = r.total || 1; $('#sp', host).innerHTML = `<i style="width:${(r.p10 / tot) * 100}%;background:var(--c-neto)"></i><i style="width:${(r.p5 / tot) * 100}%;background:var(--c-pat)"></i>`;
      $('#lg', host).innerHTML = `<li><i style="background:var(--c-neto)"></i>Por días <b>${money(r.p10)}</b></li><li><i style="background:var(--c-pat)"></i>Por cargas <b>${money(r.p5)}</b></li>`;
      $('#tt', host).innerHTML = `<thead><tr><th class="l">Empleado</th><th>Días</th><th>Cargas</th><th>Por días</th><th>Por cargas</th><th>Total</th></tr></thead><tbody>${r.filas.map((x) => { const e = S.empleados.find((y) => y.id === x.id); const ff = f.find((y) => y.id === x.id);
        return `<tr><td class="l"><b>${esc(e.nombre)}</b></td><td>${ff.dias}</td><td>${ff.cargas}</td><td>${money(x.porDias)}</td><td>${money(x.porCargas)}</td><td><b>${money(x.total)}</b></td></tr>`; }).join('') || '<tr><td colspan="6" class="empty">Sin empleados</td></tr>'}</tbody>`;
      if (r.sinCargas) $('#rs', host).insertAdjacentHTML('beforeend', `<dt>Sin cargas registradas</dt><dd>${money(r.sinCargas)} sin repartir</dd>`);
    };
    $('#anio', host).oninput = (e) => { u.anio = +e.target.value; App.save(); draw(); };
    $('#val', host).oninput = (e) => { u.valor = +e.target.value; App.save(); draw(); };
    draw();
  }
})();
