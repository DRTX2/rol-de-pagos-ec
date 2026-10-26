/* Datos de demostración (ficticios; cédulas y RUC con dígito verificador válido). */
(function () {
  'use strict';
  const App = window.App, EC = App.EC;

  App.seedDemo = () => {
    const S = App.blank();
    S.demo = true;
    S.periodo = '2026-10';
    S.empresa = { nombre: 'Andes Café Tostadores Cía. Ltda.', ruc: '1792210046001', direccion: 'Av. 6 de Diciembre N34-120 y Checoslovaquia, Quito', establecimiento: '001', punto: '001', ambiente: '1', regimen: 'General' };

    S.areas = [['a1', 'Administración'], ['a2', 'Producción'], ['a3', 'Ventas'], ['a4', 'Logística']].map(([id, nombre]) => ({ id, nombre }));
    S.cargos = [['Gerente general', 'a1'], ['Contador', 'a1'], ['Jefa de producción', 'a2'], ['Tostador maestro', 'a2'], ['Barista y atención', 'a3'], ['Ejecutivo de ventas', 'a3'], ['Bodeguero', 'a4'], ['Repartidora', 'a4'], ['Auxiliar de bodega', 'a4']]
      .map(([nombre, areaId], i) => ({ id: `g${i + 1}`, nombre, areaId }));
    const emp = (id, nombre, cedula, cargo, salario, ingreso, o = {}) => Object.assign({
      id, nombre, cedula, cargo, cargoId: (S.cargos.find((c) => c.nombre === cargo) || {}).id || '', regimen: 'ct', salario, ingreso, region: 'sierra',
      d13: 'mensualiza', d14: 'mensualiza', fr: 'mensualiza', horasExtras: true, iess: true,
      rentaModo: 'auto', renta: 0, gastosPersonales: 0,
    }, o);
    S.empleados = [
      emp('e1', 'Valeria Andrade Proaño', '1704821139', 'Gerente general', 2400, '2019-03-04', { d13: 'acumula', d14: 'acumula', fr: 'acumula', horasExtras: false, gastosPersonales: 7200 }),
      emp('e2', 'Santiago Paredes León', '1710332188', 'Contador', 1350, '2021-08-16', { d13: 'acumula', d14: 'mensualiza', fr: 'acumula', horasExtras: false, gastosPersonales: 4800 }),
      emp('e3', 'Daniela Cevallos Mena', '1709176547', 'Jefa de producción', 950, '2022-01-10', { d13: 'acumula', d14: 'acumula', fr: 'mensualiza', gastosPersonales: 3000 }),
      emp('e4', 'Marco Villacís Toapanta', '1005551203', 'Tostador maestro', 780, '2023-05-02', {}),
      emp('e5', 'Lucía Narváez Cobo', '1711904415', 'Barista y atención', 482, '2025-06-23', { d13: 'acumula', d14: 'acumula' }),
      emp('e6', 'Andrés Quishpe Yánez', '1707662035', 'Ejecutivo de ventas', 520, '2024-02-19', { horasExtras: false }),
      emp('e7', 'Jonathan Salazar Ruiz', '1712248705', 'Bodeguero', 500, '2026-04-10', { d13: 'acumula', d14: 'acumula', fr: 'no' }),
      emp('e8', 'Rosa Chicaiza Almeida', '0903441970', 'Repartidora', 560, '2022-09-05', { region: 'costa', d13: 'acumula' }),
    ];
    // Novedades de enero a octubre 2026 (determinísticas)
    for (let m = 1; m <= 10; m++) {
      const p = `2026-${String(m).padStart(2, '0')}`; S.periodos[p] = {};
      S.empleados.forEach((e, i) => {
        if (e.ingreso.slice(0, 7) > p) return;
        const n = {};
        if (e.horasExtras) {
          const hs = (i * 5 + m * 3) % 11; if (hs) n.hSup = String(hs);
          if ((i + m) % 3 === 0) n.hExt = String(2 + (m % 4));
          if (e.id === 'e5' && m % 2) n.hNoc = String(6);
        }
        if (e.id === 'e6') n.bonos = String(110 + ((m * 53) % 170));
        if (e.id === 'e7' && m % 3 === 0) n.anticipo = '80';
        if (e.id === 'e8' && m % 2 === 0) n.otrosIng = '25';
        if (e.id === 'e3' && m === 10) n.prestamos = '64.30';
        if (e.id === 'e1' && m === 10) n.otrosDesc = '35';
        S.periodos[p][e.id] = n;
      });
    }

    S.clientes = [
      { id: 'c1', nombre: 'Café Alameda S.A.', idTipo: 'ruc', ident: '1793348726001', direccion: 'Calle Juan León Mera N23-45, Quito', email: 'compras@cafealameda.example' },
      { id: 'c2', nombre: 'Hotel Mirador Cía. Ltda.', idTipo: 'ruc', ident: '1791834429001', direccion: 'Av. Amazonas y Naciones Unidas, Quito', email: 'adm@hotelmirador.example' },
      { id: 'c3', nombre: 'Panadería La Esquina - Gómez Pilco Luis', idTipo: 'ruc', ident: '1702123454001', direccion: 'Cumbayá, Calle Francisco de Orellana s/n', email: 'laesquina@correo.example' },
      { id: 'c4', nombre: 'Ortega Salcedo María Fernanda', idTipo: 'cedula', ident: '1703981272', direccion: 'Quito, La Floresta', email: 'mfortega@correo.example' },
      { id: 'c5', nombre: 'Agroexport Cumbayá S.A. (proveedor)', idTipo: 'ruc', ident: '1792096111001', direccion: 'Cumbayá, Vía Interoceánica km 12', email: 'ventas@agroexport.example' },
      { id: 'c6', nombre: 'CONSUMIDOR FINAL', idTipo: 'final', ident: '9999999999999', direccion: '', email: '' },
    ];
    S.productos = [
      { id: 'p1', codigo: 'CAF-1KG', nombre: 'Café en grano tostado 1 kg', precio: 14.5, iva: 15 },
      { id: 'p2', codigo: 'CAF-500M', nombre: 'Café molido 500 g', precio: 8, iva: 15 },
      { id: 'p3', codigo: 'CAP-10', nombre: 'Cápsulas compatibles x10', precio: 5.2, iva: 15 },
      { id: 'p4', codigo: 'CB-500', nombre: 'Cold brew botella 500 ml', precio: 3.8, iva: 15 },
      { id: 'p5', codigo: 'TAZ-AND', nombre: 'Taza cerámica Andes', precio: 6.5, iva: 15 },
      { id: 'p6', codigo: 'CAP-BAR', nombre: 'Capacitación de barismo (4 h)', precio: 120, iva: 15 },
      { id: 'p7', codigo: 'VERDE-69', nombre: 'Saco de café verde 69 kg', precio: 210, iva: 0 },
    ];
    S.checks = { '0-0': true, '0-1': true, '0-2': true, '0-3': true, '0-4': true, '1-0': true, '1-1': true, '1-2': true, '1-3': true, '3-0': true, '3-1': true, '3-2': true };

    // Liquidación de ejemplo (ex-empleado)
    const ex = emp('x1', 'Pedro Salazar Cobo', '1708755127', 'Auxiliar de bodega', 520, '2023-02-01', { d13: 'acumula', d14: 'acumula' });
    const opt = { salida: '2026-08-14', causa: 'despido', vacTomadas: 18, vacExtra: 0, utilidades: 0, fondosPend: 0, descuentos: 0 };
    S.finiquitos = [{ id: 'f1', fecha: '2026-08-14', emp: ex, opt, res: EC.finiquito(ex, opt, S.cfg) }];
    S.utilidades = { valor: 48000, anio: 2025 };

    App.replace(S); // necesario antes de emitir (usa App.S)
    const sri = App.sri, E = App.S.empresa;
    const cli = (id) => App.S.clientes.find((c) => c.id === id);
    const it = (pid, cant, desc = 0) => { const p = App.S.productos.find((x) => x.id === pid); return { cod: p.codigo, desc: p.nombre, cant, precio: p.precio, descuento: desc, iva: p.iva }; };
    const f1 = sri.emitir({ tipo: 'factura', fecha: '2026-10-02', receptor: cli('c1'), formaPago: 'Transferencia', items: [it('p1', 24), it('p2', 12, 4), it('p5', 6)] });
    const f2 = sri.emitir({ tipo: 'factura', fecha: '2026-10-05', receptor: cli('c2'), formaPago: 'Crédito 30 días', items: [it('p1', 40), it('p4', 60), it('p6', 1)] });
    sri.emitir({ tipo: 'guia', fecha: '2026-10-05', receptor: cli('c2'), ref: sri.refDe(f2), motivo: 'Venta', guia: { transportista: 'Rosa Chicaiza Almeida', transportistaId: '0903441970', placa: 'PBH-4821', partida: App.S.empresa.direccion, llegada: 'Av. Amazonas y Naciones Unidas, Quito', ini: '2026-10-05', fin: '2026-10-05' }, items: [it('p1', 40), it('p4', 60), it('p6', 1)].filter((x) => x.cod !== 'CAP-BAR') });
    sri.emitir({ tipo: 'notaCredito', fecha: '2026-10-09', receptor: cli('c1'), ref: sri.refDe(f1), motivo: 'Devolución de 4 unidades de Café en grano por empaque dañado', items: [it('p1', 4)] });
    sri.emitir({ tipo: 'notaDebito', fecha: '2026-10-14', receptor: cli('c2'), ref: sri.refDe(f2), motivo: 'Intereses por mora (factura vencida a 30 días)', items: [{ cod: 'INT', desc: 'Intereses por mora', cant: 1, precio: 18.9, descuento: 0, iva: 0 }] });
    sri.emitir({ tipo: 'retencion', fecha: '2026-10-08', receptor: cli('c5'), ref: { numero: '001-002-000004512', fecha: '2026-10-07', total: 1550 }, periodoFiscal: '10/2026',
      lineas: [{ impuesto: 'renta', codigo: '312', base: 1500, pct: 1.75 }, { impuesto: 'iva', codigo: '1', base: 225, pct: 30 }] });
    sri.emitir({ tipo: 'factura', fecha: '2026-10-15', receptor: cli('c4'), formaPago: 'Tarjeta de crédito', items: [it('p3', 5), it('p5', 2)] }, 'borrador');
    App.S.demo = true; App.save();
  };
})();
