const assert = require('assert');
const EC = require('./calc.js');
const cfg = EC.DEFAULTS;

// Sueldo 600, todo mensualizado, sin horas extras, 2 años de antigüedad
let r = EC.calcular({ regimen: 'ct', salario: 600, ingreso: '2024-01-10' }, { dias: 30 }, cfg, '2026-03');
assert.strictEqual(r.sueldo, 600);
assert.strictEqual(r.d13Base, 50);
assert.strictEqual(r.d14Base, 40.17); // 482/12
assert.strictEqual(r.frBase, 49.98); // 600*8.33%
assert.strictEqual(r.iessEmp, 56.7); // 600*9.45%
assert.strictEqual(r.totalIngresos, 740.15);
assert.strictEqual(r.neto, 683.45);
assert.strictEqual(r.patronal, 66.9);

// Horas extras: valor hora 2.5 (600/240); 10 sup al 50% = 37.5; 4 ext al 100% = 20
r = EC.calcular({ regimen: 'ct', salario: 600, ingreso: '2026-01-01', fr: 'no' }, { hSup: 10, hExt: 4 }, cfg, '2026-03');
assert.strictEqual(r.pagoSup, 37.5);
assert.strictEqual(r.pagoExt, 20);
assert.strictEqual(r.aportable, 657.5);
assert.strictEqual(r.frPago, 0); // < 1 año

// Acumula => no entra al ingreso, sí a provisión
r = EC.calcular({ regimen: 'ct', salario: 600, ingreso: '2020-01-01', d13: 'acumula', d14: 'acumula', fr: 'acumula' }, {}, cfg, '2026-03');
assert.strictEqual(r.totalIngresos, 600);
assert.strictEqual(r.prov13, 50);
assert.strictEqual(r.provFR, 49.98);

// Días parciales
r = EC.calcular({ regimen: 'ct', salario: 600, ingreso: '2020-01-01' }, { dias: 15 }, cfg, '2026-03');
assert.strictEqual(r.sueldo, 300);

// Antigüedad
assert.strictEqual(EC.mesesAntiguedad('2025-03-15', '2026-03'), 12);
assert.strictEqual(EC.mesesAntiguedad('2025-04-01', '2026-03'), 11);

// Cédula / RUC
assert.ok(EC.cedulaValida('1710034065'));
assert.ok(!EC.cedulaValida('1710034066'));
assert.ok(EC.validarRUC('1710034065001').valido);
assert.ok(!EC.validarRUC('1710034065000').valido);
assert.ok(EC.validarRUC('1760001550001').valido); // Municipio de Quito (público)
assert.ok(EC.validarRUC('1790016919001').valido); // Corporación Favorita (sociedad)
assert.ok(!EC.validarRUC('abc').valido);
console.log('OK');

// ---- v2: renta, finiquito, utilidades, comprobantes
{
  // base 2026: 20000 → 167?? no: 20000 está en tramo 15549-20188: 167 + 10%*(20000-15549)
  assert.strictEqual(EC.r2(EC.impuestoAnual(20000, cfg)), 612.1);
  assert.strictEqual(EC.impuestoAnual(10000, cfg), 0);
  assert.strictEqual(EC.r2(EC.impuestoAnual(120000, cfg)), 28288.28); // 24572 + 37%*(120000-109956)
  // empleado de 2000: aportable 2000, iess 189 → base (2000-189)*12=21732 → 631+12%*(21732-20188)=816.28
  let r = EC.calcular({ regimen: 'ct', salario: 2000, ingreso: '2020-01-01', d13: 'acumula', d14: 'acumula', fr: 'acumula', gastosPersonales: 0 }, {}, cfg, '2026-03');
  assert.strictEqual(r.rentaDet.impuestoAnual, 816.28);
  assert.strictEqual(r.renta, 68.02);
  // rebaja por gastos: 20% de 5000 = 1000 → impuesto 0
  r = EC.calcular({ regimen: 'ct', salario: 2000, ingreso: '2020-01-01', gastosPersonales: 5000 }, {}, cfg, '2026-03');
  assert.strictEqual(r.renta, 0);
  // modo manual
  r = EC.calcular({ regimen: 'ct', salario: 2000, ingreso: '2020-01-01', rentaModo: 'manual', renta: 10 }, {}, cfg, '2026-03');
  assert.strictEqual(r.renta, 10);

  // Finiquito: ingreso 2024-01-01, salida 2026-06-30, despido, ≤3 años → 3 sueldos + 25%×3 años
  const emp = { salario: 600, ingreso: '2024-01-01', d13: 'acumula', d14: 'acumula', region: 'sierra', iess: true };
  let f = EC.finiquito(emp, { salida: '2026-06-30', causa: 'despido', vacTomadas: 10 }, cfg);
  assert.strictEqual(f.diasServ, 900); // 2.5 años
  assert.strictEqual(f.aniosCompletos, 3);
  assert.strictEqual(f.indemn, 1800);
  assert.strictEqual(f.desahucio, 450);
  assert.strictEqual(f.sueldoPend, 600);
  assert.strictEqual(f.d13, 350); // 1-dic a 30-jun = 210 días
  assert.strictEqual(f.vacGen, 37.5);
  f = EC.finiquito(emp, { salida: '2026-06-30', causa: 'renuncia' }, cfg);
  assert.strictEqual(f.indemn + f.desahucio, 0);

  // Utilidades
  const u = EC.utilidades(100000, [{ id: 'a', dias: 360 }, { id: 'b', dias: 180 }], cfg);
  assert.strictEqual(u.total, 15000);
  assert.strictEqual(u.filas[0].total, 10000);
  assert.strictEqual(u.filas[1].total, 5000);

  // Clave de acceso
  const k = EC.claveAcceso({ fecha: '2026-10-15', tipo: 'factura', ruc: '1792210046001', ambiente: '1', serie: '001001', secuencial: 15, codigo: '12345678', emision: '1' });
  assert.strictEqual(k.length, 49);
  assert.ok(EC.claveValida(k));
  assert.ok(!EC.claveValida(k.slice(0, 48) + ((+k[48] + 1) % 10)));
  assert.ok(k.startsWith('15102026' + '01' + '1792210046001'));

  // Totales
  const t = EC.totalesDoc([{ cant: 2, precio: 10, descuento: 0, iva: 15 }, { cant: 1, precio: 5, descuento: 1, iva: 0 }], 15);
  assert.deepStrictEqual(t, { subIva: 20, sub0: 4, subtotal: 24, descuento: 1, iva: 3, total: 27 });
}
console.log('OK v2');

// ---- v3: ejemplo de la guía, días por defecto, decimales
{
  const emp = { regimen: 'ct', salario: 800, ingreso: '2024-01-15', d13: 'mensualiza', d14: 'mensualiza', fr: 'mensualiza' };
  const r = EC.calcular(emp, { dias: 30, hSup: 10, hExt: 4, bonos: 50, otrosIng: 20, anticipo: 100, prestamos: 30, otrosDesc: 5 }, cfg, '2026-10');
  assert.strictEqual(r.pagoSup, 50);
  assert.strictEqual(r.pagoExt, 26.67);
  assert.strictEqual(r.aportable, 926.67);
  assert.strictEqual(r.d13Pago, 77.22);
  assert.strictEqual(r.d14Pago, 40.17);
  assert.strictEqual(r.frPago, 77.19);
  assert.strictEqual(r.totalIngresos, 1141.25);
  assert.strictEqual(r.iessEmp, 87.57);
  assert.strictEqual(r.neto, 918.68);
  assert.strictEqual(r.costoEmpleador, 1283.18); // sin SECAP ni IECE (antes 1292.44, con $9.26)
  // primer mes prorrateado: ingreso el 16 → 15 días
  assert.strictEqual(EC.diasDefault({ ingreso: '2026-10-16' }, '2026-10', cfg), 15);
  assert.strictEqual(EC.diasDefault({ ingreso: '2026-10-01' }, '2026-10', cfg), 30);
  assert.strictEqual(EC.diasDefault({ ingreso: '2026-10-31' }, '2026-10', cfg), 1);
  assert.strictEqual(EC.diasDefault({ ingreso: '2025-01-05' }, '2026-10', cfg), 30);
  assert.strictEqual(EC.calcular({ regimen: 'ct', salario: 600, ingreso: '2026-10-16' }, {}, cfg, '2026-10').sueldo, 300);
  // valores decimales y texto numérico
  r2 = EC.calcular({ regimen: 'ct', salario: 1234.567, ingreso: '2024-01-15' }, { hSup: '2.5', bonos: '10.555' }, cfg, '2026-10');
  assert.ok(Number.isFinite(r2.neto) && r2.neto > 0);
  // valores basura no rompen el cálculo
  r2 = EC.calcular({ regimen: 'ct', salario: '', ingreso: '' }, { hSup: 'abc', dias: '' }, cfg, '2026-10');
  assert.strictEqual(r2.neto, 0);
}
console.log('OK v3');

// ---- v4: gastos personales (tope único), números a letras, décimos obligatorios
{
  const base = { regimen: 'ct', salario: 3000, ingreso: '2020-01-01', d13: 'acumula', d14: 'acumula', fr: 'acumula', gastosPersonales: 8000 };
  const r = EC.calcular(base, {}, cfg, '2026-10');
  assert.strictEqual(r.rentaDet.tope, 5752.6);
  assert.strictEqual(r.rentaDet.rebaja, 1035.47);
  assert.strictEqual(r.renta, 105.1);
  // décimos 13 y 14 nunca son 'no': un dato viejo con 'no' se trata como «cada mes»
  const x = EC.calcular({ regimen: 'ct', salario: 600, ingreso: '2020-01-01', d13: 'no', d14: 'no', fr: 'no' }, {}, cfg, '2026-10');
  assert.strictEqual(x.d13Pago, 50);
  assert.strictEqual(x.d14Pago, 40.17);
  assert.strictEqual(x.frPago, 0);
  // el régimen doméstico ya no existe
  assert.ok(!('domestico' in cfg.regimenes));
  assert.strictEqual(EC.letras(918.68), 'NOVECIENTOS DIECIOCHO CON 68/100 DÓLARES');
  assert.strictEqual(EC.letras(2138.2), 'DOS MIL CIENTO TREINTA Y OCHO CON 20/100 DÓLARES');
  assert.strictEqual(EC.letras(21000), 'VEINTIÚN MIL CON 00/100 DÓLARES');
  assert.strictEqual(EC.letras(1000000.5), 'UN MILLÓN CON 50/100 DÓLARES');
  assert.strictEqual(EC.letras(100), 'CIEN CON 00/100 DÓLARES');
  assert.strictEqual(EC.letras(0), 'CERO CON 00/100 DÓLARES');
  assert.strictEqual(EC.letras(35.01), 'TREINTA Y CINCO CON 01/100 DÓLARES');
}
console.log('OK v4');

// Jornada, niveles y comisiones sectoriales (parametrizables)
{
  const c0 = EC.DEFAULTS;
  const comp = EC.jornadaDe({ jornada: 'completa' }, c0), par = EC.jornadaDe({ jornada: 'parcial' }, c0), noc = EC.jornadaDe({ jornada: 'nocturna' }, c0);
  assert.strictEqual(comp.texto, '08H00 A 17H00');
  assert.strictEqual(comp.horasDia, 8); assert.strictEqual(comp.horasSem, 40); assert.strictEqual(comp.horasMes, 240);
  assert.strictEqual(par.horasMes, 120); // media jornada: la hora vale el doble que dividir entre 240
  assert.strictEqual(noc.nocDia, 8); // 22h00 a 06h00 cae completo en el horario nocturno
  // valor hora sigue la jornada: 600 / 120 = 5
  let r2_ = EC.calcular({ regimen: 'ct', salario: 600, ingreso: '2020-01-01', jornada: 'parcial' }, { hSup: 2 }, c0, '2026-03');
  assert.strictEqual(r2_.valorHora, 5); assert.strictEqual(r2_.pagoSup, 15);
  // Jornada propia editada en parámetros
  const cc = JSON.parse(JSON.stringify(c0)); cc.jornadas.push({ id: 'x', nombre: 'X', ini: '07:00', fin: '17:00', almuerzo: 1, diasSem: 6 });
  r2_ = EC.calcular({ regimen: 'ct', salario: 600, ingreso: '2020-01-01', jornada: 'x' }, {}, cc, '2026-03');
  assert.ok(r2_.avisos.some((a) => a.includes('semanales'))); // 9 h × 6 = 54 h > 40
  assert.ok(r2_.avisos.some((a) => a.includes('diarias')));
  // Salario mínimo sectorial (comisión 12): exacto, piso y SBU
  assert.strictEqual(EC.salarioMinimo({ comision: 12, nivel: 'C1' }, c0).valor, 504.56);
  assert.strictEqual(EC.salarioMinimo({ comision: 12, nivel: 'A1' }, c0).valor, 507.37);
  assert.strictEqual(EC.salarioMinimo({ comision: 12, nivel: 'E2' }, c0).valor, 493.29);
  assert.strictEqual(EC.salarioMinimo({ comision: 12, nivel: 'E1' }, c0).exacto, false); // E1 no tiene valor: piso de la comisión
  assert.strictEqual(EC.salarioMinimo({ comision: 99 }, c0).valor, 482); // comisión inexistente: SBU
  assert.strictEqual(EC.salarioMinimo({}, c0).valor, 482);
  r2_ = EC.calcular({ regimen: 'ct', salario: 505, ingreso: '2020-01-01', comision: 12, nivel: 'C1' }, {}, c0, '2026-03');
  assert.strictEqual(r2_.avisos.length, 0); // 505 ≥ 504.56
  r2_ = EC.calcular({ regimen: 'ct', salario: 500, ingreso: '2020-01-01', comision: 12, nivel: 'C1' }, {}, c0, '2026-03');
  assert.ok(r2_.avisos.some((a) => a.includes('mínimo sectorial'))); // 500 < 504.56
  assert.strictEqual(c0.comisiones.length, 1); // solo las pertinentes para software
  // Cuadro de remuneraciones (hoja de referencia): 2034 → patronal 226.79, personal 192.21, 13º mensual 169.50, FR 169.43
  assert.strictEqual(EC.r2(2034 * 11.15 / 100), 226.79); assert.strictEqual(EC.r2(2034 * 9.45 / 100), 192.21);
  assert.strictEqual(EC.r2(2034 / 12), 169.5); assert.strictEqual(EC.r2(2034 * 8.33 / 100), 169.43);
  assert.strictEqual(EC.r2(2034 - 192.21 + 40.17 + 169.5 + 169.43), 2220.89);
}
console.log('OK v5');

// Cargos del catálogo y piso del SBU (oficio MDT-PRE-2026-002577)
{
  const c0 = EC.DEFAULTS, cargo = (n) => c0.cargos.find((x) => x.nombre === n).id;
  assert.strictEqual(EC.salarioMinimo({ cargoId: cargo('Gerente general') }, c0).valor, 507.37);
  assert.strictEqual(EC.salarioMinimo({ cargoId: cargo('Desarrollador 2 (junior)') }, c0).valor, 500.8);
  assert.strictEqual(EC.salarioMinimo({ cargoId: cargo('Asistente administrativo-comercial') }, c0).valor, 493.29);
  const bajo = JSON.parse(JSON.stringify(c0)); bajo.cargos[0].minimo = 470;
  assert.strictEqual(EC.salarioMinimo({ cargoId: bajo.cargos[0].id }, bajo).valor, 482); // por debajo del SBU se iguala
  assert.strictEqual(c0.comisiones.find((m) => m.id === 12).min.A1, 507.37);
  assert.strictEqual(c0.cargos.length, 7); // los cargos de Global Security
  const ord = EC.cargosOrden(c0); // jerarquía: gerente, luego sus tres dependientes y bajo el jefe técnico sus tres
  assert.deepStrictEqual(ord.map((x) => x.depth), [0, 1, 2, 2, 2, 1, 1]);
  assert.strictEqual(ord[0].cargo.nombre, 'Gerente general');
}
console.log('OK v6');
