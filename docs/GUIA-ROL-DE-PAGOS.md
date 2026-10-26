# Guía de validación del rol de pagos

> Para entender cada campo y cada fórmula, lee [COMO-FUNCIONA.md](COMO-FUNCIONA.md). Esta guía solo sirve para comprobar que los resultados son los esperados.

Cada paso trae el resultado esperado, calculado a mano y verificado con `node test.js` y con una prueba automática de la interfaz. Si tu pantalla muestra otra cifra, hay un error.

Parámetros usados (Configuración → Parámetros legales): SBU $482 · IESS personal 9,45% · patronal 11,15% · sin SECAP ni IECE (parámetros en 0) · fondos de reserva 8,33% · 240 horas al mes · 30 días.

## 0. Preparación
1. Abre https://drtx2.github.io/rol-de-pagos-ec/ (o `python3 -m http.server` y entra a `localhost:8000`).
2. Para partir sin datos: barra amarilla → **Empezar de cero**.
3. Arriba elige el periodo **octubre 2026** con las flechas.

## 1. Configuración y empleado
1. **Configuración → Empresa:** razón social y RUC (por ejemplo `1792210046001`).
2. **Configuración → Parámetros legales → Cargos:** revisa el catálogo de cargos (o agrega «Vendedor»).
3. **Empleados → Nuevo empleado:**
| Campo | Valor |
|---|---|
| Nombre | Juan Pérez López |
| Cargo | Vendedor (lista del catálogo) |
| Régimen | Código del Trabajo |
| Región | Sierra y Oriente |
| Salario | 800 |
| Fecha de ingreso | 15/01/2024 |
| Décimo tercero y cuarto (obligatorios), fondos de reserva | Se paga cada mes en el rol |
| Gastos personales | 0 |
| Retención de renta | Calcular con la tabla del SRI |
| Recibe horas extras / Afiliado al IESS | marcados |

La vista previa del formulario debe mostrar, sin novedades: ingresos **$973.48**, IESS **$75.60**, neto **$897.88**. Guarda.

## 2. Cargar las novedades (Rol de pagos → vista En vivo)
Selecciona a Juan en la lista de la izquierda y escribe (puedes mover el slider o teclear el número; ambos se sincronizan):

| Novedad | Valor |
|---|---|
| Días trabajados | 30 |
| Horas suplementarias | 10 |
| Horas extraordinarias | 4 |
| Bonos o comisiones | 50 |
| Otros ingresos | 20 |
| Anticipo | 100 |
| Préstamos | 30 |
| Otros descuentos | 5 |

## 3. Resultado esperado
**Ingresos**
| Línea | Cálculo | Valor |
|---|---|---|
| Sueldo | 800 ÷ 30 × 30 | $800.00 |
| Horas suplementarias | (800÷240) × 1,5 × 10 | $50.00 |
| Horas extraordinarias | (800÷240) × 2 × 4 | $26.67 |
| Bonos | | $50.00 |
| Otros ingresos | | $20.00 |
| Décimo tercero | 926,67 ÷ 12 | $77.22 |
| Décimo cuarto | 482 ÷ 12 | $40.17 |
| Fondos de reserva | 926,67 × 8,33% | $77.19 |
| **Total ingresos** | | **$1,141.25** |

**Egresos**
| Línea | Cálculo | Valor |
|---|---|---|
| Aporte IESS | 926,67 × 9,45% | $87.57 |
| Retención de renta | base anual $10,069 < $12,208 | $0.00 |
| Anticipo + préstamos + otros | 100 + 30 + 5 | $135.00 |
| **Total egresos** | | **$222.57** |

**Neto a recibir: $918.68.** En «Aportes y provisiones de la empresa»: patronal $103.32, aporte personal $87.57 (informativo: ya está dentro de los ingresos), provisión de vacaciones $38.61, costo total **$1,283.18**.

## 4. Pruebas de que no hay límites
1. **Decimales:** en horas suplementarias escribe `75.5`. El slider amplía su máximo, el número se queda en 75.5 y aparece el aviso de más de 48 horas extra (es un aviso, no un bloqueo).
2. **Vaciar un campo:** borra el valor de horas suplementarias; vuelve a su valor por defecto y el rol se recalcula.
3. **Salario no entero:** crea un empleado con salario `1234.567`. Se guarda y se calcula.
4. **Sin cédula ni fecha de ingreso:** se puede guardar; la cédula inválida solo genera aviso.
5. **Primer mes prorrateado:** crea a «Ana Nueva», salario 600, ingreso 16/10/2026. En octubre sus días salen en **15** y su neto en **$316.73** (sueldo 300 + décimo tercero 25 + décimo cuarto 20,08 − IESS 28,35).
6. **Ingreso en un mes futuro:** un empleado con ingreso 10/01/2027 hace que el periodo salte a enero 2027 (no aparece en octubre).
7. **Horas extras bloqueadas:** un empleado sin horas extras muestra el botón «Habilitar horas extras» en su panel.

## 5. Variantes de beneficios
Cambia a Juan (Empleados → Editar) y revisa:

| Cambio | Resultado esperado |
|---|---|
| Los tres beneficios en **Se acumula** y sin novedades | Ingresos $800.00 · IESS $75.60 · **neto $724.40**. Provisiones: 13º $66.67, 14º $40.17, fondos $66.64, vacaciones $33.33. Patronal $89.20 |
| Fecha de ingreso 01/06/2026 (menos de 12 meses) | Fondos de reserva $0.00 y aviso «aún no cumple 1 año» |
| Salario 3000 (sin gastos personales, beneficios acumulados) | IESS $283.50 · base anual $32,598 · impuesto $2,296.70 · **retención $191.39** · neto $2,525.11 |
| Igual, con gastos personales 8000 | Tope 7 canastas = $5,752.60 · rebaja 18% × 5,752.60 = $1,035.47 · **retención $105.10** · neto $2,611.40 |
| Retención: valor manual 25 | Retención exactamente $25.00, ignora la tabla |
| Régimen LOSEP | Horas suplementarias pagadas con recargo 25% (editable en Configuración) |

## 6. Salidas
1. **Rol individual:** botón «Rol individual» → hoja A4 con datos del empleado, ingresos y egresos alineados, neto, valor en letras y firmas. «Imprimir roles» pone dos por página.
2. **Consolidado:** botón «Consolidado» → hoja horizontal con todos los empleados, áreas con color, totales y firmas de elaborado, revisado y aprobado.
3. **Excel:** botón «Excel» → archivo .xlsx con colores por área (empleado, ingresos, egresos, neto, empresa), totales con fórmulas y la cédula como texto.
4. **CSV:** botón «CSV» → para otros programas; la cédula conserva sus ceros.
5. **Respaldo:** Configuración → Datos → Descargar respaldo; luego Borrar todo y Restaurar para comprobar que todo vuelve.
6. **Resumen:** el neto total, el reparto del costo y el gráfico mensual deben coincidir con la suma del rol.

## 7. Cambiar parámetros
En Configuración → Parámetros legales cambia el SBU a 500 y vuelve al rol de Juan: el décimo cuarto pasa a $41.67 (500÷12). El botón «Restaurar valores 2026» deja todo como estaba.
