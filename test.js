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
  const u = EC.utilidades(100000, [{ id: 'a', dias: 360, cargas: 2 }, { id: 'b', dias: 180, cargas: 0 }], cfg);
  assert.strictEqual(u.total, 15000);
  assert.strictEqual(u.filas[0].porDias, 6666.67);
  assert.strictEqual(u.filas[0].porCargas, 5000);
  assert.strictEqual(u.filas[1].porCargas, 0);

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
