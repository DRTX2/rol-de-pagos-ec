/* Cumplimiento legal, herramientas y ajustes */
(function () {
  'use strict';
  const App = window.App, EC = App.EC, { $, $$, esc, money, icon } = App;

  /* ---------- Cumplimiento ---------- */
  const LEGAL = [
    ['Antes de contratar', [
      ['RUC activo del empleador', 'Se obtiene en el SRI. Sin RUC no se puede facturar ni registrar empleados.', 'Ley de Registro Único de Contribuyentes'],
      ['Definir el régimen tributario (RIMPE emprendedor, negocio popular o general)', 'Cambia las declaraciones y la obligación de retener.', 'Ley de Régimen Tributario Interno'],
      ['Registrarse como empleador en el IESS', 'Clave de empleador para avisos de entrada y planillas.', 'Ley de Seguridad Social'],
      ['Contrato escrito y registrado en el SUT del Ministerio de Trabajo', 'Se registra en línea dentro de 30 días desde su firma.', 'Código del Trabajo, art. 19 y 21'],
      ['Aviso de entrada al IESS', 'Dentro de los 3 primeros días de iniciada la relación laboral.', 'Ley de Seguridad Social, art. 73'],
      ['Reglamento interno de trabajo (10 o más trabajadores)', 'Se aprueba ante el Ministerio de Trabajo.', 'Código del Trabajo, art. 64'],
      ['Reglamento de higiene y seguridad; comité paritario desde 15 trabajadores', 'Prevención de riesgos laborales.', 'Código del Trabajo, art. 434'],
      ['Cuota de personas con discapacidad: 4% desde 25 trabajadores', 'Contratación inclusiva y registrada.', 'Código del Trabajo, art. 42'],
    ]],
    ['Cada mes', [
      ['Rol de pagos firmado por cada trabajador', 'Respaldo del pago y del gasto deducible. Este sistema lo imprime con firma y valor en letras.', 'Código del Trabajo y Reglamento a la LRTI'],
      ['Pagar la remuneración mensual completa', 'El pago por transferencia deja constancia.', 'Código del Trabajo, art. 83'],
      ['Planilla IESS pagada a tiempo', 'Aporte personal 9,45% y patronal 11,15%, más SECAP e IECE.', 'Ley de Seguridad Social'],
      ['Declaración de IVA y retenciones (formularios 104 y 103)', 'Mensual o semestral según el régimen.', 'Ley de Régimen Tributario Interno'],
      ['Retener impuesto a la renta si el ingreso anual proyectado supera la fracción básica', 'Se proyecta el año, se resta la rebaja por la proyección de gastos personales que entrega el trabajador y se declara en el formulario 103.', 'Reglamento a la LRTI'],
      ['Registrar y autorizar las horas extras', 'Máximo 4 horas al día y 12 a la semana.', 'Código del Trabajo, art. 55'],
      ['Jornada de 8 horas diarias, 40 semanales, con 2 días de descanso', 'Excepciones por turnos o trabajos especiales.', 'Código del Trabajo, art. 47 y 50'],
    ]],
    ['Cada año', [
      ['Décimo tercero: pagar hasta el 24 de diciembre', 'Un doceavo de lo ganado entre el 1 de diciembre y el 30 de noviembre.', 'Código del Trabajo, art. 111'],
      ['Décimo cuarto: Sierra y Oriente hasta el 15 de agosto; Costa y Galápagos hasta el 15 de marzo', 'Equivale a un SBU, proporcional al tiempo trabajado.', 'Código del Trabajo, art. 113'],
      ['Fondos de reserva desde el segundo año', '8,33% mensual; se paga cada mes o se deposita en el IESS a pedido del trabajador.', 'Código del Trabajo, art. 196'],
      ['Participación de utilidades (15%) hasta el 15 de abril', '10% para los trabajadores y 5% para sus cargas.', 'Código del Trabajo, art. 97'],
      ['Vacaciones: 15 días anuales, más 1 día por año desde el quinto', 'Mantén un registro de las tomadas y pendientes.', 'Código del Trabajo, art. 69 y 71'],
      ['Formulario 107 y anexo RDEP en enero', 'Entrega el comprobante 107 a cada trabajador y presenta el anexo; el calendario se escalona por el noveno dígito del RUC.', 'LRTI, art. 50, y resoluciones SRI'],
      ['Verificar el salario digno', 'Si la utilidad no alcanza, se complementa en el pago de utilidades.', 'Código del Trabajo, art. 97 y 98'],
    ]],
    ['Situaciones especiales', [
      ['Licencia de maternidad: 12 semanas; lactancia: 1 hora diaria hasta los 12 meses', 'Estabilidad desde el embarazo.', 'Código del Trabajo, art. 152 y 155'],
      ['Licencia de paternidad: 10 días', 'Más días en casos de nacimiento múltiple, prematuro o con complicaciones.', 'Código del Trabajo, art. 152'],
      ['Finiquito legalizado ante el Ministerio de Trabajo', 'Se calcula con el módulo «Liquidaciones».', 'Código del Trabajo, art. 184-188'],
      ['Desahucio: aviso con 15 días y bonificación del 25% por año', 'Aplica al desahucio y al despido intempestivo.', 'Código del Trabajo, art. 184-185'],
    ]],
    ['Facturación y comprobantes', [
      ['Facturación electrónica con firma y autorización del SRI', 'Una factura por cada venta; conserva los XML 7 años.', 'Reglamento de Comprobantes de Venta'],
      ['Guía de remisión para trasladar bienes', 'Obligatoria para sustentar el transporte de mercadería.', 'Reglamento de Comprobantes de Venta'],
      ['Nota de crédito para devoluciones, descuentos o anulaciones posteriores', 'Siempre cita la factura original.', 'Reglamento de Comprobantes de Venta'],
      ['Nota de débito para cobrar valores adicionales', 'Intereses, gastos de cobranza. Cita la factura original.', 'Reglamento de Comprobantes de Venta'],
      ['Comprobantes de retención si eres agente de retención', 'Se emiten dentro de 5 días hábiles del registro de la compra.', 'Reglamento de Comprobantes de Venta'],
      ['Liquidación de compra a proveedores sin RUC', 'Para quien no está obligado a facturar.', 'Reglamento de Comprobantes de Venta'],
    ]],
  ];
  let soloPend = false;
  App.views.legal = (v) => {
    const S = App.S, total = LEGAL.reduce((a, g) => a + g[1].length, 0);
    const done = Object.keys(S.checks).filter((k) => S.checks[k]).length, pct = Math.round((done / total) * 100);
    v.innerHTML = `<div class="head"><div><h1>Cumplimiento legal</h1><p class="sub">Lo que debes tener al día con el Ministerio de Trabajo, el IESS y el SRI. Marca lo que ya cumpliste.</p></div>
      <div class="row"><label class="check inline"><input type="checkbox" id="pend" ${soloPend ? 'checked' : ''}> Solo pendientes</label><button class="btn ghost" id="vaciar">${icon('trash')}Vaciar</button></div></div>
      <div class="note">Resumen educativo del Código del Trabajo y normativa SRI/IESS. Las fechas y porcentajes cambian: confirma en fuentes oficiales o con un contador.</div>
      <section class="card prog"><div class="ring" style="--p:${pct}"><b id="pc">0</b><small>%</small></div><div><h2>${done} de ${total} puntos cumplidos</h2><p class="sub">${pct === 100 ? 'Todo al día.' : `Faltan ${total - done}. Empieza por los de «Cada mes».`}</p></div></section>
      <div class="cols">${LEGAL.map((g, gi) => { const gd = g[1].filter((_, ii) => S.checks[`${gi}-${ii}`]).length;
        return `<section class="card"><div class="row between"><h2>${g[0]}</h2><span class="tag ${gd === g[1].length ? 'ok' : ''}">${gd}/${g[1].length}</span></div>${g[1].map((it, ii) => { const id = `${gi}-${ii}`; if (soloPend && S.checks[id]) return '';
          return `<label class="chk ${S.checks[id] ? 'done' : ''}"><input type="checkbox" data-c="${id}" ${S.checks[id] ? 'checked' : ''}><span class="box">${icon('check')}</span><span class="tx"><b>${esc(it[0])}</b><small>${esc(it[1])}</small><em>${esc(it[2])}</em></span></label>`; }).join('')}</section>`; }).join('')}</div>`;
    App.setNum($('#pc', v), pct, (n) => String(Math.round(n)));
    $('#pend').onchange = (e) => { soloPend = e.target.checked; App.render(); };
    $('#vaciar').onclick = () => App.clearModule('checklist');
    $$('[data-c]', v).forEach((i) => (i.onchange = () => { S.checks[i.dataset.c] = i.checked; App.save(); const y = scrollY; App.render(); scrollTo(0, y); }));
  };

  /* ---------- Herramientas ---------- */
  App.views.herramientas = (v) => {
    const S = App.S;
    v.innerHTML = `<div class="head"><div><h1>Herramientas</h1><p class="sub">Validadores y calculadoras rápidas.</p></div></div>
      <div class="cols"><section class="card"><h2>Validar cédula o RUC</h2><label>Número<input id="vn" inputmode="numeric" maxlength="13" placeholder="10 dígitos (cédula) o 13 (RUC)"></label><div id="vr" class="result"></div></section>
      <section class="card"><h2>Verificar clave de acceso</h2><label>Clave de 49 dígitos<input id="ck" inputmode="numeric" maxlength="49" placeholder="Pega la clave de acceso de un comprobante"></label><div id="cr" class="result"></div></section>
      <section class="card"><h2>Hora extra</h2><div class="grid2"><label>Salario mensual<input id="qs" type="number" value="${S.cfg.sbu}"></label><label>Horas<input id="qh" type="number" value="1" min="0"></label>
        <label class="span2">Tipo<select id="qt"><option value="suplementaria">Suplementaria (hasta medianoche)</option><option value="extraordinaria">Extraordinaria (madrugada, fines de semana y feriados)</option><option value="nocturno">Recargo nocturno (19h00 a 06h00)</option></select></label></div><div id="qr" class="result"></div></section>
      <section class="card"><h2>Retención de renta mensual</h2><div class="grid2"><label>Ingreso mensual gravado (USD)<input id="rs" type="number" value="2000"></label><label>Gastos personales al año (USD)<input id="rg" type="number" value="0"></label><label>Cargas familiares<input id="rc" type="number" value="0"></label></div><div id="rr" class="result"></div></section>
      <section class="card"><h2>Tabla del SRI</h2><div id="rt"></div></section></div>`;
    $('#vn').oninput = (e) => { const x = e.target.value.trim(), o = $('#vr');
      if (!x) { o.innerHTML = ''; return; }
      if (x.length <= 10) { const ok = EC.cedulaValida(x); o.innerHTML = x.length < 10 ? '<p class="sub">Sigue escribiendo…</p>' : `<span class="tag ${ok ? 'ok' : 'bad'}">${ok ? 'Cédula válida' : 'Cédula inválida'}</span>`; return; }
      const r = EC.validarRUC(x); o.innerHTML = `<span class="tag ${r.valido ? 'ok' : 'bad'}">${r.valido ? 'RUC válido' : 'RUC inválido'}</span><p class="sub">${esc(r.tipo || '')} ${esc(r.motivo)}<br>Valida la estructura; el SRI confirma si está activo.</p>`; };
    $('#ck').oninput = (e) => { const c = e.target.value.trim(), o = $('#cr');
      if (!c) { o.innerHTML = ''; return; }
      if (c.length < 49) { o.innerHTML = `<p class="sub">${c.length}/49 dígitos</p>`; return; }
      const ok = EC.claveValida(c), tipo = Object.entries(EC.TIPO_DOC).find(([, n]) => n === c.slice(8, 10));
      o.innerHTML = `<span class="tag ${ok ? 'ok' : 'bad'}">${ok ? 'Dígito verificador correcto' : 'Dígito verificador incorrecto'}</span><dl class="rows"><dt>Fecha</dt><dd>${c.slice(0, 2)}/${c.slice(2, 4)}/${c.slice(4, 8)}</dd><dt>Tipo</dt><dd>${tipo ? tipo[0] : c.slice(8, 10)}</dd><dt>RUC emisor</dt><dd>${c.slice(10, 23)}</dd><dt>Ambiente</dt><dd>${c[23] === '2' ? 'Producción' : 'Pruebas'}</dd><dt>Serie</dt><dd>${c.slice(24, 27)}-${c.slice(27, 30)}</dd><dt>Secuencial</dt><dd>${c.slice(30, 39)}</dd></dl>`; };
    const q = () => { const vh = $('#qs').value / S.cfg.horasMes, r = S.cfg.regimenes.ct, rec = r[$('#qt').value], mult = $('#qt').value === 'nocturno' ? rec / 100 : 1 + rec / 100;
      $('#qr').innerHTML = `<dl class="rows"><dt>Valor de la hora (salario ÷ ${S.cfg.horasMes})</dt><dd>${money(vh)}</dd><dt>Valor de la hora extra</dt><dd>${money(vh * mult)}</dd><dt class="tot">Total a pagar</dt><dd class="tot">${money(vh * mult * $('#qh').value)}</dd></dl>`; };
    ['qs', 'qh', 'qt'].forEach((id) => ($('#' + id).oninput = q)); q();
    const r = () => { const a = +$('#rs').value || 0, iess = EC.r2((a * S.cfg.iessPersonal) / 100), x = EC.retencionMensual(a, iess, +$('#rg').value || 0, +$('#rc').value || 0, S.cfg);
      $('#rr').innerHTML = `<dl class="rows"><dt>Base anual (ingreso − IESS) × 12</dt><dd>${money(x.base)}</dd><dt>Impuesto causado según la tabla</dt><dd>${money(x.impuestoAnual)}</dd><dt>Gasto permitido (tope ${money(x.tope)})</dt><dd>${money(x.permitido)}</dd><dt>Rebaja ${S.cfg.rebajaGastos}%</dt><dd>${money(x.rebaja)}</dd><dt class="tot">Retención mensual</dt><dd class="tot">${money(x.mensual)}</dd></dl>`;
      $('#rt').innerHTML = App.irTableHTML(x.base, +$('#rc').value || 0); };
    ['rs', 'rg', 'rc'].forEach((id) => ($('#' + id).oninput = r)); r();
  };

  /* ---------- Ajustes ---------- */
  let tab = 'datos';
  App.views.ajustes = (v) => {
    const S = App.S;
    v.innerHTML = `<div class="head"><div><h1>Ajustes y datos</h1><p class="sub">Empresa, parámetros legales y administración de la información.</p></div></div>
      <div class="seg wide">${[['datos', 'Datos'], ['empresa', 'Empresa'], ['params', 'Parámetros legales']].map(([k, l]) => `<button data-t="${k}" class="${tab === k ? 'on' : ''}">${l}</button>`).join('')}</div><div id="tb"></div>`;
    $$('.seg button', v).forEach((b) => (b.onclick = () => { tab = b.dataset.t; App.render(); }));
    ({ datos, empresa, params })[tab]($('#tb', v));
  };
  function datos(h) {
    const S = App.S;
    h.innerHTML = `<section class="card"><h2>Datos por módulo</h2><p class="sub">Vacía un módulo a la vez. Después de cada borrado puedes deshacer durante unos segundos.</p><ul class="mods">
      ${Object.entries(App.MODULOS).map(([k, m]) => `<li><div><b>${m.nombre}</b><small>${m.desc}</small></div><span class="tag">${m.count(S)} registro${m.count(S) === 1 ? '' : 's'}</span><button class="btn sm danger" data-k="${k}">${icon('trash')}Vaciar</button></li>`).join('')}</ul></section>
      <div class="cols"><section class="card"><h2>Demostración</h2><p class="sub">Empresa ficticia con 8 empleados, 10 meses de roles, liquidación, catálogo y comprobantes.</p><div class="row"><button class="btn primary" id="demo">Cargar datos de demostración</button></div><p class="hint">Reemplaza lo que tengas guardado.</p></section>
      <section class="card"><h2>Respaldo</h2><p class="sub">Los datos viven solo en este navegador. Descarga un archivo para llevarlos a otro equipo.</p><div class="row"><button class="btn" id="bk">${icon('down')}Descargar respaldo</button><label class="btn" tabindex="0">${icon('up')}Restaurar<input type="file" id="rs" accept=".json" hidden></label></div></section></div>
      <section class="card danger-zone"><div class="row between"><div><h2>Borrar todo</h2><p class="sub">Elimina la información de todos los módulos y restaura parámetros.</p></div><button class="btn danger-solid" id="all">Borrar todos los datos</button></div></section>`;
    $$('[data-k]', h).forEach((b) => (b.onclick = () => App.clearModule(b.dataset.k)));
    $('#demo').onclick = async () => { if (!S.empleados.length && !S.docs.length || await App.confirm({ title: 'Cargar demostración', text: 'Se reemplazan tus datos actuales.', ok: 'Cargar' })) { App.seedDemo(); App.render(); App.toast('Demo cargada'); } };
    $('#bk').onclick = () => App.download(`rol-pagos-respaldo-${S.periodo}.json`, JSON.stringify(S, null, 2), 'application/json');
    $('#rs').onchange = (ev) => { const f = ev.target.files[0]; if (!f) return; f.text().then((t) => { try { App.replace(JSON.parse(t)); App.render(); App.toast('Respaldo restaurado'); } catch (e) { App.toast('El archivo no es un respaldo válido'); } }); };
    $('#all').onclick = App.clearAll;
  }
  function empresa(h) {
    const S = App.S, E = S.empresa, f = (id, l, ph = '') => `<label>${l}<input id="${id}" value="${esc(E[id] || '')}" placeholder="${ph}"></label>`;
    h.innerHTML = `<section class="card"><h2>Datos del emisor</h2><div class="grid2"><label class="span2">Razón social<input id="nombre" value="${esc(E.nombre)}"></label>
      <label>RUC<input id="ruc" maxlength="13" inputmode="numeric" value="${esc(E.ruc)}"><small id="rm"></small></label>${f('regimen', 'Régimen tributario', 'General, RIMPE…')}<label class="span2">Dirección matriz<input id="direccion" value="${esc(E.direccion)}"></label>
      ${f('establecimiento', 'Establecimiento (3 dígitos)')}${f('punto', 'Punto de emisión (3 dígitos)')}<label>Ambiente<select id="ambiente"><option value="1" ${E.ambiente === '1' ? 'selected' : ''}>Pruebas</option><option value="2" ${E.ambiente === '2' ? 'selected' : ''}>Producción</option></select></label></div></section>`;
    const chk = () => { const r = EC.validarRUC($('#ruc', h).value); $('#rm', h).innerHTML = !$('#ruc', h).value ? '' : r.valido ? `<span class="good">${esc(r.tipo)}: válido</span>` : `<span class="bad">${esc(r.motivo)}</span>`; };
    $$('input,select', h).forEach((i) => (i.oninput = i.onchange = () => { E[i.id] = i.value; App.save(); $('#empresaLabel').textContent = E.nombre || 'Sin empresa configurada'; if (i.id === 'ruc') chk(); }));
    chk();
  }
  function params(h) {
    const c = App.S.cfg, f = (k, l, st = 'any') => `<label>${l}<input type="number" step="${st}" data-cfg="${k}" value="${c[k]}"></label>`;
    h.innerHTML = `<div class="note"><b>Verificados en octubre de 2026</b> con prensa y firmas legales (no con el SRI directamente): SBU $482 (Consejo Nacional de Trabajo y Salarios, 15-dic-2025) · IESS 9,45% personal y 11,15% patronal · SECAP 0,5% e IECE 0,5% · IVA 15% (circular SRI NAC-DGECCGC25-00000006) · tabla de renta 2026 (resolución NAC-DGERCGC25-00000043).<br><b>Para confirmar con tu contador:</b> canasta básica $821,80, topes de gastos personales por cargas y rebaja del 18%, porque las fuentes no coinciden del todo.</div>
      <div class="cols"><section class="card"><h2>Generales</h2><div class="grid2">${f('sbu', 'SBU (salario básico)')}${f('horasMes', 'Horas por mes', '1')}${f('diasMes', 'Días por mes', '1')}${f('iva', 'IVA (%)')}</div></section>
      <section class="card"><h2>Aportes y fondos (%)</h2><div class="grid2">${f('iessPersonal', 'IESS personal')}${f('iessPatronal', 'IESS patronal')}${f('secap', 'SECAP')}${f('iece', 'IECE')}${f('fondosReserva', 'Fondos de reserva')}${f('rebajaGastos', 'Rebaja por gastos personales')}${f('topeIngresos', 'Tope de gastos (% de ingresos)')}${f('canasta', 'Canasta familiar básica (USD)')}</div></section></div>
      <section class="card"><h2>Regímenes y recargos de horas extras (%)</h2><div class="tablewrap flat"><table class="list"><thead><tr><th class="l">Régimen</th><th>Suplementaria</th><th>Extraordinaria</th><th>Nocturno</th></tr></thead><tbody>${Object.entries(c.regimenes).map(([k, r]) => `<tr><td class="l">${esc(r.nombre)}</td>${['suplementaria', 'extraordinaria', 'nocturno'].map((x) => `<td><input type="number" data-reg="${k}.${x}" value="${r[x]}"></td>`).join('')}</tr>`).join('')}</tbody></table></div></section>
      <section class="card"><h2>Tope de gastos personales por cargas familiares</h2><p class="sub">Número de canastas básicas deducibles según las cargas del empleado.</p><div class="tablewrap flat"><table class="list"><thead><tr>${c.canastas.map((_, i) => `<th>${i === c.canastas.length - 1 ? i + ' o más' : i + ' cargas'}</th>`).join('')}</tr></thead><tbody><tr>${c.canastas.map((k, i) => `<td><input type="number" data-can="${i}" value="${k}"></td>`).join('')}</tr></tbody></table></div></section>
      <section class="card"><h2>Tabla de impuesto a la renta (anual)</h2><div class="tablewrap flat"><table class="list"><thead><tr><th>Fracción básica</th><th>Exceso hasta</th><th>Impuesto base</th><th>% excedente</th></tr></thead><tbody>${c.irTabla.map((t, i) => `<tr><td>${money(t.desde)}</td><td>${t.hasta === null ? 'en adelante' : money(t.hasta)}</td><td><input type="number" data-ir="${i}.base" value="${t.base}"></td><td><input type="number" data-ir="${i}.pct" value="${t.pct}"></td></tr>`).join('')}</tbody></table></div></section>
      <div class="row"><button class="btn danger" id="rst">Restaurar valores 2026</button></div>`;
    $$('[data-cfg]', h).forEach((i) => (i.oninput = () => { c[i.dataset.cfg] = +i.value; App.save(); }));
    $$('[data-reg]', h).forEach((i) => (i.oninput = () => { const [k, x] = i.dataset.reg.split('.'); c.regimenes[k][x] = +i.value; App.save(); }));
    $$('[data-can]', h).forEach((i) => (i.oninput = () => { c.canastas[+i.dataset.can] = +i.value; App.save(); }));
    $$('[data-ir]', h).forEach((i) => (i.oninput = () => { const [k, x] = i.dataset.ir.split('.'); c.irTabla[+k][x] = +i.value; App.save(); }));
    $('#rst').onclick = () => App.clearModule('params');
  }
})();
