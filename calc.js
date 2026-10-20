/* Motor de cálculo (Ecuador): rol de pagos, renta, finiquito, utilidades, validadores y comprobantes SRI.
   Sin dependencias; corre en navegador y en Node. */
(function (root) {
  'use strict';

  const DEFAULTS = {
    anio: 2026,
    sbu: 482,
    horasMes: 240,
    diasMes: 30,
    iessPersonal: 9.45,
    iessPatronal: 11.15,
    secap: 0.5,
    iece: 0.5,
    fondosReserva: 8.33,
    iva: 15,
    ver: 2, // versión de los parámetros legales (migra datos guardados con valores anteriores)
    canasta: 821.8, // canasta familiar básica: base de los topes de gastos personales
    canastas: [7, 9, 11, 14, 17, 20], // tope en canastas según cargas familiares: 0, 1, 2, 3, 4, 5 o más
    rebajaGastos: 18, // % de rebaja del impuesto sobre el gasto permitido
    topeIngresos: 50, // los gastos permitidos no superan este % de los ingresos
    regimenes: {
      ct: { nombre: 'Código del Trabajo (sector privado)', suplementaria: 50, extraordinaria: 100, nocturno: 25 },
      losep: { nombre: 'LOSEP (sector público)', suplementaria: 25, extraordinaria: 100, nocturno: 25 },
      domestico: { nombre: 'Trabajo doméstico', suplementaria: 50, extraordinaria: 100, nocturno: 25 },
    },
    // Tabla IR personas naturales 2026 (Res. NAC-DGERCGC25-00000043). Editable.
    irTabla: [
      { desde: 0, hasta: 12208, base: 0, pct: 0 },
      { desde: 12208, hasta: 15549, base: 0, pct: 5 },
      { desde: 15549, hasta: 20188, base: 167, pct: 10 },
      { desde: 20188, hasta: 26700, base: 631, pct: 12 },
      { desde: 26700, hasta: 35136, base: 1412, pct: 15 },
      { desde: 35136, hasta: 46575, base: 2678, pct: 20 },
      { desde: 46575, hasta: 62005, base: 4965, pct: 25 },
      { desde: 62005, hasta: 82679, base: 8823, pct: 30 },
      { desde: 82679, hasta: 109956, base: 15025, pct: 35 },
      { desde: 109956, hasta: null, base: 24572, pct: 37 },
    ],
  };

  const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
  const num = (v) => (Number.isFinite(+v) ? +v : 0);

  /** Meses completos de antigüedad al último día del periodo (YYYY-MM). */
  function mesesAntiguedad(ingreso, periodo) {
    if (!ingreso) return 0;
    const [y, m] = periodo.split('-').map(Number);
    const fin = new Date(y, m, 0);
    const ini = new Date(ingreso + 'T00:00:00');
    return Math.max(0, (fin.getFullYear() - ini.getFullYear()) * 12 + (fin.getMonth() - ini.getMonth()));
  }

  /** Días a pagar por defecto: mes completo, o prorrateado si el empleado ingresó ese mes (año comercial de 30 días). */
  function diasDefault(emp, periodo, cfg) {
    cfg = cfg || DEFAULTS;
    if (emp.ingreso && emp.ingreso.slice(0, 7) === periodo) {
      const d = Math.min(30, +emp.ingreso.slice(8, 10) || 1);
      return Math.max(0, Math.min(cfg.diasMes, cfg.diasMes - (d - 1)));
    }
    return cfg.diasMes;
  }

  /** Impuesto anual según tabla progresiva. */
  function impuestoAnual(base, cfg) {
    const t = (cfg.irTabla || DEFAULTS.irTabla).find((x) => base >= x.desde && (x.hasta === null || base <= x.hasta));
    return t ? t.base + (base - t.desde) * (t.pct / 100) : 0;
  }
  /** Tope anual de gastos personales según cargas familiares (múltiplos de la canasta básica). */
  function topeGastos(cargas, cfg) {
    const c = cfg || DEFAULTS;
    const i = Math.max(0, Math.min(c.canastas.length - 1, Math.floor(num(cargas))));
    return r2(c.canastas[i] * c.canasta);
  }
  /** Retención mensual proyectada: ingresos anualizados − IESS → tabla → menos rebaja por gastos personales → ÷ 12. */
  function retencionMensual(aportable, iessMes, gastosAnuales, cargas, cfg) {
    const base = Math.max(0, (aportable - iessMes) * 12);
    const tope = topeGastos(cargas, cfg);
    const permitido = Math.min(num(gastosAnuales), tope, (cfg.topeIngresos / 100) * aportable * 12);
    const rebaja = (cfg.rebajaGastos / 100) * permitido;
    const imp = impuestoAnual(base, cfg);
    return { base: r2(base), impuestoAnual: r2(imp), tope, permitido: r2(permitido), rebaja: r2(rebaja), mensual: r2(Math.max(0, imp - rebaja) / 12) };
  }

  /**
   * emp: ficha. per: novedades del mes. cfg: parámetros. periodo 'YYYY-MM'.
   * Modos de décimos/fondos: 'mensualiza' (se paga en el rol), 'acumula' (se provisiona), 'no'.
   */
  function calcular(emp, per, cfg, periodo) {
    cfg = cfg || DEFAULTS;
    per = per || {};
    const reg = cfg.regimenes[emp.regimen] || cfg.regimenes.ct;
    const avisos = [];

    const salario = num(emp.salario);
    const dias = Math.min(cfg.diasMes, Math.max(0, per.dias === undefined || per.dias === '' ? diasDefault(emp, periodo, cfg) : num(per.dias)));
    const valorHora = salario / cfg.horasMes;

    const sueldo = r2((salario / cfg.diasMes) * dias);
    const heOn = emp.horasExtras !== false;
    const hSup = heOn ? num(per.hSup) : 0;
    const hExt = heOn ? num(per.hExt) : 0;
    const hNoc = heOn ? num(per.hNoc) : 0;
    const pagoSup = r2(valorHora * (1 + reg.suplementaria / 100) * hSup);
    const pagoExt = r2(valorHora * (1 + reg.extraordinaria / 100) * hExt);
    const pagoNoc = r2(valorHora * (reg.nocturno / 100) * hNoc);
    const horasExtras = r2(pagoSup + pagoExt + pagoNoc);

    const bonos = r2(num(per.bonos));
    const otrosIng = r2(num(per.otrosIng));
    const aportable = r2(sueldo + horasExtras + bonos);

    const antig = mesesAntiguedad(emp.ingreso, periodo);
    const d13Base = r2(aportable / 12);
    const d14Base = salario > 0 ? r2(((cfg.sbu / 12) * dias) / cfg.diasMes) : 0;
    const frAplica = antig >= 12;
    const frBase = frAplica ? r2((aportable * cfg.fondosReserva) / 100) : 0;

    const modo = (v) => v || 'mensualiza';
    const d13 = modo(emp.d13), d14 = modo(emp.d14), fr = modo(emp.fr);
    const d13Pago = d13 === 'mensualiza' ? d13Base : 0;
    const d14Pago = d14 === 'mensualiza' ? d14Base : 0;
    const frPago = fr === 'mensualiza' ? frBase : 0;

    const totalIngresos = r2(aportable + otrosIng + d13Pago + d14Pago + frPago);

    const afiliado = emp.iess !== false;
    const iessEmp = afiliado ? r2((aportable * cfg.iessPersonal) / 100) : 0;
    let renta, rentaDet = null;
    if (emp.rentaModo === 'manual') renta = r2(num(emp.renta));
    else { rentaDet = retencionMensual(aportable, iessEmp, emp.gastosPersonales, emp.cargas, cfg); renta = rentaDet.mensual; }
    const anticipo = r2(num(per.anticipo));
    const prestamos = r2(num(per.prestamos));
    const otrosDesc = r2(num(per.otrosDesc));
    const totalEgresos = r2(iessEmp + renta + anticipo + prestamos + otrosDesc);
    const neto = r2(totalIngresos - totalEgresos);

    const patronal = afiliado ? r2((aportable * cfg.iessPatronal) / 100) : 0;
    const secap = afiliado ? r2((aportable * cfg.secap) / 100) : 0;
    const iece = afiliado ? r2((aportable * cfg.iece) / 100) : 0;
    const prov13 = d13 === 'acumula' ? d13Base : 0;
    const prov14 = d14 === 'acumula' ? d14Base : 0;
    const provFR = fr === 'acumula' ? frBase : 0;
    const provVac = r2(aportable / 24);
    const costoEmpleador = r2(totalIngresos + patronal + secap + iece + prov13 + prov14 + provFR + provVac);

    if (salario > 0 && salario < cfg.sbu) avisos.push(`Salario menor al SBU (${cfg.sbu}).`);
    if (hSup + hExt > 48) avisos.push('Más de 48 h extra al mes: revisa el tope (4 h/día, 12 h/semana).');
    if (!heOn && (num(per.hSup) || num(per.hExt) || num(per.hNoc))) avisos.push('Sin horas extras habilitadas: se ignoraron las horas.');
    if (fr !== 'no' && !frAplica) avisos.push('Fondos de reserva: aún no cumple 1 año, no se calcula.');
    if (num(per.dias) > cfg.diasMes) avisos.push(`Días mayores a ${cfg.diasMes}: se ajustó.`);
    if (totalEgresos > totalIngresos) avisos.push('Egresos superan ingresos: neto negativo.');

    return {
      dias, valorHora: r2(valorHora), sueldo, hSup, hExt, hNoc, pagoSup, pagoExt, pagoNoc, horasExtras, bonos, otrosIng,
      aportable, d13Base, d14Base, frBase, d13Pago, d14Pago, frPago, totalIngresos,
      iessEmp, renta, rentaDet, anticipo, prestamos, otrosDesc, totalEgresos, neto,
      patronal, secap, iece, prov13, prov14, provFR, provVac, costoEmpleador,
      antigMeses: antig, avisos,
    };
  }

  /* ---------- Liquidación / finiquito ---------- */
  const d360 = (a, b) => { // días entre fechas (inclusive) con año comercial 30/360
    const x = new Date(a + 'T00:00:00'), y = new Date(b + 'T00:00:00');
    return Math.max(0, (y.getFullYear() - x.getFullYear()) * 360 + (y.getMonth() - x.getMonth()) * 30 + (Math.min(y.getDate(), 30) - Math.min(x.getDate(), 30)) + 1);
  };
  const CAUSAS = {
    renuncia: 'Renuncia voluntaria',
    desahucio: 'Desahucio (aviso del trabajador, art. 184-185)',
    despido: 'Despido intempestivo (art. 188)',
    mutuo: 'Mutuo acuerdo',
    visto: 'Visto bueno del empleador',
    plazo: 'Terminación de contrato por vencimiento de plazo',
  };
  function finiquito(emp, o, cfg) {
    cfg = cfg || DEFAULTS;
    const salario = num(emp.salario);
    const salida = o.salida;
    const diasServ = d360(emp.ingreso, salida);
    const anios = diasServ / 360;
    const aniosCompletos = Math.ceil(anios); // la fracción de año cuenta como año completo
    const diaMes = Math.min(30, new Date(salida + 'T00:00:00').getDate());
    const sueldoPend = r2((salario / 30) * diaMes);
    const y = +salida.slice(0, 4);
    // Décimo tercero: 1-dic del año anterior hasta la salida
    const ini13 = [`${y - 1}-12-01`, emp.ingreso].sort().pop();
    const d13 = emp.d13 === 'acumula' ? r2((salario * d360(ini13, salida)) / 360) : 0;
    // Décimo cuarto: Sierra/Oriente 1-ago → 31-jul; Costa/Galápagos 1-mar → 28/29-feb
    const costa = emp.region === 'costa';
    const mesIni = costa ? '03' : '08';
    const anioIni = (+salida.slice(5, 7) >= +mesIni) ? y : y - 1;
    const ini14 = [`${anioIni}-${mesIni}-01`, emp.ingreso].sort().pop();
    const d14 = emp.d14 === 'acumula' ? r2((cfg.sbu * d360(ini14, salida)) / 360) : 0;
    // Vacaciones: 15 días por año, proporcional; los días adicionales (desde el 5.º año) se ingresan en vacExtra
    const vacGen = r2(15 * anios + num(o.vacExtra));
    const vacPend = Math.max(0, r2(vacGen - num(o.vacTomadas)));
    const vacValor = r2((salario / 30) * vacPend);
    const utilidades = r2(num(o.utilidades));
    const fondos = r2(num(o.fondosPend));
    const desahucio = (o.causa === 'desahucio' || o.causa === 'despido') ? r2(0.25 * salario * aniosCompletos) : 0;
    let indemn = 0;
    if (o.causa === 'despido') indemn = r2(salario * (anios <= 3 ? 3 : Math.min(25, aniosCompletos)));
    const ingresos = r2(sueldoPend + d13 + d14 + vacValor + utilidades + fondos + desahucio + indemn);
    const iess = emp.iess === false ? 0 : r2((sueldoPend * cfg.iessPersonal) / 100);
    const otros = r2(num(o.descuentos));
    const egresos = r2(iess + otros);
    return {
      diasServ, anios: r2(anios), aniosCompletos, sueldoPend, d13, d14, vacGen, vacPend, vacValor, utilidades, fondos,
      desahucio, indemn, ingresos, iess, otros, egresos, neto: r2(ingresos - egresos), causa: CAUSAS[o.causa] || o.causa,
    };
  }

  /* ---------- Participación de utilidades (15%) ---------- */
  function utilidades(utilLiquida, filas, cfg) {
    // filas: [{id, dias, cargas}]
    const total = r2(num(utilLiquida) * 0.15);
    const p10 = r2(num(utilLiquida) * 0.10), p5 = r2(num(utilLiquida) * 0.05);
    const sumD = filas.reduce((a, f) => a + num(f.dias), 0);
    const sumC = filas.reduce((a, f) => a + num(f.cargas), 0);
    return {
      total, p10, p5,
      filas: filas.map((f) => {
        const a = sumD ? r2((p10 * num(f.dias)) / sumD) : 0;
        const b = sumC ? r2((p5 * num(f.cargas)) / sumC) : 0;
        return { id: f.id, porDias: a, porCargas: b, total: r2(a + b) };
      }),
      sinCargas: !sumC ? p5 : 0, // si nadie tiene cargas, el 5% se reparte entre todos por días
    };
  }

  /* ---------- Cédula / RUC ---------- */
  const soloDigitos = (s, n) => typeof s === 'string' && new RegExp('^\\d{' + n + '}$').test(s);
  function cedulaValida(c) {
    if (!soloDigitos(c, 10)) return false;
    const prov = +c.slice(0, 2);
    if (!((prov >= 1 && prov <= 24) || prov === 30)) return false;
    if (+c[2] >= 6) return false;
    let suma = 0;
    for (let i = 0; i < 9; i++) {
      let p = +c[i] * (i % 2 === 0 ? 2 : 1);
      if (p > 9) p -= 9;
      suma += p;
    }
    return (10 - (suma % 10)) % 10 === +c[9];
  }
  function mod11(digs, coefs, dv) {
    const suma = coefs.reduce((a, k, i) => a + k * +digs[i], 0);
    const res = suma % 11;
    return (res === 0 ? 0 : 11 - res) === +dv;
  }
  function validarRUC(ruc) {
    ruc = (ruc || '').trim();
    if (!soloDigitos(ruc, 13)) return { valido: false, tipo: null, motivo: 'Debe tener 13 dígitos numéricos.' };
    const prov = +ruc.slice(0, 2);
    if (!((prov >= 1 && prov <= 24) || prov === 30)) return { valido: false, tipo: null, motivo: 'Código de provincia inválido.' };
    const t = +ruc[2];
    if (t < 6) {
      if (!cedulaValida(ruc.slice(0, 10))) return { valido: false, tipo: 'Persona natural', motivo: 'Los 10 primeros dígitos no son una cédula válida.' };
      if (+ruc.slice(10) < 1) return { valido: false, tipo: 'Persona natural', motivo: 'El establecimiento debe ser 001 o mayor.' };
      return { valido: true, tipo: 'Persona natural', motivo: 'Estructura válida (cédula + establecimiento).' };
    }
    if (t === 9) {
      if (!mod11(ruc, [4, 3, 2, 7, 6, 5, 4, 3, 2], ruc[9])) return { valido: false, tipo: 'Sociedad privada', motivo: 'Dígito verificador (módulo 11) no coincide.' };
      if (+ruc.slice(10) < 1) return { valido: false, tipo: 'Sociedad privada', motivo: 'El establecimiento debe ser 001 o mayor.' };
      return { valido: true, tipo: 'Sociedad privada', motivo: 'Estructura válida.' };
    }
    if (t === 6) {
      if (!mod11(ruc, [3, 2, 7, 6, 5, 4, 3, 2], ruc[8])) return { valido: false, tipo: 'Entidad pública', motivo: 'Dígito verificador (módulo 11) no coincide.' };
      if (+ruc.slice(9) < 1) return { valido: false, tipo: 'Entidad pública', motivo: 'El establecimiento debe ser 0001 o mayor.' };
      return { valido: true, tipo: 'Entidad pública', motivo: 'Estructura válida.' };
    }
    return { valido: false, tipo: null, motivo: 'Tercer dígito inválido (0-5, 6 o 9).' };
  }

  /* ---------- Comprobantes SRI (simulador) ---------- */
  const TIPO_DOC = { factura: '01', notaCredito: '04', notaDebito: '05', guia: '06', retencion: '07' };
  /** Clave de acceso de 49 dígitos con dígito verificador módulo 11 (coeficientes 2..7 de derecha a izquierda). */
  function claveAcceso({ fecha, tipo, ruc, ambiente, serie, secuencial, codigo, emision }) {
    const [y, m, d] = fecha.split('-');
    const base = `${d}${m}${y}${TIPO_DOC[tipo]}${ruc}${ambiente}${serie}${String(secuencial).padStart(9, '0')}${codigo}${emision || '1'}`;
    let suma = 0, k = 2;
    for (let i = base.length - 1; i >= 0; i--) { suma += +base[i] * k; k = k === 7 ? 2 : k + 1; }
    let dv = 11 - (suma % 11);
    if (dv === 11) dv = 0; else if (dv === 10) dv = 1;
    return base + dv;
  }
  function claveValida(c) {
    if (!soloDigitos(c, 49)) return false;
    let suma = 0, k = 2;
    for (let i = 47; i >= 0; i--) { suma += +c[i] * k; k = k === 7 ? 2 : k + 1; }
    let dv = 11 - (suma % 11);
    if (dv === 11) dv = 0; else if (dv === 10) dv = 1;
    return dv === +c[48];
  }
  /** items: [{cant, precio, descuento (valor $), iva (% 0|15)}] */
  function totalesDoc(items, ivaDefault) {
    let sub15 = 0, sub0 = 0, descuento = 0, iva = 0;
    items.forEach((it) => {
      const bruto = num(it.cant) * num(it.precio);
      const d = Math.min(bruto, num(it.descuento));
      const neto = bruto - d;
      descuento += d;
      const rate = it.iva === undefined ? ivaDefault : num(it.iva);
      if (rate > 0) { sub15 += neto; iva += neto * (rate / 100); } else sub0 += neto;
    });
    const subtotal = sub15 + sub0;
    return { subIva: r2(sub15), sub0: r2(sub0), subtotal: r2(subtotal), descuento: r2(descuento), iva: r2(iva), total: r2(subtotal + iva) };
  }

  /* ---------- Número a letras (valor del rol) ---------- */
  const U = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE', 'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE', 'VEINTE', 'VEINTIUNO', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const DE = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const CE = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  function menor1000(n) {
    if (n === 100) return 'CIEN';
    const c = Math.floor(n / 100), r = n % 100;
    let s = c ? CE[c] + (r ? ' ' : '') : '';
    if (r < 30) s += U[r]; else s += DE[Math.floor(r / 10)] + (r % 10 ? ' Y ' + U[r % 10] : '');
    return s;
  }
  const apocope = (s) => s.replace(/VEINTIUNO$/, 'VEINTIÚN').replace(/UNO$/, 'UN');
  function letras(valor) {
    const v = Math.round((Math.abs(num(valor)) + Number.EPSILON) * 100) / 100;
    const ent = Math.floor(v), cts = Math.round((v - ent) * 100);
    let s = '';
    if (ent === 0) s = 'CERO';
    else {
      const mill = Math.floor(ent / 1e6), miles = Math.floor((ent % 1e6) / 1000), r = ent % 1000;
      if (mill) s += (mill === 1 ? 'UN MILLÓN' : apocope(menor1000(mill)) + ' MILLONES') + ' ';
      if (miles) s += (miles === 1 ? 'MIL' : apocope(menor1000(miles)) + ' MIL') + ' ';
      if (r) s += menor1000(r);
      s = s.trim();
    }
    return `${s} CON ${String(cts).padStart(2, '0')}/100 DÓLARES`;
  }

  const api = {
    DEFAULTS, calcular, diasDefault, topeGastos, letras, r2, mesesAntiguedad, impuestoAnual, retencionMensual, finiquito, utilidades, CAUSAS, d360,
    cedulaValida, validarRUC, claveAcceso, claveValida, totalesDoc, TIPO_DOC,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EC = api;
})(typeof window !== 'undefined' ? window : globalThis);
