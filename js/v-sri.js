/* Simulador de comprobantes SRI + catálogo de clientes y productos */
(function () {
  'use strict';
  const App = window.App, EC = App.EC, { $, $$, esc, money, icon, uid } = App;

  const TIPOS = {
    factura: { n: 'Factura', cls: 'fa' },
    notaCredito: { n: 'Nota de crédito', cls: 'nc' },
    notaDebito: { n: 'Nota de débito', cls: 'nd' },
    guia: { n: 'Guía de remisión', cls: 'gr' },
    retencion: { n: 'Retención', cls: 'rt' },
  };
  const RETENCIONES = {
    renta: [['303', 'Honorarios profesionales', 10], ['304', 'Servicios donde predomina el intelecto', 8], ['307', 'Servicios donde predomina la mano de obra', 2], ['310', 'Transporte privado de carga', 1], ['312', 'Transferencia de bienes muebles', 1.75], ['320', 'Arrendamiento de inmuebles', 10], ['343', 'Otras retenciones', 2.75]],
    iva: [['9', 'Retención 10% del IVA', 10], ['10', 'Retención 20% del IVA', 20], ['1', 'Retención 30% del IVA', 30], ['2', 'Retención 70% del IVA', 70], ['3', 'Retención 100% del IVA', 100]],
  };
  const MOTIVOS_GUIA = ['Venta', 'Compra', 'Consignación', 'Traslado entre establecimientos', 'Devolución', 'Importación'];
  const IDTIPO = { ruc: 'RUC', cedula: 'Cédula', pasaporte: 'Pasaporte', final: 'Consumidor final' };
  const pad9 = (n) => String(n).padStart(9, '0');
  const rand8 = () => String(Math.floor(Math.random() * 1e8)).padStart(8, '0');

  const sri = (App.sri = {});
  sri.refDe = (d) => ({ docId: d.id, numero: d.numero, fecha: d.fecha, total: d.totales.total, tipo: d.tipo });
  sri.emitir = (draft, estado = 'autorizado') => {
    const S = App.S, E = S.empresa, tipo = draft.tipo;
    const seq = (S.seq[tipo] || 0) + 1; S.seq[tipo] = seq;
    const serie = `${E.establecimiento}${E.punto}`;
    const ruc = /^\d{13}$/.test(E.ruc) ? E.ruc : '0000000000001';
    const d = Object.assign({ id: uid(), estado, items: [] }, draft, {
      secuencial: seq, numero: `${E.establecimiento}-${E.punto}-${pad9(seq)}`, ambiente: E.ambiente,
      clave: EC.claveAcceso({ fecha: draft.fecha, tipo, ruc, ambiente: E.ambiente, serie, secuencial: seq, codigo: rand8(), emision: '1' }),
    });
    if (tipo === 'retencion') {
      d.lineas = d.lineas.map((l) => Object.assign({}, l, { valor: EC.r2((l.base * l.pct) / 100) }));
      const tot = EC.r2(d.lineas.reduce((a, l) => a + l.valor, 0));
      d.totales = { total: tot, renta: EC.r2(d.lineas.filter((l) => l.impuesto === 'renta').reduce((a, l) => a + l.valor, 0)), iva: EC.r2(d.lineas.filter((l) => l.impuesto === 'iva').reduce((a, l) => a + l.valor, 0)) };
    } else if (tipo === 'guia') d.totales = { total: 0 };
    else d.totales = EC.totalesDoc(d.items, S.cfg.iva);
    if (estado === 'autorizado') d.fechaAut = draft.fecha;
    S.docs.push(d); App.save();
    return d;
  };

  /* ---------- Vista de comprobante (RIDE) ---------- */
  function barcode(clave) {
    let x = 0, out = '';
    for (const ch of clave) { const n = +ch; const w = 1 + (n % 3); out += `<rect x="${x}" y="0" width="${w}" height="34"/>`; x += w + 1 + ((n * 7) % 2); }
    return `<svg viewBox="0 0 ${x} 34" preserveAspectRatio="none" class="barcode">${out}</svg>`;
  }
  function rideHTML(d) {
    const E = App.S.empresa, T = TIPOS[d.tipo], r = d.receptor || {};
    const refl = d.ref ? `<p class="ride-ref"><b>${d.tipo === 'retencion' ? 'Comprobante que se retiene' : 'Comprobante que se modifica / sustenta'}:</b> ${esc(d.ref.numero)} · ${esc(d.ref.fecha)}</p>` : '';
    let body = '';
    if (d.tipo === 'retencion') {
      body = `<table><thead><tr><th>Impuesto</th><th>Código</th><th>Base imponible</th><th>%</th><th>Valor retenido</th></tr></thead><tbody>${d.lineas.map((l) => `<tr><td>${l.impuesto === 'renta' ? 'Renta' : 'IVA'}</td><td>${esc(l.codigo)}</td><td>${money(l.base)}</td><td>${l.pct}%</td><td>${money(l.valor)}</td></tr>`).join('')}</tbody></table>
        <dl class="ride-tot"><dt>Total retenido</dt><dd>${money(d.totales.total)}</dd></dl>`;
    } else if (d.tipo === 'guia') {
      const g = d.guia || {};
      body = `<p><b>Motivo:</b> ${esc(d.motivo)} · <b>Transportista:</b> ${esc(g.transportista)} (${esc(g.transportistaId)}) · <b>Placa:</b> ${esc(g.placa)}</p>
        <p><b>Punto de partida:</b> ${esc(g.partida)}<br><b>Destino:</b> ${esc(g.llegada)}<br><b>Traslado:</b> ${esc(g.ini)} al ${esc(g.fin)}</p>
        <table><thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th></tr></thead><tbody>${d.items.map((i) => `<tr><td>${esc(i.cod)}</td><td>${esc(i.desc)}</td><td>${i.cant}</td></tr>`).join('')}</tbody></table>`;
    } else {
      const t = d.totales;
      body = `${d.motivo ? `<p><b>Motivo:</b> ${esc(d.motivo)}</p>` : ''}<table><thead><tr><th>Código</th><th>Descripción</th><th>Cant.</th><th>P. unit.</th><th>Desc.</th><th>IVA</th><th>Total</th></tr></thead><tbody>
        ${d.items.map((i) => `<tr><td>${esc(i.cod)}</td><td>${esc(i.desc)}</td><td>${i.cant}</td><td>${money(i.precio)}</td><td>${money(i.descuento)}</td><td>${i.iva}%</td><td>${money(i.cant * i.precio - (i.descuento || 0))}</td></tr>`).join('')}</tbody></table>
        <dl class="ride-tot"><dt>Subtotal ${App.S.cfg.iva}%</dt><dd>${money(t.subIva)}</dd><dt>Subtotal 0%</dt><dd>${money(t.sub0)}</dd><dt>Descuento</dt><dd>${money(t.descuento)}</dd><dt>IVA ${App.S.cfg.iva}%</dt><dd>${money(t.iva)}</dd><dt class="big">Valor total</dt><dd class="big">${money(t.total)}</dd></dl>
        ${d.formaPago ? `<p><b>Forma de pago:</b> ${esc(d.formaPago)}</p>` : ''}`;
    }
    return `<article class="ride">
      <div class="ride-mark">SIMULACIÓN ACADÉMICA · SIN VALIDEZ TRIBUTARIA</div>
      <header class="ride-head"><div><h2>${esc(E.nombre || 'Emisor')}</h2><p>RUC ${esc(E.ruc)}<br>${esc(E.direccion)}<br>Régimen: ${esc(E.regimen || 'General')}</p></div>
        <div class="ride-box"><b>${T.n.toUpperCase()}</b><br>No. ${esc(d.numero)}<br><small>Ambiente: ${d.ambiente === '2' ? 'PRODUCCIÓN' : 'PRUEBAS'} · Emisión normal</small></div></header>
      <p class="ride-key"><b>Clave de acceso / N.º de autorización</b><br><code>${esc(d.clave)}</code>${barcode(d.clave)}</p>
      <p><b>Fecha de emisión:</b> ${esc(d.fecha)}${d.estado === 'autorizado' ? ` · <b>Autorizado (simulado):</b> ${esc(d.fechaAut || d.fecha)}` : ''}</p>
      <p><b>${d.tipo === 'retencion' ? 'Sujeto retenido' : d.tipo === 'guia' ? 'Destinatario' : 'Cliente'}:</b> ${esc(r.nombre)} · ${esc(IDTIPO[r.idTipo] || '')} ${esc(r.ident)}${r.direccion ? `<br>${esc(r.direccion)}` : ''}</p>
      ${refl}${body}</article>`;
  }

  /* ---------- Envío simulado ---------- */
  const ETAPAS = [['Generando XML', 'Estructura del comprobante en formato SRI'], ['Firmando', 'Firma electrónica con certificado .p12'], ['Recepción', 'Validación de esquema y secuencial'], ['Autorización', 'El SRI devuelve el número de autorización'], ['RIDE listo', 'Representación impresa generada']];
  sri.enviar = (id) => {
    const d = App.S.docs.find((x) => x.id === id);
    const E = App.S.empresa;
    if (!EC.validarRUC(E.ruc).valido) { App.toast('Configura un RUC válido del emisor en Ajustes'); return; }
    const dlg = App.modal(`<h3>Enviando ${esc(TIPOS[d.tipo].n)} ${esc(d.numero)}</h3><p class="sub">Simulación del flujo de facturación electrónica del SRI.</p>
      <ol class="flow">${ETAPAS.map((e, i) => `<li data-i="${i}"><i></i><div><b>${e[0]}</b><small>${e[1]}</small></div></li>`).join('')}</ol>
      <div class="row end"><button class="btn primary" id="fin" disabled>Listo</button></div>`);
    const steps = $$('.flow li', dlg); let i = 0;
    const tick = () => {
      if (!steps[0].isConnected && i < steps.length) i = steps.length; // diálogo cerrado: terminar sin animar
      if (i > 0 && i <= steps.length) steps[i - 1].classList.replace('run', 'ok');
      if (i < steps.length) { steps[i].classList.add('run'); i++; setTimeout(tick, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : 650); }
      else {
        d.estado = 'autorizado'; d.fechaAut = d.fechaAut || d.fecha; App.save(); App.render();
        const fin = $('#fin', dlg); // el usuario pudo cerrar el diálogo durante la animación
        if (fin) { steps[steps.length - 1].classList.replace('run', 'ok'); fin.disabled = false; fin.focus(); }
      }
    };
    tick(); $('#fin', dlg).onclick = () => App.closeModal();
  };

  function verDoc(id) {
    const d = App.S.docs.find((x) => x.id === id);
    App.modal(`<div class="row between"><h3>${esc(TIPOS[d.tipo].n)} ${esc(d.numero)}</h3><button class="btn sm" id="x">${icon('x')}Cerrar</button></div>${rideHTML(d)}
      <div class="row end" style="margin-top:14px"><button class="btn primary" id="pp">${icon('print')}Imprimir</button></div>`, { wide: true });
    $('#x').onclick = App.closeModal; $('#pp').onclick = () => App.print(rideHTML(d));
  }

  /* ---------- Listado ---------- */
  let filtro = 'todos', q = '';
  App.views.comprobantes = (v) => {
    const S = App.S, docs = [...S.docs].sort((a, b) => (b.fecha + b.numero).localeCompare(a.fecha + a.numero));
    const mes = S.periodo;
    const delMes = docs.filter((d) => d.fecha.slice(0, 7) === mes && d.estado !== 'anulado');
    const sum = (t, k = 'total') => EC.r2(delMes.filter((d) => d.tipo === t).reduce((a, d) => a + (d.totales[k] || 0), 0));
    const vis = docs.filter((d) => (filtro === 'todos' || d.tipo === filtro) && (!q || (d.numero + d.receptor.nombre + d.clave).toLowerCase().includes(q.toLowerCase())));
    v.innerHTML = `<div class="head"><div><h1>Comprobantes electrónicos</h1><p class="sub">Simulador de facturación del SRI: emite, envía y revisa documentos sin salir del navegador.</p></div>
      <div class="row"><div class="menu"><button class="btn primary" id="nuevo">${icon('plus')}Nuevo comprobante</button><div class="menu-list" id="mnuevo" hidden>${Object.entries(TIPOS).map(([k, t]) => `<button data-n="${k}">${t.n}</button>`).join('')}</div></div>
      <button class="btn ghost" id="vaciar">${icon('trash')}Vaciar</button></div></div>
      <div class="note">Herramienta académica. Los comprobantes no se envían al SRI y no tienen validez tributaria. La clave de acceso sí se calcula con el algoritmo real (49 dígitos, módulo 11).</div>
      <div class="stats"><div class="stat"><span>Facturado en ${App.periodoLabel(mes)}</span><b data-n="${sum('factura', 'subtotal')}">$0.00</b></div><div class="stat"><span>IVA cobrado</span><b data-n="${sum('factura', 'iva')}">$0.00</b></div>
        <div class="stat"><span>Notas de crédito</span><b data-n="${sum('notaCredito')}">$0.00</b></div><div class="stat"><span>Retenciones emitidas</span><b data-n="${sum('retencion')}">$0.00</b></div></div>
      <div class="card"><div class="row between wrap" style="margin-bottom:12px"><div class="chips">${[['todos', 'Todos']].concat(Object.entries(TIPOS).map(([k, t]) => [k, t.n])).map(([k, n]) => `<button class="chip ${filtro === k ? 'on' : ''}" data-f="${k}">${n}</button>`).join('')}</div>
        <label class="search">${icon('search')}<input id="q" placeholder="Buscar por número, cliente o clave" value="${esc(q)}"></label></div>
      ${vis.length ? `<div class="tablewrap flat"><table class="list"><thead><tr><th class="l">Documento</th><th class="l">Fecha</th><th class="l">Cliente / sujeto</th><th>Total</th><th>Estado</th><th></th></tr></thead><tbody>
        ${vis.map((d) => `<tr data-id="${d.id}"><td class="l"><span class="doc ${TIPOS[d.tipo].cls}">${TIPOS[d.tipo].n}</span><br><small>${esc(d.numero)}</small></td><td class="l">${esc(d.fecha)}</td><td class="l">${esc(d.receptor.nombre)}</td>
          <td>${d.tipo === 'guia' ? '—' : money(d.totales.total)}</td><td><span class="tag ${d.estado === 'autorizado' ? 'ok' : d.estado === 'anulado' ? 'bad' : 'warn'}">${d.estado === 'autorizado' ? 'Autorizado' : d.estado === 'anulado' ? 'Anulado' : 'Borrador'}</span></td>
          <td class="acts"><button class="btn sm" data-a="ver">Ver</button>${d.estado === 'borrador' ? `<button class="btn sm primary" data-a="enviar">${icon('send')}Enviar al SRI</button>` : ''}${d.estado === 'autorizado' ? '<button class="btn sm ghost" data-a="anular">Anular</button>' : ''}<button class="btn sm ghost danger" data-a="del" aria-label="Eliminar">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>`
        : `<div class="empty"><b>${S.docs.length ? 'Nada coincide con el filtro' : 'Aún no hay comprobantes'}</b><p>Emite una factura para ver cómo se genera la clave de acceso y el flujo de autorización.</p></div>`}</div>`;
    $$('.stat b[data-n]', v).forEach((b) => App.setNum(b, +b.dataset.n));
    $('#nuevo').onclick = (e) => { e.stopPropagation(); $('#mnuevo').hidden = !$('#mnuevo').hidden; };
    document.addEventListener('click', () => { const m = $('#mnuevo'); if (m) m.hidden = true; }, { once: true });
    $$('#mnuevo button').forEach((b) => (b.onclick = () => formDoc(b.dataset.n)));
    $('#vaciar').onclick = () => App.clearModule('comprobantes');
    $$('.chip', v).forEach((c) => (c.onclick = () => { filtro = c.dataset.f; App.render(); }));
    $('#q').oninput = (e) => { q = e.target.value; const pos = e.target.selectionStart; App.render(); const n = $('#q'); n.focus(); n.setSelectionRange(pos, pos); };
    $$('.list tbody tr', v).forEach((tr) => tr.addEventListener('click', async (e) => {
      const b = e.target.closest('button'); const id = tr.dataset.id; const d = App.S.docs.find((x) => x.id === id);
      if (!b) return verDoc(id);
      if (b.dataset.a === 'ver') verDoc(id);
      if (b.dataset.a === 'enviar') sri.enviar(id);
      if (b.dataset.a === 'anular' && await App.confirm({ title: `Anular ${d.numero}`, text: 'El comprobante queda como anulado; el secuencial no se reutiliza.', ok: 'Anular', danger: true })) { d.estado = 'anulado'; App.save(); App.render(); }
      if (b.dataset.a === 'del' && await App.confirm({ title: `Eliminar ${d.numero}`, text: 'Se borra del simulador.', ok: 'Eliminar', danger: true })) { App.S.docs = App.S.docs.filter((x) => x !== d); App.save(); App.render(); App.toast('Comprobante eliminado'); }
    }));
  };

  /* ---------- Formulario de comprobante ---------- */
  function formDoc(tipo) {
    const S = App.S, T = TIPOS[tipo];
    if (!S.clientes.length) { App.toast('Primero agrega un cliente en «Clientes y productos»'); return App.go('catalogo'); }
    const hoy = new Date().toISOString().slice(0, 10);
    const draft = { tipo, fecha: hoy, receptor: S.clientes[0], formaPago: 'Transferencia', items: [{ cod: '', desc: '', cant: 1, precio: 0, descuento: 0, iva: S.cfg.iva }], motivo: tipo === 'guia' ? 'Venta' : '', ref: null,
      guia: { transportista: '', transportistaId: '', placa: '', partida: S.empresa.direccion, llegada: '', ini: hoy, fin: hoy }, lineas: [{ impuesto: 'renta', codigo: '312', base: 0, pct: 1.75 }], periodoFiscal: `${hoy.slice(5, 7)}/${hoy.slice(0, 4)}` };
    const facturas = S.docs.filter((d) => d.tipo === 'factura' && d.estado === 'autorizado');
    const d = App.modal(`<div class="row between"><h3>Nuevo comprobante · ${T.n}</h3><button class="btn sm ghost" id="x">${icon('x')}Cerrar</button></div><div class="docform"><div id="fm"></div><aside class="sumbox" id="sum"></aside></div>`, { wide: true });
    $('#x', d).onclick = App.closeModal;
    const fm = $('#fm', d), sum = $('#sum', d);
    const opts = (arr, sel) => arr.map(([v, t]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(t)}</option>`).join('');
    const needRef = tipo === 'notaCredito' || tipo === 'notaDebito';
    const render = () => {
      const refSel = tipo === 'retencion' ? '' : `<label class="${needRef ? '' : ''}">${needRef ? 'Factura que modifica' : 'Factura de sustento (opcional)'}<select id="ref"><option value="">${needRef ? 'Selecciona…' : 'Sin factura'}</option>${facturas.map((f) => `<option value="${f.id}" ${draft.ref && draft.ref.docId === f.id ? 'selected' : ''}>${esc(f.numero)} · ${esc(f.receptor.nombre)} · ${money(f.totales.total)}</option>`).join('')}</select></label>`;
      fm.innerHTML = `<div class="grid2"><label>Fecha de emisión<input type="date" id="fecha" value="${draft.fecha}"></label>
        <label>${tipo === 'retencion' ? 'Proveedor (sujeto retenido)' : 'Cliente'}<select id="cli">${opts(S.clientes.map((c) => [c.id, `${c.nombre} · ${c.ident}`]), draft.receptor.id)}</select></label>
        ${tipo === 'factura' ? `<label>Forma de pago<select id="fp">${opts(['Efectivo', 'Transferencia', 'Tarjeta de crédito', 'Tarjeta de débito', 'Crédito 30 días'].map((x) => [x, x]), draft.formaPago)}</select></label>` : ''}
        ${needRef || tipo === 'guia' ? refSel : ''}
        ${needRef ? `<label class="span2">Motivo<input id="mot" placeholder="${tipo === 'notaCredito' ? 'Ej.: devolución de mercadería, descuento posterior' : 'Ej.: intereses por mora, gastos de cobranza'}" value="${esc(draft.motivo)}"></label>` : ''}
        ${tipo === 'guia' ? `<label>Motivo del traslado<select id="mot">${opts(MOTIVOS_GUIA.map((x) => [x, x]), draft.motivo)}</select></label>` : ''}</div>
        ${tipo === 'guia' ? `<div class="grid2"><label>Transportista<input id="g-t" value="${esc(draft.guia.transportista)}"></label><label>Cédula/RUC transportista<input id="g-ti" value="${esc(draft.guia.transportistaId)}"></label><label>Placa<input id="g-p" value="${esc(draft.guia.placa)}" placeholder="ABC-1234"></label><label>Inicio traslado<input type="date" id="g-i" value="${draft.guia.ini}"></label>
          <label>Punto de partida<input id="g-o" value="${esc(draft.guia.partida)}"></label><label>Destino<input id="g-d" value="${esc(draft.guia.llegada)}"></label></div>` : ''}
        ${tipo === 'retencion' ? retHTML() : itemsHTML()}
        <div class="row end" style="margin-top:14px"><button class="btn" id="bor">Guardar borrador</button><button class="btn primary" id="emi">${icon('send')}Emitir y enviar</button></div>`;
      wire(); updateSum();
    };
    const itemsHTML = () => `<h4>${tipo === 'guia' ? 'Bienes a trasladar' : 'Detalle'}</h4><div class="tablewrap flat"><table class="items"><thead><tr><th class="l">Producto</th><th>Cant.</th>${tipo === 'guia' ? '' : '<th>Precio</th><th>Desc. $</th><th>IVA</th>'}<th></th></tr></thead><tbody>
      ${draft.items.map((it, i) => `<tr data-i="${i}"><td class="l"><select data-k="prod"><option value="">${esc(it.desc) || 'Elige o escribe abajo…'}</option>${S.productos.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select><input data-k="desc" value="${esc(it.desc)}" placeholder="Descripción"></td>
        <td><input data-k="cant" type="number" min="0" step="any" value="${it.cant}"></td>${tipo === 'guia' ? '' : `<td><input data-k="precio" type="number" min="0" step="any" value="${it.precio}"></td><td><input data-k="descuento" type="number" min="0" step="any" value="${it.descuento}"></td>
        <td><select data-k="iva"><option value="0" ${+it.iva === 0 ? 'selected' : ''}>0%</option><option value="${S.cfg.iva}" ${+it.iva !== 0 ? 'selected' : ''}>${S.cfg.iva}%</option></select></td>`}
        <td><button class="btn sm ghost danger" data-del aria-label="Quitar línea">${icon('x')}</button></td></tr>`).join('')}</tbody></table></div>
      <div class="row"><button class="btn sm" id="addI">${icon('plus')}Agregar línea</button>${needRef || tipo === 'guia' ? '<button class="btn sm ghost" id="cpy">Copiar ítems de la factura</button>' : ''}</div>`;
    const retHTML = () => `<div class="grid2"><label>Factura del proveedor (sustento)<input id="r-n" placeholder="001-002-000004512" value="${esc(draft.ref?.numero || '')}"></label><label>Fecha de la factura<input type="date" id="r-f" value="${draft.ref?.fecha || hoy}"></label>
      <label>Período fiscal<input id="r-p" value="${esc(draft.periodoFiscal)}"></label></div><h4>Retenciones</h4>
      <div class="tablewrap flat"><table class="items"><thead><tr><th class="l">Impuesto y código</th><th>Base imponible</th><th>%</th><th>Valor</th><th></th></tr></thead><tbody>
      ${draft.lineas.map((l, i) => `<tr data-i="${i}"><td class="l"><select data-k="imp"><option value="renta" ${l.impuesto === 'renta' ? 'selected' : ''}>Renta</option><option value="iva" ${l.impuesto === 'iva' ? 'selected' : ''}>IVA</option></select>
        <select data-k="cod">${RETENCIONES[l.impuesto].map(([c, n, p]) => `<option value="${c}" ${c === l.codigo ? 'selected' : ''}>${c} · ${esc(n)} (${p}%)</option>`).join('')}</select></td>
        <td><input data-k="base" type="number" min="0" step="any" value="${l.base}"></td><td><input data-k="pct" type="number" min="0" step="any" value="${l.pct}"></td><td class="v">${money(EC.r2((l.base * l.pct) / 100))}</td><td><button class="btn sm ghost danger" data-del aria-label="Quitar">${icon('x')}</button></td></tr>`).join('')}</tbody></table></div>
      <div class="row"><button class="btn sm" id="addR">${icon('plus')}Agregar retención</button></div><p class="hint">Códigos y porcentajes referenciales: verifica la tabla vigente del SRI. El porcentaje es editable.</p>`;

    const errores = () => {
      const e = [], E = S.empresa;
      if (!EC.validarRUC(E.ruc).valido) e.push('El RUC del emisor no es válido: corrígelo en Ajustes.');
      if (!draft.receptor) e.push('Selecciona un cliente.');
      if (tipo === 'retencion') {
        if (!draft.ref?.numero) e.push('Ingresa el número de la factura de sustento.');
        if (draft.lineas.every((l) => !(l.base > 0))) e.push('Agrega al menos una retención con base mayor a 0.');
      } else {
        if (!draft.items.some((i) => i.cant > 0 && (tipo === 'guia' || i.precio > 0) && i.desc)) e.push('Agrega al menos una línea con descripción, cantidad' + (tipo === 'guia' ? '.' : ' y precio.'));
        if (needRef && !draft.ref) e.push('Selecciona la factura que se modifica.');
        if (needRef && !draft.motivo.trim()) e.push('Escribe el motivo.');
        if (tipo === 'guia' && !(draft.guia.transportista && draft.guia.placa && draft.guia.llegada)) e.push('Completa transportista, placa y destino.');
        if (tipo === 'notaCredito' && draft.ref) { const t = EC.totalesDoc(draft.items, S.cfg.iva).total; if (t > draft.ref.total + 0.005) e.push(`La nota de crédito (${money(t)}) no puede superar la factura (${money(draft.ref.total)}).`); }
        if (tipo === 'factura' && draft.receptor?.idTipo === 'final' && EC.totalesDoc(draft.items, S.cfg.iva).total > 50) e.push('Consumidor final: el total no puede superar $50; identifica al cliente.');
      }
      return e;
    };
    const updateSum = () => {
      const er = errores();
      if (tipo === 'retencion') { const lo = draft.lineas.map((l) => EC.r2((l.base * l.pct) / 100)); const t = EC.r2(lo.reduce((a, b) => a + b, 0)); sum.innerHTML = `<h4>Resumen</h4><dl><dt>Total retenido</dt><dd class="big"><b id="s-t"></b></dd></dl>${erroresHTML(er)}`; App.setNum($('#s-t', sum), t); return; }
      const t = EC.totalesDoc(draft.items, S.cfg.iva);
      sum.innerHTML = tipo === 'guia' ? `<h4>Resumen</h4><p class="sub">${draft.items.filter((i) => i.cant > 0).length} ítem(s) a trasladar. Las guías no llevan valores.</p>${erroresHTML(er)}`
        : `<h4>Resumen</h4><dl><dt>Subtotal ${S.cfg.iva}%</dt><dd id="s1"></dd><dt>Subtotal 0%</dt><dd id="s2"></dd><dt>Descuento</dt><dd id="s3"></dd><dt>IVA ${S.cfg.iva}%</dt><dd id="s4"></dd><dt class="big">Total</dt><dd class="big" id="s5"></dd></dl>${erroresHTML(er)}`;
      if (tipo !== 'guia') [['s1', t.subIva], ['s2', t.sub0], ['s3', t.descuento], ['s4', t.iva], ['s5', t.total]].forEach(([id, n]) => App.setNum($('#' + id, sum), n));
      const emi = $('#emi', fm); if (emi) emi.disabled = !!er.length;
    };
    const erroresHTML = (er) => (er.length ? `<ul class="errs">${er.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="okmsg">Listo para emitir.</p>');
    const finish = (estado) => {
      const doc = sri.emitir(Object.assign({}, draft, { items: draft.items.filter((i) => i.desc && i.cant > 0) }), 'borrador');
      App.closeModal(); App.render();
      if (estado === 'autorizado') sri.enviar(doc.id); else App.toast(`${T.n} ${doc.numero} guardado como borrador`);
    };
    const wire = () => {
      const on = (id, ev, fn) => { const el = $('#' + id, fm); if (el) el[ev] = fn; };
      on('fecha', 'oninput', (e) => { draft.fecha = e.target.value; });
      on('cli', 'onchange', (e) => { draft.receptor = S.clientes.find((c) => c.id === e.target.value); updateSum(); });
      on('fp', 'onchange', (e) => { draft.formaPago = e.target.value; });
      on('mot', 'oninput', (e) => { draft.motivo = e.target.value; updateSum(); });
      on('ref', 'onchange', (e) => { const f = facturas.find((x) => x.id === e.target.value); draft.ref = f ? sri.refDe(f) : null; if (f) { draft.receptor = f.receptor; } render(); });
      [['g-t', 'transportista'], ['g-ti', 'transportistaId'], ['g-p', 'placa'], ['g-i', 'ini'], ['g-o', 'partida'], ['g-d', 'llegada']].forEach(([id, k]) => on(id, 'oninput', (e) => { draft.guia[k] = e.target.value; if (k === 'ini') draft.guia.fin = e.target.value; updateSum(); }));
      on('r-n', 'oninput', (e) => { draft.ref = Object.assign({ fecha: hoy, total: 0 }, draft.ref, { numero: e.target.value }); updateSum(); });
      on('r-f', 'oninput', (e) => { draft.ref = Object.assign({ numero: '', total: 0 }, draft.ref, { fecha: e.target.value }); });
      on('r-p', 'oninput', (e) => { draft.periodoFiscal = e.target.value; });
      on('addI', 'onclick', () => { draft.items.push({ cod: '', desc: '', cant: 1, precio: 0, descuento: 0, iva: S.cfg.iva }); render(); });
      on('addR', 'onclick', () => { draft.lineas.push({ impuesto: 'iva', codigo: '1', base: 0, pct: 30 }); render(); });
      on('cpy', 'onclick', () => { if (!draft.ref) return App.toast('Primero selecciona la factura'); const f = S.docs.find((x) => x.id === draft.ref.docId); draft.items = JSON.parse(JSON.stringify(f.items)); render(); });
      on('bor', 'onclick', () => finish('borrador'));
      on('emi', 'onclick', () => finish('autorizado'));
      $$('tbody tr', fm).forEach((tr) => {
        const i = +tr.dataset.i;
        tr.addEventListener('input', (e) => { const k = e.target.dataset.k; if (!k || tipo === 'retencion') return; const it = draft.items[i]; it[k] = ['desc', 'cod'].includes(k) ? e.target.value : +e.target.value; if (k === 'prod') return; updateSum(); });
        tr.addEventListener('change', (e) => {
          const k = e.target.dataset.k;
          if (tipo === 'retencion') {
            const l = draft.lineas[i];
            if (k === 'imp') { l.impuesto = e.target.value; const [c, , p] = RETENCIONES[l.impuesto][0]; l.codigo = c; l.pct = p; }
            if (k === 'cod') { l.codigo = e.target.value; l.pct = RETENCIONES[l.impuesto].find((x) => x[0] === l.codigo)[2]; }
            if (k === 'base') l.base = +e.target.value; if (k === 'pct') l.pct = +e.target.value;
            render(); return;
          }
          if (k === 'prod' && e.target.value) { const p = S.productos.find((x) => x.id === e.target.value); Object.assign(draft.items[i], { cod: p.codigo, desc: p.nombre, precio: p.precio, iva: p.iva }); render(); }
          if (k === 'iva') updateSum();
        });
        const del = $('[data-del]', tr); if (del) del.onclick = () => { (tipo === 'retencion' ? draft.lineas : draft.items).splice(i, 1); if (tipo === 'retencion' ? !draft.lineas.length : !draft.items.length) (tipo === 'retencion' ? draft.lineas : draft.items).push(tipo === 'retencion' ? { impuesto: 'renta', codigo: '312', base: 0, pct: 1.75 } : { cod: '', desc: '', cant: 1, precio: 0, descuento: 0, iva: S.cfg.iva }); render(); };
      });
    };
    render();
  }

  /* ---------- Clientes y productos ---------- */
  App.views.catalogo = (v) => {
    const S = App.S;
    v.innerHTML = `<div class="head"><div><h1>Clientes y productos</h1><p class="sub">Catálogo que alimenta al simulador de comprobantes.</p></div><button class="btn ghost" id="vaciar">${icon('trash')}Vaciar</button></div>
      <div class="cols"><section class="card"><div class="row between"><h2>Clientes y proveedores</h2><button class="btn sm primary" id="addC">${icon('plus')}Nuevo</button></div>
        ${S.clientes.length ? `<div class="tablewrap flat"><table class="list"><thead><tr><th class="l">Nombre</th><th class="l">Identificación</th><th></th></tr></thead><tbody>${S.clientes.map((c) => { const ok = c.idTipo === 'final' || (c.idTipo === 'ruc' ? EC.validarRUC(c.ident).valido : c.idTipo === 'cedula' ? EC.cedulaValida(c.ident) : true);
          return `<tr data-id="${c.id}"><td class="l"><b>${esc(c.nombre)}</b><br><small>${esc(c.email)}</small></td><td class="l">${IDTIPO[c.idTipo]} ${esc(c.ident)} ${ok ? '' : '<span class="tag bad">inválida</span>'}</td><td class="acts"><button class="btn sm" data-a="ed">Editar</button><button class="btn sm ghost danger" data-a="del" aria-label="Borrar">${icon('trash')}</button></td></tr>`; }).join('')}</tbody></table></div>` : '<div class="empty"><b>Sin clientes</b><p>Agrega uno para emitir facturas.</p></div>'}</section>
      <section class="card"><div class="row between"><h2>Productos y servicios</h2><button class="btn sm primary" id="addP">${icon('plus')}Nuevo</button></div>
        ${S.productos.length ? `<div class="tablewrap flat"><table class="list"><thead><tr><th class="l">Producto</th><th>Precio</th><th>IVA</th><th></th></tr></thead><tbody>${S.productos.map((p) => `<tr data-id="${p.id}"><td class="l"><b>${esc(p.nombre)}</b><br><small>${esc(p.codigo)}</small></td><td>${money(p.precio)}</td><td>${p.iva}%</td><td class="acts"><button class="btn sm" data-a="ed">Editar</button><button class="btn sm ghost danger" data-a="del" aria-label="Borrar">${icon('trash')}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty"><b>Sin productos</b><p>Agrega los bienes o servicios que vendes.</p></div>'}</section></div>`;
    $('#vaciar').onclick = () => App.clearModule('catalogo');
    $('#addC').onclick = () => formCliente(); $('#addP').onclick = () => formProducto();
    const tbls = $$('table.list', v); // clientes y productos
    if (S.clientes.length) $$('tbody tr', tbls[0]).forEach((tr) => tr.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const it = S.clientes.find((x) => x.id === tr.dataset.id); if (b.dataset.a === 'ed') formCliente(it); else { S.clientes = S.clientes.filter((x) => x !== it); App.save(); App.render(); App.toast('Cliente eliminado', () => { S.clientes.push(it); App.save(); App.render(); }); } }));
    const tp = $$('table.list', v)[S.clientes.length ? 1 : 0];
    if (tp && S.productos.length) $$('tbody tr', tp).forEach((tr) => tr.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const it = S.productos.find((x) => x.id === tr.dataset.id); if (b.dataset.a === 'ed') formProducto(it); else { S.productos = S.productos.filter((x) => x !== it); App.save(); App.render(); App.toast('Producto eliminado', () => { S.productos.push(it); App.save(); App.render(); }); } }));
  };
  function formCliente(c) {
    const n = c || { id: uid(), nombre: '', idTipo: 'ruc', ident: '', direccion: '', email: '' };
    const d = App.modal(`<h3>${c ? 'Editar' : 'Nuevo'} cliente</h3><form class="grid2" method="dialog"><label class="span2">Nombre o razón social<input id="n" required value="${esc(n.nombre)}"></label>
      <label>Tipo de identificación<select id="t">${Object.entries(IDTIPO).map(([k, t]) => `<option value="${k}" ${k === n.idTipo ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Número<input id="i" value="${esc(n.ident)}" inputmode="numeric"><small id="im"></small></label><label class="span2">Dirección<input id="d" value="${esc(n.direccion)}"></label><label class="span2">Correo<input id="e" type="email" value="${esc(n.email)}"></label>
      <div class="row end span2"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="ok">Guardar</button></div></form>`);
    const chk = () => { const t = $('#t', d).value, v = $('#i', d).value; const ok = t === 'ruc' ? EC.validarRUC(v).valido : t === 'cedula' ? EC.cedulaValida(v) : true; $('#im', d).innerHTML = !v || t === 'final' || t === 'pasaporte' ? '' : ok ? '<span class="good">Válido</span>' : '<span class="bad">Dígito verificador inválido</span>'; };
    $('#i', d).oninput = chk; $('#t', d).onchange = () => { if ($('#t', d).value === 'final') $('#i', d).value = '9999999999999'; chk(); }; chk();
    $('form', d).onsubmit = (ev) => { if (ev.submitter && ev.submitter.value === 'cancel') return; Object.assign(n, { nombre: $('#n', d).value.trim(), idTipo: $('#t', d).value, ident: $('#i', d).value.trim(), direccion: $('#d', d).value.trim(), email: $('#e', d).value.trim() }); if (!c) App.S.clientes.push(n); App.save(); App.render(); App.toast('Cliente guardado'); };
  }
  function formProducto(p) {
    const n = p || { id: uid(), codigo: '', nombre: '', precio: 0, iva: App.S.cfg.iva };
    const d = App.modal(`<h3>${p ? 'Editar' : 'Nuevo'} producto</h3><form class="grid2" method="dialog"><label>Código<input id="c" required value="${esc(n.codigo)}"></label><label>Precio unitario (sin IVA)<input id="p" type="number" step="any" min="0" required value="${n.precio}"></label>
      <label class="span2">Nombre<input id="n" required value="${esc(n.nombre)}"></label><label>IVA<select id="v"><option value="0" ${+n.iva === 0 ? 'selected' : ''}>0%</option><option value="${App.S.cfg.iva}" ${+n.iva !== 0 ? 'selected' : ''}>${App.S.cfg.iva}%</option></select></label>
      <div class="row end span2"><button class="btn" value="cancel" formnovalidate>Cancelar</button><button class="btn primary" value="ok">Guardar</button></div></form>`);
    $('form', d).onsubmit = (ev) => { if (ev.submitter && ev.submitter.value === 'cancel') return; Object.assign(n, { codigo: $('#c', d).value.trim(), nombre: $('#n', d).value.trim(), precio: +$('#p', d).value, iva: +$('#v', d).value }); if (!p) App.S.productos.push(n); App.save(); App.render(); App.toast('Producto guardado'); };
  }
})();
