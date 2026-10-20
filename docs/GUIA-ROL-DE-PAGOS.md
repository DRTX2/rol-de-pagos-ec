# Guía de validación del rol de pagos

Cada paso trae el resultado esperado, calculado a mano y verificado con `node test.js` y con una prueba automática de la interfaz. Si tu pantalla muestra otra cifra, hay un error.

Parámetros usados (Ajustes → Parámetros legales): SBU $482 · IESS personal 9,45% · patronal 11,15% · SECAP 0,5% · IECE 0,5% · fondos de reserva 8,33% · 240 horas al mes · 30 días.

## 0. Preparación
1. Abre https://drtx2.github.io/rol-de-pagos-ec/ (o `python3 -m http.server` y entra a `localhost:8000`).
2. Para partir sin datos: barra amarilla → **Empezar de cero**.
3. Arriba elige el periodo **octubre 2026** con las flechas.

## 1. Crear el empleado (Empleados → Nuevo empleado)
| Campo | Valor |
|---|---|
| Nombre | Juan Pérez López |
| Cargo | Vendedor |
| Régimen | Código del Trabajo |
| Región | Sierra y Oriente |
| Salario | 800 |
| Fecha de ingreso | 15/01/2024 |
| Décimo tercero, décimo cuarto, fondos de reserva | Se paga cada mes en el rol |
| Cargas, gastos personales | 0 |
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

**Neto a recibir: $918.68.** En «Aportes y provisiones de la empresa»: patronal $103.32, SECAP+IECE $9.26, provisión de vacaciones $38.61, costo total **$1,292.44**.

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
| Igual, con gastos personales 8000 | Rebaja 20% × 8000 = $1,600 · **retención $58.06** · neto $2,658.44 |
| Retención: valor manual 25 | Retención exactamente $25.00, ignora la tabla |
| Régimen LOSEP | Horas suplementarias pagadas con recargo 25% (editable en Ajustes) |

## 6. Salidas
1. **Rol individual:** botón «Rol individual» → vista de impresión con firma del empleador y del trabajador.
2. **Consolidado:** botón «Consolidado» → tabla de todos los empleados con totales.
3. **CSV:** botón «CSV» → abre en Excel con todas las columnas, incluidos aportes patronales y provisiones.
4. **Respaldo:** Ajustes → Datos → Descargar respaldo; luego Borrar todo y Restaurar para comprobar que todo vuelve.
5. **Resumen:** el neto total, el reparto del costo y el gráfico mensual deben coincidir con la suma del rol.

## 7. Cambiar parámetros
En Ajustes → Parámetros legales cambia el SBU a 500 y vuelve al rol de Juan: el décimo cuarto pasa a $41.67 (500÷12). El botón «Restaurar valores 2026» deja todo como estaba.
