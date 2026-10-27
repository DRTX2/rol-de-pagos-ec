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
    secap: 0, // sin SECAP ni IECE: la planilla es solo aporte personal y patronal. Se pueden reactivar en Ajustes.
    iece: 0,
    fondosReserva: 8.33,
    iva: 15,
    ver: 5, // versión de los parámetros legales (migra datos guardados con valores anteriores)
    canasta: 821.8, // canasta familiar básica: base de los topes de gastos personales
    canastas: 7, // tope de gastos personales, en canastas familiares básicas
    rebajaGastos: 18, // % de rebaja del impuesto sobre el gasto permitido
    topeIngresos: 50, // los gastos permitidos no superan este % de los ingresos
    regimenes: {
      ct: { nombre: 'Código del Trabajo (sector privado)', suplementaria: 50, extraordinaria: 100, nocturno: 25 },
      losep: { nombre: 'LOSEP (sector público)', suplementaria: 25, extraordinaria: 100, nocturno: 25 },
    },
    // Jornada de trabajo: tope legal (Código del Trabajo art. 47, 55 y 62) y ventana del recargo nocturno. Todo editable.
    jornadaMax: { diaria: 8, semanal: 40, extraDia: 4, extraSemana: 12 },
    nocturnoIni: '19:00',
    nocturnoFin: '06:00',
    // Jornadas disponibles para asignar a cada empleado (horario de entrada y salida, horas de almuerzo y días por semana)
    jornadas: [
      { id: 'completa', nombre: 'Completa lunes a viernes', ini: '08:00', fin: '17:00', almuerzo: 1, diasSem: 5 },
      { id: 'parcial', nombre: 'Parcial de 4 horas', ini: '08:00', fin: '12:00', almuerzo: 0, diasSem: 5 },
      { id: 'nocturna', nombre: 'Nocturna', ini: '22:00', fin: '06:00', almuerzo: 0, diasSem: 5 },
    ],
    // Estructura ocupacional (Acuerdo MDT 370): A jefatura, B supervisión, C operación, D asistencia, E soporte
    niveles: [
      { id: 'A1', nombre: 'Jefatura' }, { id: 'B1', nombre: 'Supervisión general' }, { id: 'B2', nombre: 'Supervisión técnica' }, { id: 'B3', nombre: 'Supervisión operativa' },
      { id: 'C1', nombre: 'Operación especializada' }, { id: 'C2', nombre: 'Operación técnica' }, { id: 'C3', nombre: 'Operación básica' },
      { id: 'D1', nombre: 'Asistencia administrativa' }, { id: 'D2', nombre: 'Asistencia técnica' }, { id: 'E1', nombre: 'Soporte administrativo' }, { id: 'E2', nombre: 'Soporte operativo' },
    ],
    // Comisiones sectoriales pertinentes: solo la N.º 12 (Tecnología: hardware y software). «min» es el salario mínimo por nivel,
    // escala de las ramas 1 a 3 del Anexo CS 12 de los salarios mínimos sectoriales 2025 (vigente en 2026 según el oficio
    // MDT-PRE-2026-002577). E1 no tiene valor en esa escala. Se pueden agregar más comisiones en Ajustes.
    comisiones: [
      { id: 12, nombre: "Tecnología: hardware y software (incluye TIC's)", fuente: 'Anexo CS 12, salarios mínimos sectoriales 2025',
        min: { A1: 507.37, B1: 506.67, B2: 505.97, B3: 505.26, C1: 504.56, C2: 502.68, C3: 500.80, D1: 498.93, D2: 497.05, E2: 493.29 } },
    ],
    // Cargos de la empresa (organigrama de Global Security, comisión 12 «Tecnología»). «padre» es el cargo del que depende. Editable.
    // El mínimo es el del nivel en el Anexo 1 del MDT 2025 (vigente en 2026); lo que quede bajo el SBU se iguala al SBU.
    cargos: [
      { id: 'gerente', nombre: 'Gerente general', nivel: 'A1', padre: '', minimo: 507.37 },
      { id: 'jefe-tec', nombre: 'Jefe técnico de ciberseguridad', nivel: 'B1', padre: 'gerente', minimo: 506.67 },
      { id: 'contador', nombre: 'Contador general', nivel: 'C1', padre: 'gerente', minimo: 504.56 },
      { id: 'asistente', nombre: 'Asistente administrativo-comercial', nivel: 'E2', padre: 'gerente', minimo: 493.29 },
      { id: 'analista', nombre: 'Analista de ciberseguridad 1', nivel: 'C1', padre: 'jefe-tec', minimo: 504.56 },
      { id: 'dev1', nombre: 'Desarrollador 1 (semi senior)', nivel: 'C1', padre: 'jefe-tec', minimo: 504.56 },
      { id: 'dev2', nombre: 'Desarrollador 2 (junior)', nivel: 'C3', padre: 'jefe-tec', minimo: 500.80 },
    ].map((c) => Object.assign(c, { comision: 12 })),
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

  const minutos = (hhmm) => { const [h, m] = String(hhmm || '0:0').split(':').map(Number); return (h || 0) * 60 + (m || 0); };
  /** Jornada del empleado: horario, horas diarias y semanales, y horas diarias dentro de la ventana nocturna. */
  function jornadaDe(emp, cfg) {
    cfg = cfg || DEFAULTS;
    const lista = cfg.jornadas || DEFAULTS.jornadas;
    const j = lista.find((x) => x.id === emp.jornada) || lista[0];
    if (!j) return { id: '', nombre: '', ini: '', fin: '', almuerzo: 0, diasSem: 5, horasDia: cfg.horasMes / cfg.diasMes, horasSem: 0, horasMes: cfg.horasMes, nocDia: 0, texto: '' };
    const a = minutos(j.ini);
    let b = minutos(j.fin); if (b <= a) b += 1440; // turno que cruza la medianoche
    const horasDia = Math.max(0, (b - a) / 60 - num(j.almuerzo));
    const ni = minutos(cfg.nocturnoIni || '19:00'); let nf = minutos(cfg.nocturnoFin || '06:00'); if (nf <= ni) nf += 1440;
    let noc = 0;
    for (let k = -1; k <= 1; k++) noc += Math.max(0, Math.min(b, nf + 1440 * k) - Math.max(a, ni + 1440 * k));
    const hh = (m) => `${String(Math.floor((m % 1440) / 60)).padStart(2, '0')}H${String(m % 60).padStart(2, '0')}`;
    return {
      id: j.id, nombre: j.nombre, ini: j.ini, fin: j.fin, almuerzo: num(j.almuerzo), diasSem: num(j.diasSem),
      horasDia: r2(horasDia), horasSem: r2(horasDia * num(j.diasSem)), horasMes: r2(horasDia * cfg.diasMes),
      nocDia: r2(Math.min(noc / 60, horasDia)), texto: `${hh(a)} A ${hh(b)}`,
    };
  }

  /** Salario mínimo aplicable: el de la comisión sectorial y nivel del empleado; si no hay, el SBU.
   *  Si el nivel exacto no está cargado se usa el menor valor cargado de la comisión como piso. */
  function salarioMinimo(emp, cfg) {
    cfg = cfg || DEFAULTS;
    const r = minimoBase(emp, cfg);
    // MDT-PRE-2026-002577: todo mínimo sectorial por debajo del SBU se iguala al SBU
    return r.valor < cfg.sbu ? Object.assign({}, r, { valor: cfg.sbu, fuente: `${r.fuente}; igualado al SBU` }) : r;
  }
  function minimoBase(emp, cfg) {
    const cargo = emp.cargoId ? (cfg.cargos || []).find((x) => x.id === emp.cargoId) : null;
    if (cargo && num(cargo.minimo) > 0) return { valor: num(cargo.minimo), fuente: `cargo «${cargo.nombre}»`, sectorial: true, exacto: true };
    const com = emp.comision ? (cfg.comisiones || []).find((x) => String(x.id) === String(emp.comision)) : null;
    if (!com) return { valor: cfg.sbu, fuente: 'SBU', sectorial: false };
    const cargados = Object.values(com.min || {}).map(num).filter((x) => x > 0);
    const exacto = emp.nivel && num((com.min || {})[emp.nivel]);
    if (exacto > 0) return { valor: exacto, fuente: `comisión N.º ${com.id}, nivel ${emp.nivel}`, sectorial: true, exacto: true };
    if (cargados.length) return { valor: Math.min(...cargados), fuente: `comisión N.º ${com.id} (piso: falta cargar el nivel ${emp.nivel || 'sin asignar'})`, sectorial: true, exacto: false };
    return { valor: cfg.sbu, fuente: `SBU (la comisión N.º ${com.id} no tiene mínimos cargados)`, sectorial: false };
  }

  /** Cargos en orden de organigrama (el jefe y debajo sus dependientes), con su profundidad para sangrar. */
  function cargosOrden(cfg) {
    const lista = (cfg || DEFAULTS).cargos || [], ids = new Set(lista.map((c) => c.id)), out = [], vistos = new Set();
    const rec = (padre, depth) => lista.filter((c) => (padre === '' ? !c.padre || !ids.has(c.padre) : c.padre === padre)).forEach((c) => {
      if (vistos.has(c.id)) return; vistos.add(c.id); out.push({ cargo: c, depth }); rec(c.id, depth + 1); });
    rec('', 0);
    lista.forEach((c) => { if (!vistos.has(c.id)) out.push({ cargo: c, depth: 0 }); }); // ciclos o datos raros: no se pierde ninguno
    return out;
  }

  /** Impuesto anual según tabla progresiva. */
  function impuestoAnual(base, cfg) {
    const t = (cfg.irTabla || DEFAULTS.irTabla).find((x) => base >= x.desde && (x.hasta === null || base <= x.hasta));
    return t ? t.base + (base - t.desde) * (t.pct / 100) : 0;
  }
  /** Tope anual de gastos personales: múltiplo de la canasta básica. */
  function topeGastos(cfg) {
    const c = cfg || DEFAULTS;
    return r2(c.canastas * c.canasta);
  }
  /** Retención mensual proyectada: ingresos anualizados − IESS → tabla → menos rebaja por gastos personales → ÷ 12. */
  function retencionMensual(aportable, iessMes, gastosAnuales, cfg) {
    const base = Math.max(0, (aportable - iessMes) * 12);
    const tope = topeGastos(cfg);
    const permitido = Math.min(num(gastosAnuales), tope, (cfg.topeIngresos / 100) * aportable * 12);
    const rebaja = (cfg.rebajaGastos / 100) * permitido;
    const imp = impuestoAnual(base, cfg);
    return { base: r2(base), impuestoAnual: r2(imp), tope, permitido: r2(permitido), rebaja: r2(rebaja), mensual: r2(Math.max(0, imp - rebaja) / 12) };
  }

  /**
   * emp: ficha. per: novedades del mes. cfg: parámetros. periodo 'YYYY-MM'.
   * Modos de décimos/fondos: 'mensualiza' (se paga en el rol), 'acumula' (se provisiona); fondos también admiten 'no'. Décimos 13 y 14 son obligatorios.
   */
  function calcular(emp, per, cfg, periodo) {
    cfg = cfg || DEFAULTS;
    per = per || {};
    const reg = cfg.regimenes[cfg.regimenActivo] || cfg.regimenes.ct;
    const avisos = [];

    const salario = num(emp.salario);
    const dias = Math.min(cfg.diasMes, Math.max(0, per.dias === undefined || per.dias === '' ? diasDefault(emp, periodo, cfg) : num(per.dias)));
    const jor = jornadaDe(emp, cfg);
    // Con jornada asignada: horas del mes = horas diarias × días del mes (8 h × 30 = 240). Sin jornada válida, el parámetro general.
    const horasMes = jor.horasMes > 0 ? jor.horasMes : cfg.horasMes;
    const valorHora = salario / horasMes;
    const minimo = salarioMinimo(emp, cfg);

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
    const obligatorio = (v) => (v === 'acumula' ? 'acumula' : 'mensualiza'); // décimos 13 y 14: nunca 'no'
    const d13 = obligatorio(emp.d13), d14 = obligatorio(emp.d14), fr = modo(emp.fr);
    const d13Pago = d13 === 'mensualiza' ? d13Base : 0;
    const d14Pago = d14 === 'mensualiza' ? d14Base : 0;
    const frPago = fr === 'mensualiza' ? frBase : 0;

    const totalIngresos = r2(aportable + otrosIng + d13Pago + d14Pago + frPago);

    const afiliado = emp.iess !== false;
    const iessEmp = afiliado ? r2((aportable * cfg.iessPersonal) / 100) : 0;
    let renta, rentaDet = null;
    if (emp.rentaModo === 'manual') renta = r2(num(emp.renta));
    else { rentaDet = retencionMensual(aportable, iessEmp, emp.gastosPersonales, cfg); renta = rentaDet.mensual; }
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

    const jm = cfg.jornadaMax || DEFAULTS.jornadaMax;
    if (salario > 0 && salario < cfg.sbu) avisos.push(`Salario menor al SBU (${cfg.sbu}).`);
    else if (salario > 0 && minimo.sectorial && salario < minimo.valor) avisos.push(`Salario menor al mínimo sectorial ${minimo.valor} (${minimo.fuente}).`);
    if (emp.comision && minimo.sectorial && !minimo.exacto) avisos.push(`No hay mínimo cargado para el nivel ${emp.nivel || '(sin asignar)'} de la comisión N.º ${emp.comision}: se usa el piso ${minimo.valor}. Complétalo en Ajustes.`);
    if (jor.horasDia > jm.diaria) avisos.push(`La jornada de ${jor.horasDia} h diarias supera el máximo legal de ${jm.diaria} h.`);
    if (jor.horasSem > jm.semanal) avisos.push(`La jornada de ${jor.horasSem} h semanales supera el máximo legal de ${jm.semanal} h.`);
    if (hSup + hExt > jm.extraSemana * 4) avisos.push(`Más de ${jm.extraSemana * 4} h extra al mes: revisa el tope (${jm.extraDia} h/día, ${jm.extraSemana} h/semana).`);
    if (!heOn && (num(per.hSup) || num(per.hExt) || num(per.hNoc))) avisos.push('Sin horas extras habilitadas: se ignoraron las horas.');
    if (fr !== 'no' && !frAplica) avisos.push('Fondos de reserva: aún no cumple 1 año, no se calcula.');
    if (num(per.dias) > cfg.diasMes) avisos.push(`Días mayores a ${cfg.diasMes}: se ajustó.`);
    if (totalEgresos > totalIngresos) avisos.push('Egresos superan ingresos: neto negativo.');

    return {
      dias, valorHora: r2(valorHora), horasMes, jornada: jor, minimo, sueldo, hSup, hExt, hNoc, pagoSup, pagoExt, pagoNoc, horasExtras, bonos, otrosIng,
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
  function utilidades(utilLiquida, filas) {
    // filas: [{id, dias}]; todo el 15% se reparte por días trabajados
    const total = r2(num(utilLiquida) * 0.15);
    const sumD = filas.reduce((a, f) => a + num(f.dias), 0);
    return { total, filas: filas.map((f) => ({ id: f.id, total: sumD ? r2((total * num(f.dias)) / sumD) : 0 })) };
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
    DEFAULTS, calcular, jornadaDe, cargosOrden, salarioMinimo, diasDefault, topeGastos, letras, r2, mesesAntiguedad, impuestoAnual, retencionMensual, finiquito, utilidades, CAUSAS, d360,
    cedulaValida, validarRUC, claveAcceso, claveValida, totalesDoc, TIPO_DOC,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EC = api;
})(typeof window !== 'undefined' ? window : globalThis);
