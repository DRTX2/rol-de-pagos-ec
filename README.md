# Rol de Pagos EC

Sistema de rol de pagos parametrizable para Ecuador, con simulador de comprobantes electrónicos del SRI. App estática (HTML, CSS y JavaScript, sin backend ni build): los datos se guardan en el navegador.

**Demo:** https://drtx2.github.io/rol-de-pagos-ec/ — carga datos de demostración al primer ingreso.

## Módulos
- **Resumen:** neto a pagar, reparto del costo, evolución mensual, próximos vencimientos y revisión de datos.
- **Rol de pagos:** vista en vivo (sliders, el rol se recalcula al instante) y vista de tabla. Imprime rol individual, consolidado y exporta CSV.
- **Empleados:** régimen (Código del Trabajo, LOSEP, doméstico), salario, décimos y fondos de reserva (mensualiza / acumula / no aplica), horas extras, cargas, retención de renta automática (tabla SRI 2026) o manual.
- **Liquidaciones:** finiquito (renuncia, desahucio, despido intempestivo, etc.) y reparto del 15% de utilidades.
- **Comprobantes (simulador SRI):** factura, nota de crédito, nota de débito, guía de remisión y retención, con clave de acceso de 49 dígitos (módulo 11) y flujo de autorización simulado. Incluye RIDE imprimible.
- **Cumplimiento y herramientas:** checklist legal con referencias, validador de cédula/RUC y de clave de acceso, calculadoras.
- **Ajustes:** parámetros editables, respaldo JSON y borrado de datos por módulo o total (con deshacer).

## Probar
```
python3 -m http.server   # o abrir index.html
node test.js             # pruebas del motor de cálculo
```

## Aviso
Proyecto académico (Emprendimiento y Legislación Laboral). Los comprobantes son una simulación sin validez tributaria. Verifica SBU, tasas, tabla de renta y fechas con IESS, SRI y Ministerio de Trabajo antes de usarlo en una empresa real.
