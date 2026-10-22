# Especificación 004: Costos de Mantención Mensual por Tarjeta y Reparto Dinámico

- **Estado:** Borrador (revisado tras observaciones de QA)
- **Fecha:** 2026-10-22
- **Módulo:** `cards` & `dashboard` (`/api/v1/cards/{card_id}/fees`, `/api/v1/dashboard/summary`, `/api/v1/dashboard/projection`)

---

## 1. Resumen (QUÉ y POR QUÉ)

### QUÉ
Incorporar al sistema la capacidad de gestionar el costo de mantención mensual de cada tarjeta de crédito mediante dos mecanismos complementarios:
1. Una tarifa mensual base por defecto configurada a nivel de tarjeta (`default_monthly_fee`).
2. La posibilidad de registrar, consultar o sobreescribir mes a mes (`YYYY-MM`) el costo de mantención específico para una tarjeta determinada (`override`).

Asimismo, incorporar reglas de negocio deterministas para el cálculo y reparto de dicha mantención en la facturación mensual:
1. **Condición de uso y vigencia:** Si una tarjeta está inactiva (`is_active = False`) o no registra cuotas activas de compras a pagar en el período evaluado, la comisión de mantención **no se cobra** (se evalúa en $0$) y no figura en la deuda de la tarjeta ni en el consolidado general del mes.
2. **Reparto equitativo entre usuarios activos con ordenamiento determinista:** Si la tarjeta registra actividad en el mes, su costo de mantención se reparte equitativamente entre las personas distintas que tienen cuotas activas de compras en dicha tarjeta en ese período. La lista de personas se ordena de forma ascendente estricta por su identificador UUID (`person_id`). El prorrateo utiliza redondeo al piso (`ROUND_FLOOR`), garantizando matemáticamente que ningún participante ni residuo reciba valores negativos y que la suma de los aportes iguale exactamente la tarifa cobrada.

### POR QUÉ
Las instituciones financieras aplican cobros de mantención o administración de cuenta únicamente en aquellos períodos en que la tarjeta presenta movimientos o saldos a facturar. En compras y tarjetas compartidas (por ejemplo, en un hogar, pareja o grupo de personas), es injusto que el titular de la tarjeta o personas que no usaron la tarjeta ese mes asuman dicho costo operativo. La mantención debe distribuirse de forma automatizada, transparente y matemáticamente exacta únicamente entre los beneficiarios activos del período correspondiente.

---

## 2. Supuestos y Definiciones de Dominio

1. **Moneda de la Mantención:** La tarifa de mantención de una tarjeta se expresa y cobra siempre en la misma moneda oficial de la tarjeta (`CLP` o `USD`).
2. **Semántica Estricta de `{period}` (`payment_period`):**
   El parámetro `{period}` (en formato `YYYY-MM`) en las rutas `/api/v1/cards/{card_id}/fees/{period}` y en los DTOs de respuesta representa de forma unívoca el **período de vencimiento/pago (`payment_period`)**. Corresponde exactamente al mismo `period` consultado en `/api/v1/dashboard/summary?period=YYYY-MM` y proyectado en `/api/v1/dashboard/projection`. No representa la fecha de corte o facturación (`statement_period`).
3. **Tarifa Efectiva del Período:** Para una tarjeta $C$ y un período de vencimiento $P = (Y, M)$:
   - Si $C.\text{is\_active} == \text{False}$: La tarjeta se encuentra archivada/desactivada y la tarifa cobrada es siempre `0`.
   - Si la sumatoria de cuotas activas de compras de $C$ en $P$ es igual a cero ($\text{purchases\_total} == 0$): La tarjeta califica como sin uso en el período y la mantención cobrada es estrictamente `0`.
   - Si la tarjeta está activa y tiene cuotas a pagar ($\text{purchases\_total} > 0$):
     - Si existe una tarifa sobreescrita explícita registrada para $(C, P)$, la tarifa base $F$ es dicho monto y su origen es `source = FeeSourceEnum.OVERRIDE`.
     - De lo contrario, la tarifa base $F$ es `C.default_monthly_fee` (cuyo valor por defecto es `0`) y su origen es `source = FeeSourceEnum.CARD_DEFAULT`.
4. **Conjunto de Personas Activas $\mathcal{P}_C(P)$ y Ordenamiento Determinista:**
   Sea $\mathcal{P}_C(P)$ el conjunto de identificadores únicos de personas (`person_id`, UUID) que tienen asignada una cuota mayor a cero en al menos una compra activa (`Expense`) de la tarjeta $C$ con vencimiento en el período $P$.
   - **Orden determinista:** Los participantes se ordenan siempre de forma ascendente según su identificador UUID:
     $$\mathcal{P}_C(P) = [p_1, p_2, \dots, p_M] \quad \text{donde } p_1 < p_2 < \dots < p_M$$
   - **Vigencia de personas:** Si una persona está marcada como inactiva (`Person.is_active = False`), pero mantiene cuotas activas de compras vigentes en la tarjeta $C$ para el período $P$, **sí es considerada** en $\mathcal{P}_C(P)$ para el prorrateo de mantención, dado que los compromisos financieros adquiridos no se extinguen al desactivar el perfil.
5. **Fórmula de Prorrateo no negativo con `ROUND_FLOOR`:**
   Dada la tarifa efectiva $F \ge 0$, la unidad mínima monetaria $\text{quantum}$ (`1` para `CLP`, `0.01` para `USD`) y $M = |\mathcal{P}_C(P)|$ participantes ordenados:
   - Si $F == 0$ o $M == 0$: Para todo participante, $\text{fee\_share} = \text{Decimal("0")}$.
   - Si $M == 1$: El participante único asume $\text{share}_1 = F$.
   - Si $M > 1$:
     - Se calcula la cuota base por truncamiento / redondeo al piso:
       $$\text{base\_share} = \text{quantize\_floor}(F / M, \text{quantum})$$
     - Para los primeros $M - 1$ participantes ($i = 1, \dots, M - 1$):
       $$\text{share}_i = \text{base\_share}$$
     - Para el último participante ($i = M$):
       $$\text{share}_M = F - (\text{base\_share} \times (M - 1))$$
   - **Demostración de No Negatividad y Exactitud:**
     Por definición de redondeo al piso, $\text{base\_share} \le F / M$. Multiplicando por $(M - 1)$, se tiene $(M - 1) \times \text{base\_share} \le (M - 1) \times (F / M) = F - F/M$. Por lo tanto:
     $$\text{share}_M = F - (M - 1) \times \text{base\_share} \ge F - (F - F/M) = F / M \ge \text{base\_share} \ge 0$$
     Esto demuestra rigurosamente que $\text{share}_M \ge \text{base\_share} \ge 0$, impidiendo cualquier residuo negativo y garantizando la cuadratura exacta:
     $$\sum_{i=1}^{M} \text{share}_i = (M - 1) \times \text{base\_share} + [F - (M - 1) \times \text{base\_share}] \equiv F$$
6. **Alcance de `active_installments`:**
   La lista `active_installments` en el resumen del dashboard expone exclusivamente las cuotas vigentes de compras (`Expense`). Los costos de mantención de tarjeta son cargos operativos de cuenta y **no generan elementos** dentro de `active_installments`.

---

## 3. Requisitos Funcionales (Sintaxis EARS)

### 3.1 Configuración de Mantención en Tarjetas (`Card` y Tarifas por Período)

- **RF-01 (Mantención Base por Defecto en Creación y Edición de Tarjeta — Event-Driven / Optional / Unwanted Behavior):**
  - CUANDO un cliente crea una tarjeta (`POST /api/v1/cards`), el sistema DEBE permitir registrar el campo opcional `default_monthly_fee` (`numeric(14,2)` $\ge 0$). DONDE no se especifique, el sistema DEBE asignarle valor por defecto `0`.
  - CUANDO un cliente actualiza una tarjeta (`PATCH /api/v1/cards/{card_id}`), el sistema DEBE permitir modificar `default_monthly_fee` enviando un valor decimal $\ge 0$.
  - SI en la creación o actualización se envía `default_monthly_fee: null` o un valor estrictamente menor a `0`, ENTONCES el sistema DEBE rechazar la solicitud con código `422 Unprocessable Entity`.

- **RF-02 (Registro y Sobreescritura Idempotente de Mantención por Período — Event-Driven):**
  - CUANDO un cliente envía una petición `PUT /api/v1/cards/{card_id}/fees/{period}` con un cuerpo JSON de entrada:
    - Payload: `{"fee": Decimal}` con $\text{fee} \ge 0$ y rechazo estricto de campos adicionales (`extra="forbid"`).
    - Parámetro de ruta `{period}`: cadena válida en formato `YYYY-MM` representando el `payment_period`.
  - El sistema DEBE registrar o actualizar de forma atómica e idempotente la tarifa de mantención de esa tarjeta para dicho período y responder con código **`200 OK`** devolviendo el DTO `CardMonthlyFeeResponse`:
    - `card_id: UUID`
    - `period: str` (formato `YYYY-MM`)
    - `fee: Decimal` (normalizado al quantum de la moneda de la tarjeta)
    - `source: FeeSourceEnum` (con valor `"OVERRIDE"`)

- **RF-03 (Consulta de Tarifas de Mantención de una Tarjeta — Event-Driven / Optional):**
  - CUANDO un cliente envía `GET /api/v1/cards/{card_id}/fees`, el sistema DEBE responder con código **`200 OK`** devolviendo una lista `list[CardMonthlyFeeResponse]` ordenada cronológicamente de forma ascendente por `period`. SI la tarjeta no tiene tarifas registradas por período, el sistema DEBE responder con `200 OK` y una lista vacía `[]`.
  - CUANDO un cliente envía `GET /api/v1/cards/{card_id}/fees/{period}` indicando un `payment_period` en formato `YYYY-MM`, el sistema DEBE devolver con código **`200 OK`** la tarifa efectiva calculada para ese período en un `CardMonthlyFeeResponse`, indicando en `source`:
    - `"OVERRIDE"`: Si existe un registro explícito de mantención para ese período en la tarjeta.
    - `"CARD_DEFAULT"`: Si no existe registro explícito y se utiliza el valor configurado en `card.default_monthly_fee`.

- **RF-04 (Eliminación de Sobreescritura de Tarifa Mensual — Event-Driven / Unwanted Behavior):**
  - CUANDO un cliente envía `DELETE /api/v1/cards/{card_id}/fees/{period}` para una tarjeta existente con una sobreescritura previa en ese período de pago, el sistema DEBE eliminar dicho registro (restableciendo para ese período el uso de `default_monthly_fee`) y responder con código **`204 No Content`**.
  - SI no existe un override registrado para ese período en dicha tarjeta, ENTONCES el sistema DEBE responder con código **`404 Not Found`**.

- **RF-05 (Validación de Datos de Mantención y Existencia — Unwanted Behavior):**
  - SI una petición a los endpoints de mantención contiene un `fee < 0`, `default_monthly_fee < 0`, un formato de `period` que no cumpla con `^\d{4}-(0[1-9]|1[0-2])$`, o campos adicionales no reconocidos (`extra="forbid"`), ENTONCES el sistema DEBE rechazar la petición con código **`422 Unprocessable Entity`**.
  - SI el `card_id` especificado no existe en el catálogo de tarjetas, ENTONCES el sistema DEBE responder con código **`404 Not Found`**.

---

### 3.2 Reglas de Negocio en el Motor Financiero (`billing_engine`)

- **RF-06 (Exclusión de Mantención en Tarjetas Inactivas o Sin Uso — State-Driven / Ubiquitous):**
  - MIENTRAS una tarjeta tenga `is_active == False` O la suma de cuotas activas de compras a pagar en el período evaluado $P$ sea cero ($\text{purchases\_total} == 0$), el sistema DEBE fijar la mantención cobrada de esa tarjeta en `0` para dicho período.
  - SI una compra posee `first_billing_override` diferido a meses futuros y no presenta cuota a pagar en el período $P$, no aportará al $\text{purchases\_total}$; si la tarjeta no tiene otras compras con cuotas vigentes en $P$, la tarjeta califica como sin uso y su mantención cobrada DEBE ser `0`.

- **RF-07 (Identificación y Ordenamiento Determinista de Personas Activas — Ubiquitous):**
  - CUANDO una tarjeta activa tenga al menos una cuota activa de compra en el período evaluado $P$ ($\text{purchases\_total} > 0$), el sistema DEBE determinar el conjunto único de personas participantes $\mathcal{P}_C(P)$ ordenado estrictamente de forma ascendente por `person_id` (UUID).
  - MIENTRAS una persona participe en múltiples compras distintas de la misma tarjeta en ese período, el sistema DEBE contabilizarla como un único participante para efectos de la división de la mantención.
  - MIENTRAS una persona tenga `is_active == False`, SI posee cuotas activas asignadas en compras de la tarjeta en el período $P$, ENTONCES el sistema DEBE incluirla en $\mathcal{P}_C(P)$.

- **RF-08 (Prorrateo Equitativo con Redondeo al Piso y Cuadratura Exacta — Ubiquitous):**
  - MIENTRAS la tarjeta presente $M$ personas activas ($M \ge 1$) y una mantención efectiva $F > 0$ en el período $P$, el sistema DEBE calcular la cuota de cada participante ordenado aplicando redondeo al piso (`ROUND_FLOOR`):
    1. Si $M = 1$, la persona activa asume $\text{fee\_share} = F$.
    2. Si $M > 1$:
       - $\text{base\_share} = \text{quantize\_floor}(F / M, \text{quantum})$
       - Para $i = 1, \dots, M - 1$: $\text{share}_i = \text{base\_share}$.
       - Para $i = M$: $\text{share}_M = F - (\text{base\_share} \times (M - 1))$.
    3. Si $F = 0$: Para todo participante, $\text{fee\_share} = \text{Decimal("0")}$.
  - El sistema DEBE garantizar que $\text{share}_M \ge \text{base\_share} \ge 0$ y que $\sum_{i=1}^{M} \text{share}_i \equiv F$.

---

### 3.3 Integración en Dashboard y Resumen Mensual (`/dashboard`)

- **RF-09 (Reflejo de Mantención en Resumen Mensual `GET /api/v1/dashboard/summary` — Event-Driven / Ubiquitous):**
  - CUANDO un cliente consulta el resumen mensual (`?period=YYYY-MM`), el sistema DEBE calcular e incorporar la mantención según la siguiente estructura:
    1. En cada elemento de `by_card` (`CardMonthlySummary`):
       - DEBE incluir `purchases_total: Decimal` (suma de cuotas de compras en la tarjeta para el mes).
       - DEBE incluir `maintenance_fee: Decimal` (tarifa de mantención cobrada para esa tarjeta en el mes, `0` si la tarjeta no tuvo compras o estaba inactiva).
       - DEBE incluir `total_due: Decimal` (definido exactamente como `purchases_total + maintenance_fee`).
       - En cada elemento del sub-desglose `by_person` (`CardPersonBreakdown`):
         - DEBE incluir `purchases_amount: Decimal` (aporte del participante a las cuotas de compras).
         - DEBE incluir `fee_share: Decimal` (aporte asignado al participante por mantención).
         - DEBE incluir `amount_due: Decimal` (definido exactamente como `purchases_amount + fee_share`).
    2. En cada elemento de `by_person` (`PersonMonthlySummary`):
       - `totals_by_currency: dict[CurrencyEnum, Decimal]` DEBE corresponder a la sumatoria de todos los subtotales `amount_due` de esa persona a través de todas las tarjetas con actividad en ese período.
    3. En `totals_by_currency` a nivel de dashboard:
       - El total del período por moneda DEBE corresponder exactamente a la suma de `total_due` de todas las tarjetas activas con uso en dicho período.
    4. En `active_installments`:
       - DEBE mantenerse inalterado y listar **únicamente** las cuotas vigentes de compras (`Expense`).
    5. **Invariante de Cuadratura Financiera:**
       Para cada moneda, se DEBE verificar la equivalencia exacta:
       $$\text{totals\_by\_currency} \equiv \sum \text{by\_card.total\_due} \equiv \sum \text{by\_person.totals\_by\_currency}$$

- **RF-10 (Reflejo de Mantención en Proyecciones Multi-Mes `GET /api/v1/dashboard/projection` — Event-Driven / Ubiquitous):**
  - CUANDO un cliente consulta la proyección multi-mes, el sistema DEBE aplicar para cada período mensual proyectado la tarifa de mantención correspondiente (override registrado para ese mes o `default_monthly_fee`). SI en un mes proyectado futuro una tarjeta deja de tener cuotas vigentes, ENTONCES la mantención proyectada para esa tarjeta en dicho período DEBE ser evaluada en `0`.

---

## 4. Casos Límite (Edge Cases)

1. **Tarjeta sin uso en el mes:**
   - Tarjeta CMR con `default_monthly_fee = 4500` CLP.
   - En `2026-11` no registra cuotas activas de compras.
   - Resultado: `maintenance_fee = 0`. No aparece en `by_card` ni suma a `totals_by_currency`.
2. **Tarjeta archivada o inactiva (`Card.is_active = False`):**
   - Tarjeta con `default_monthly_fee = 3500` CLP y compras históricas vigentes, pero con `is_active = False`.
   - Resultado: No cobra mantención bajo ninguna circunstancia (`maintenance_fee = 0`).
3. **Compra diferida con `first_billing_override` a meses futuros:**
   - Tarjeta Visa sin otras compras activas. Se registra una compra con `first_billing_override = "2027-03"`.
   - Consulta de dashboard en `2026-11`: la compra no tiene cuota a pagar en este mes.
   - Resultado: La tarjeta no registra cuotas activas en `2026-11`, por lo que su mantención cobrada es `0`.
4. **Tarjeta con 1 sola persona activa:**
   - Tarjeta Visa con mantención efectiva de `$4.000` CLP.
   - Dos compras activas en el mes, ambas asignadas al 100% a "Anyi".
   - Resultado: $\mathcal{P}_C(P) = \{\text{Anyi}\}$. Anyi asume los `$4.000` completos de mantención (`fee_share = 4000`).
5. **Participante inactivo (`Person.is_active = False`) con compras previas vigentes:**
   - "Carlos" fue marcado como inactivo (`is_active = False`), pero tiene una compra en cuotas activa en la tarjeta compartida durante el período evaluado.
   - Resultado: Carlos **sí** forma parte de $\mathcal{P}_C(P)$ y se le asigna su cuota parte de la mantención en el desglose de la tarjeta.
6. **División en CLP con residuo positivo (`ROUND_FLOOR` con 3 personas y mantención $5.000 CLP):**
   - Participantes ordenados por `person_id` UUID: $P_1 < P_2 < P_3$.
   - Tarifa: $F = 5000$ CLP, $M = 3$, quantum = $1$.
   - $\text{base\_share} = \text{quantize\_floor}(5000 / 3, 1) = 1666$ CLP.
   - $P_1$: $1666$ CLP.
   - $P_2$: $1666$ CLP.
   - $P_3$ (último): $5000 - (1666 \times 2) = 5000 - 3332 = 1668$ CLP.
   - Suma: $1666 + 1666 + 1668 = 5.000$ CLP ($\text{share}_3 = 1668 \ge \text{base\_share} = 1666 \ge 0$, sin residuos negativos).
7. **División en USD con centavos (`ROUND_FLOOR` con 3 personas y mantención $10.00 USD):**
   - Participantes ordenados por UUID: $P_1 < P_2 < P_3$.
   - Tarifa: $F = 10.00$ USD, $M = 3$, quantum = $0.01$.
   - $\text{base\_share} = \text{quantize\_floor}(10.00 / 3, 0.01) = 3.33$ USD.
   - $P_1$: $3.33$ USD.
   - $P_2$: $3.33$ USD.
   - $P_3$ (último): $10.00 - (3.33 \times 2) = 10.00 - 6.66 = 3.34$ USD.
   - Suma: $3.33 + 3.33 + 3.34 = 10.00$ USD ($\text{share}_3 = 3.34 \ge \text{base\_share} = 3.33 \ge 0$).
8. **Tarifa efectiva configurada en cero ($F = 0$):**
   - Tarjeta activa con compras en el mes, pero `default_monthly_fee = 0` (o tarifa override `0`).
   - Resultado: Para todo participante $p \in \mathcal{P}_C(P)$, $\text{fee\_share} = \text{Decimal("0")}$, `maintenance_fee = Decimal("0")`.
9. **Eliminación de override inexistente (`DELETE /api/v1/cards/{card_id}/fees/{period}`):**
   - Se solicita eliminar un override en un período que nunca fue registrado explícitamente para esa tarjeta.
   - Resultado: Respuesta inmediata con código `404 Not Found`.
10. **Rechazo de `null` en `default_monthly_fee`:**
    - `PATCH /api/v1/cards/{card_id}` con payload `{"default_monthly_fee": null}`.
    - Resultado: Rechazo estricto con código `422 Unprocessable Entity`.
11. **Idempotencia en registro de tarifa (`PUT`):**
    - Se envía un `PUT /api/v1/cards/{card_id}/fees/{period}` con `{"fee": 3500}`.
    - Ya sea la primera vez que se registra o una actualización posterior, el endpoint responde con código `200 OK` y el DTO con `source = "OVERRIDE"`.

---

## 5. Criterios de Aceptación

- [ ] La especificación define con precisión el QUÉ y el POR QUÉ sin incluir código de implementación interna.
- [ ] La mantención es estrictamente `$0` para cualquier tarjeta sin cuotas activas en el período evaluado o con `is_active = False`.
- [ ] La mantención se divide de forma determinista entre los participantes ordenados por `person_id` (UUID ascendente).
- [ ] El prorrateo utiliza `ROUND_FLOOR`, garantizando matemáticamente que $\text{share}_M \ge \text{base\_share} \ge 0$ y eliminando residuos negativos.
- [ ] El parámetro `{period}` representa formalmente el período de vencimiento/pago (`payment_period`, `YYYY-MM`).
- [ ] `PUT /api/v1/cards/{card_id}/fees/{period}` es idempotente y responde siempre con `200 OK`.
- [ ] `DELETE /api/v1/cards/{card_id}/fees/{period}` responde `404 Not Found` si el override no existe.
- [ ] `active_installments` en el dashboard no se modifica y lista exclusivamente cuotas de compras (`Expense`).
- [ ] Los DTOs de `CardMonthlySummary` y `CardPersonBreakdown` incorporan de manera detallada los campos de desglose de compras, mantención y total debido.
- [ ] Todos los requisitos funcionales (`RF-01` a `RF-10`) están redactados en sintaxis EARS.
