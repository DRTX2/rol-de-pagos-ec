# Cómo funciona el rol de pagos

Documentación del sistema: qué hace cada pantalla, qué significa cada campo y cómo se calcula cada cifra. Todos los ejemplos usan los parámetros 2026 y se pueden reproducir en la aplicación.

- [1. Visión general](#1-visión-general)
- [2. Flujo de trabajo del mes](#2-flujo-de-trabajo-del-mes)
- [3. Ficha del empleado](#3-ficha-del-empleado)
- [4. Novedades del mes](#4-novedades-del-mes)
- [5. Cómo se calcula cada línea del rol](#5-cómo-se-calcula-cada-línea-del-rol)
- [6. Impuesto a la renta](#6-impuesto-a-la-renta)
- [7. Costo para la empresa](#7-costo-para-la-empresa)
- [8. Liquidación (finiquito)](#8-liquidación-finiquito)
- [9. Utilidades](#9-utilidades)
- [10. Simulador de comprobantes SRI](#10-simulador-de-comprobantes-sri)
- [11. Documentos y exportaciones](#11-documentos-y-exportaciones)
- [12. Parámetros legales y su origen](#12-parámetros-legales-y-su-origen)
- [13. Glosario](#13-glosario)
- [14. Límites conocidos](#14-límites-conocidos)

## 1. Visión general

Aplicación web sin servidor: todo se calcula en el navegador y los datos se guardan en el `localStorage` del equipo. No hay cuentas ni envío de información.

| Pantalla | Para qué sirve |
|---|---|
| Resumen | Neto total, reparto del costo, evolución mensual, vencimientos y alertas |
| Rol de pagos | Ingresar las novedades del mes y ver el rol de cada empleado |
| Empleados | Fichas con régimen, salario y beneficios |
| Liquidaciones | Finiquito y reparto de utilidades |
| Comprobantes, Clientes y productos | Simulador de factura, notas, guía de remisión y retención |
| Cumplimiento | Lista de obligaciones laborales y tributarias con su base legal |
| Herramientas | Validador de cédula, RUC y clave de acceso; calculadoras de horas extra y renta |
| Configuración | Empresa, parámetros legales (incluye jornadas, niveles y cargos), respaldo y borrado por módulo |

## 2. Flujo de trabajo

El Resumen muestra una guía de 4 pasos que se marcan solos:

1. **Configura la empresa** (Configuración): razón social, RUC válido y los cargos de la empresa (catálogo con jerarquía, en Parámetros legales).
2. **Agrega a tus empleados** (Empleados): una ficha por trabajador; el cargo se elige del catálogo.
3. **Carga las novedades del mes** (Rol de pagos): elige el periodo arriba e ingresa lo que cambió: días, horas extras, bonos, anticipos, préstamos y descuentos. Si no cambió nada, no escribas nada. Revisa los avisos.
4. **Imprime o exporta**: rol firmado por cada trabajador, consolidado y Excel.

Pasos 1 y 2 se hacen una vez; 3 y 4 se repiten cada mes («Copiar mes anterior» repite las novedades). Aparte del mes: décimos (diciembre y agosto/marzo), utilidades (abril) y liquidaciones al terminar un contrato.

## 3. Ficha del empleado

| Campo | Qué es | Efecto en el cálculo |
|---|---|---|
| Régimen laboral | Código del Trabajo o LOSEP | Define los recargos de las horas extras (editables en Configuración) |
| Región | Sierra y Oriente, o Costa y Galápagos | Fecha del décimo cuarto (15 de agosto o 15 de marzo); se usa en el finiquito |
| Salario mensual | Remuneración pactada | Base de todo el cálculo |
| Fecha de ingreso | Inicio de la relación laboral | Prorratea el primer mes y activa fondos de reserva al cumplir 12 meses |
| Décimo tercero | Obligatorio: cada mes o se acumula | «Cada mes» suma 1/12 al rol; «se acumula» lo provisiona para diciembre |
| Décimo cuarto | Obligatorio: cada mes o se acumula | «Cada mes» suma SBU/12; «se acumula» lo provisiona |
| Fondos de reserva | Ídem | «Cada mes» suma 8,33% desde el mes 13; «se acumula» significa que se deposita en el IESS a pedido del trabajador |
| Gastos personales al año | Proyección del trabajador | Genera una rebaja del impuesto a la renta (con tope) |
| Retención de renta | Automática o manual | Automática usa la tabla del SRI; manual usa el valor que indiques |
| Recibe horas extras | Sí o no | Cargos de dirección o confianza suelen no recibirlas |
| Afiliado al IESS | Sí o no | Si no, no se calculan aportes |

Estados de los beneficios:

| Estado | Entra al rol | Va a provisiones |
|---|---|---|
| Se paga cada mes | Sí | No |
| Se acumula | No | Sí |
| No aplica | No | No |

## 4. Novedades del mes

| Campo | Significado |
|---|---|
| Días trabajados | Hasta 30. Si no lo tocas, es el mes completo o, el mes de ingreso, desde la fecha de ingreso |
| Horas suplementarias | Hasta las 24h00 en días laborables. Recargo 50% |
| Horas extraordinarias | De 24h00 a 6h00, sábados, domingos y feriados. Recargo 100% |
| Horas nocturnas | Jornada normal entre 19h00 y 6h00. Recargo 25% sobre la hora |
| Bonos o comisiones | Pagos habituales; **aportan** al IESS, décimo tercero y fondos |
| Otros ingresos | Movilización, alimentación; **no aportan** |
| Anticipo | Adelanto de sueldo; se descuenta |
| Préstamos | Cuotas de préstamos IESS o de la empresa |
| Otros descuentos | Multas, convenios autorizados |

Todos los campos aceptan decimales y valores mayores al máximo del slider. Dejar un campo vacío lo devuelve a su valor por defecto.

## 5. Cómo se calcula cada línea del rol

Ejemplo: Juan Pérez, salario $800, ingresó el 15/01/2024, tres beneficios «cada mes». Novedades: 30 días, 10 h suplementarias, 4 h extraordinarias, bonos $50, otros ingresos $20, anticipo $100, préstamos $30, otros descuentos $5.

**Valor de la hora** = salario ÷ 240 = 800 ÷ 240 = 3,3333.

### Ingresos
| Línea | Fórmula | Valor |
|---|---|---|
| Sueldo | salario ÷ 30 × días | $800.00 |
| Horas suplementarias | valor hora × 1,5 × horas | $50.00 |
| Horas extraordinarias | valor hora × 2 × horas | $26.67 |
| Recargo nocturno | valor hora × 0,25 × horas | $0.00 |
| Bonos y comisiones | ingresado | $50.00 |
| Otros ingresos | ingresado | $20.00 |
| Décimo tercero | **base aportable** ÷ 12 | $77.22 |
| Décimo cuarto | SBU ÷ 12 × días/30 | $40.17 |
| Fondos de reserva | base aportable × 8,33% | $77.19 |
| **Total ingresos** | suma | **$1,141.25** |

**Base aportable** = sueldo + horas extras + bonos = 800 + 76,67 + 50 = **$926.67**. Es la base del IESS, del décimo tercero, de los fondos de reserva y de las provisiones. Los «otros ingresos» no entran.

### Egresos
| Línea | Fórmula | Valor |
|---|---|---|
| Aporte IESS | base aportable × 9,45% | $87.57 |
| Retención de renta | ver sección 6 | $0.00 |
| Anticipo, préstamos, otros | ingresados | $135.00 |
| **Total egresos** | suma | **$222.57** |

### Neto
**Neto a recibir = total ingresos − total egresos = 1.141,25 − 222,57 = $918.68.**

### Reglas que conviene recordar
- **Fondos de reserva** solo se calculan desde que el empleado cumple 12 meses; antes aparece $0.00 y un aviso.
- **Primer mes:** si el empleado ingresó el día 16, se pagan 15 días (año comercial de 30 días).
- **Día 31:** el sistema usa meses de 30 días, como la práctica laboral ecuatoriana.
- Los cálculos usan decimales completos y redondean a centavos solo al mostrar cada línea.

## 6. Impuesto a la renta

La retención mensual se obtiene proyectando el año:

1. **Base anual** = (base aportable − aporte IESS) × 12.
2. **Impuesto causado** según la tabla progresiva: impuesto base del tramo + % × (base − fracción básica del tramo).
3. **Rebaja por gastos personales** = 18% × el menor entre tus gastos del año, el tope anual de gastos y el 50% de los ingresos.
4. **Retención mensual** = (impuesto causado − rebaja) ÷ 12, nunca menor a cero.

Tabla 2026 (resolución NAC-DGERCGC25-00000043):

| Desde | Hasta | Impuesto base | % del excedente |
|---|---|---|---|
| 0 | 12.208 | 0 | 0% |
| 12.208 | 15.549 | 0 | 5% |
| 15.549 | 20.188 | 167 | 10% |
| 20.188 | 26.700 | 631 | 12% |
| 26.700 | 35.136 | 1.412 | 15% |
| 35.136 | 46.575 | 2.678 | 20% |
| 46.575 | 62.005 | 4.965 | 25% |
| 62.005 | 82.679 | 8.823 | 30% |
| 82.679 | 109.956 | 15.025 | 35% |
| 109.956 | en adelante | 24.572 | 37% |

Tope de gastos personales: 7 canastas familiares básicas de $821,80 = **$5.752,60** al año, con rebaja máxima de $1.035,47 (18%).

**Ejemplo:** sueldo $3.000, beneficios acumulados, gastos personales $8.000.
- IESS: 3.000 × 9,45% = 283,50. Base anual: (3.000 − 283,50) × 12 = **32.598**.
- Tramo 26.700 a 35.136: 1.412 + 15% × (32.598 − 26.700) = **2.296,70**.
- Gasto permitido = menor(8.000; 5.752,60) → rebaja 18% = 1.035,47 → retención (2.296,70 − 1.035,47) ÷ 12 = **$105.10**.

Si el sueldo anual proyectado no supera la fracción básica, la retención es $0.00 aunque no haya gastos.

## 7. Costo para la empresa

| Concepto | Fórmula | Ejemplo ($800 con extras y bonos) |
|---|---|---|
| Total ingresos pagados | del rol | $1,141.25 |
| Aporte patronal IESS | base aportable × 11,15% | $103.32 |
| Aporte personal IESS (informativo) | base aportable × 9,45%; se descuenta al empleado y ya está dentro de los ingresos, no suma al costo | $87.57 |
| Provisión décimo tercero (si se acumula) | base aportable ÷ 12 | — |
| Provisión décimo cuarto (si se acumula) | SBU ÷ 12 × días/30 | — |
| Provisión fondos de reserva (si se acumula) | base aportable × 8,33% | — |
| Provisión de vacaciones | base aportable ÷ 24 | $38.61 |
| **Costo total** | suma | **$1,283.18** |

La provisión de vacaciones equivale a 15 días por año (15/360 = 1/24 del sueldo).

La **planilla IESS** del mes es: aporte personal (retenido al trabajador) + patronal. SECAP e IECE están en 0 por defecto y se pueden reactivar en Configuración.

## 8. Liquidación (finiquito)

Pantalla **Liquidaciones → Finiquito**. Años de servicio con año comercial de 360 días; **la fracción de año cuenta como año completo** para desahucio e indemnización.

| Rubro | Fórmula |
|---|---|
| Sueldo pendiente | salario ÷ 30 × días del último mes (hasta 30) |
| Décimo tercero proporcional | salario × días desde el 1 de diciembre ÷ 360 (solo si se acumulaba) |
| Décimo cuarto proporcional | SBU × días del periodo ÷ 360 (solo si se acumulaba); periodo desde el 1 de agosto (Sierra) o 1 de marzo (Costa) |
| Vacaciones no gozadas | salario ÷ 30 × (15 días × años − días tomados + días adicionales) |
| Desahucio | 25% × último salario × años completos (desahucio y despido) |
| Indemnización por despido intempestivo | hasta 3 años de servicio: 3 salarios; más de 3 años: 1 salario por año, máximo 25 |
| Utilidades y fondos pendientes | los ingresas |
| Descuento | aporte IESS sobre el sueldo pendiente + otros |

**Ejemplo:** salario $600, ingreso 01/01/2024, salida 30/06/2026, despido intempestivo. Servicio: 2,5 años (3 completos). Indemnización 3 × 600 = **1.800**; desahucio 25% × 600 × 3 = **450**; décimo tercero acumulado 600 × 210 ÷ 360 = **350**.

## 9. Utilidades

15% de la utilidad líquida del ejercicio:

Se reparte entre los empleados según los **días trabajados** en el año.

Ejemplo: utilidad $100.000 → 15% = $15.000. Si un empleado trabajó 360 días y otro 180, el primero recibe 15.000 × 360 ÷ 540 = $10.000 y el segundo $5.000.

## 10. Simulador de comprobantes SRI

Herramienta académica; los documentos **no** se envían al SRI ni tienen validez tributaria.

| Documento | Uso | Reglas del simulador |
|---|---|---|
| Factura | Venta de bienes o servicios | IVA 15% o 0% por línea; consumidor final hasta $50 |
| Nota de crédito | Devoluciones, descuentos o anulaciones posteriores | Referencia una factura y no puede superar su total |
| Nota de débito | Valores adicionales (intereses, gastos) | Referencia una factura |
| Guía de remisión | Traslado de mercadería | Sin valores; transportista, placa, origen y destino |
| Retención | El comprador retiene renta o IVA al pagar | Base × porcentaje; códigos referenciales |

**Clave de acceso (49 dígitos):** fecha (8) + tipo de comprobante (2) + RUC (13) + ambiente (1) + serie (6) + secuencial (9) + código numérico (8) + tipo de emisión (1) + dígito verificador (1, módulo 11). Se puede verificar en Herramientas.

Flujo simulado de «Enviar al SRI»: generar XML → firmar → recepción → autorización → RIDE.

## 11. Documentos y exportaciones

| Salida | Contenido |
|---|---|
| Rol individual | A4 vertical: datos del empleado, ingresos y egresos alineados, neto, valor en letras, valores acumulados no pagados y firmas |
| Imprimir roles | Todos los roles, dos por página |
| Consolidado | A4 horizontal: todos los empleados, con áreas en color, totales y firmas de elaborado, revisado y aprobado |
| Excel (.xlsx) | Hoja «Rol de pagos» por áreas con color y totales con fórmulas; hoja «Parámetros» con los valores usados. La cédula queda como texto |
| CSV | Para otros sistemas; la cédula conserva ceros |
| Respaldo JSON | Todos los datos de la aplicación (Configuración → Datos) |

## 12. Parámetros legales y su origen

Verificados en octubre de 2026 con prensa y firmas legales; no se consultó el SRI ni el IESS directamente.

| Parámetro | Valor | Estado |
|---|---|---|
| SBU 2026 | $482 | Confirmado (Consejo Nacional de Trabajo y Salarios, 15-dic-2025) |
| Aporte personal / patronal IESS | 9,45% / 11,15% | Confirmado |
| SECAP e IECE | 0% (desactivados) | Se pueden reactivar en Configuración |
| IVA | 15% | Confirmado (circular SRI NAC-DGECCGC25-00000006) |
| Tabla de renta 2026 | ver sección 6 | Confirmado (NAC-DGERCGC25-00000043); fuentes de terceros |
| Canasta básica, tope de gastos y rebaja del 18% | $821,80; 7 canastas | **Confirmar con tu contador**: las fuentes no coinciden del todo |
| Recargos horas extras (LOSEP) | 25% / 100% / 25% | Editable; confirmar según tu caso |
| Códigos de retención SRI | varios | Referenciales |

Todos son editables en Configuración → Parámetros legales, con botón para restaurar los valores 2026.

## 13. Glosario

- **SBU:** salario básico unificado.
- **Base aportable:** sueldo + horas extras + bonos; base del IESS y de los beneficios.
- **Mensualizar:** pagar el beneficio cada mes en el rol.
- **Acumular / provisionar:** reservar el valor para pagarlo en su fecha legal.
- **Fracción básica:** parte del ingreso anual que no paga impuesto a la renta.
- **Rebaja por gastos personales:** crédito que se resta del impuesto, no de la base.
- **RDEP:** anexo de retenciones en relación de dependencia.
- **RIDE:** representación impresa del documento electrónico.
- **SUT:** Sistema Único de Trabajo del Ministerio de Trabajo.

## 14. Límites conocidos

- No genera la planilla del IESS ni el anexo RDEP.
- Los décimos del finiquito se calculan con el salario actual, sin reconstruir variaciones salariales pasadas.
- La proyección de renta supone ingresos constantes durante el año; no recalcula con meses anteriores.
- No incluye jornadas parciales, destajo ni trabajadores con sueldo variable por obra.
- Cálculo referencial: confirma con un contador antes de pagar o declarar.

## Jornada, niveles y salarios sectoriales (parametrizables en Configuración)
- **Jornada de trabajo:** cada empleado tiene una jornada (entrada, salida, almuerzo y días por semana). Horas diarias = salida − entrada − almuerzo; el valor de la hora es salario ÷ (horas diarias × días del mes), o sea 240 h con 8 h diarias. Los topes (8 h diarias, 40 semanales, 4 extra por día, 12 por semana) y el horario nocturno (19h00 a 06h00) se editan y generan alertas.
- **Niveles ocupacionales:** A jefatura, B supervisión, C operación, D asistencia, E soporte (A1, B1 a B3, C1 a C3, D1 y D2, E1 y E2). Se pueden agregar o renombrar.
- **Comisión sectorial:** solo la N.º 12, Tecnología: hardware y software, con su escala de salarios mínimos por nivel (Anexo CS 12 de los salarios mínimos sectoriales 2025, vigente en 2026): A1 $507.37, B1 $506.67, B2 $505.97, B3 $505.26, C1 $504.56, C2 $502.68, C3 $500.80, D1 $498.93, D2 $497.05, E2 $493.29 (E1 no tiene valor en la escala). Al elegir el cargo, la comisión y el nivel se fijan solos y la escala marca el salario mínimo. Si falta el nivel exacto se usa el menor valor de la comisión como piso, con alerta. Un salario menor al mínimo sectorial genera alerta. Se pueden agregar más comisiones en Configuración.
- **Remuneraciones:** cuadro mensual por empleado con régimen, jornada, aportes, décimos, fondos de reserva y RUM con y sin décimos, exportable a Excel.
- **Cargos:** catálogo editable en Configuración con los 7 cargos de Global Security, ordenados por jerarquía (cada cargo «reporta a» otro y se sangra bajo él) y con buscador. Cada cargo fija nivel, comisión y mínimo. Al crear un empleado se busca y elige el cargo (el selector muestra el organigrama con sangría y el nivel) y se llenan solos comisión, nivel y salario propuesto. Mínimos del Anexo 1 del MDT 2025, comisión 12 (vigente en 2026 según el oficio MDT-PRE-2026-002577). Todo mínimo por debajo del SBU se iguala al SBU.
- **Excel de ejemplo (UBIKAR):** en Configuración se puede cargar la hoja de referencia (gerente $2034 y administrador/contador $1212); la vista Remuneraciones reproduce sus cifras, incluidos los totales $3560.48 y $2939.25.
