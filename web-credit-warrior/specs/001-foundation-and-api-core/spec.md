# Especificación 001 — Fundación Visual, Reglas de Precisión y Núcleo de Comunicación API (`001-foundation-and-api-core`)

- **Estado:** aprobado
- **Versión:** 1.0.0
- **Fecha:** 2026-10-16

---

## 1. Propósito y Contexto Funcional (QUÉ y POR QUÉ)

### 1.1 Qué se construye
Esta especificación define los cimientos funcionales, visuales, de seguridad y de comunicación con el servidor para **Credit Warrior Web** (`web-credit-warrior`), la plataforma de gestión de compras en tarjetas de crédito compartidas y seguimiento de cuotas multimoneda (`CLP` y `USD`).

Su alcance establece:
1. **Identidad Visual Dark Mode First y Tipografía Financiera**: Un sistema visual de alto contraste inspirado en banca privada contemporánea y terminales financieras de precisión, con codificación cromática para monedas (`CLP` y `USD`), estados de alerta y tipografía tabular para cifras monetarias.
2. **Experiencia Instalable (PWA) y Seguridad de Presentación**: Capacidad de instalación en dispositivos móviles y de escritorio en modo aplicación independiente (`standalone`), junto con garantías estrictas contra inyección de contenido, enmascaramiento de datos de tarjeta y ausencia de diálogos bloqueantes nativos del navegador.
3. **Inmutabilidad Monetaria y Cero Cálculos Financieros en Cliente**: Manejo exclusivo de montos y porcentajes como cadenas de texto (`string`) para erradicar errores de redondeo de punto flotante, delegando el 100% de los cálculos de facturación, vencimiento, amortización de cuotas y absorción de residuos al backend (`api-credit-warrior`).
4. **Comunicación Estandarizada con el Backend y Validación Previa de Contratos**: Integración completa con los 19 endpoints del contrato OpenAPI (`/health`, `/api/v1/cards`, `/api/v1/persons`, `/api/v1/expenses` y `/api/v1/dashboard`), limpieza de filtros opcionales, validación estricta sin propiedades extra (`additionalProperties: false`), normalización de errores (`400`, `404`, `409`, `422` y red) y sincronización automática de datos tras cada cambio.
5. **Primitivas Visuales Compartidas del Dominio**: Componentes base reutilizables para representar montos monetarios, divisas (`CLP`/`USD`), participantes con su color identificador (`color_hex`), estados vacíos accionables y notificaciones no bloqueantes.

### 1.2 Por qué es necesario
Registrar gastos compartidos y auditar cuánto debe pagar cada persona mes a mes exige confianza absoluta en los números mostrados y rapidez de uso desde el teléfono móvil inmediatamente después de realizar una compra. Sin una fundación que garantice precisión decimal basada en `string`, validación previa idéntica a la del servidor, actualización automática de resúmenes mensuales y una interfaz oscura legible al instante, las pantallas de negocio sufrirían inconsistencias visuales, errores `422` inesperados o desincronización entre compras registradas y saldos del dashboard.

---

## 2. Reglas Innegociables del Dominio

1. **Capa de Presentación Pura (Zero Financial Math on Client)**:
   El cliente jamás calcula fechas de facturación/corte (`closing_date`), fechas de vencimiento (`due_date`), valores de cuota (`installment_amount`), períodos contables (`statement_period`, `payment_period`) ni absorción de residuos de redondeo en la primera cuota (`1/N`) o en el último participante. Todo valor financiero proviene directamente del backend.
2. **Montos Monetarios y Porcentajes como `string`**:
   Todos los valores monetarios y porcentuales (`total_amount`, `installment_amount`, `amount_due`, `total_due`, `percentage`, `fixed_amount`, `amount` y los valores dentro de `totals_by_currency`) se almacenan, validan, envían y reciben exclusivamente como `string` (`"100000"` para `CLP`, `"33.34"` para `USD`).
3. **Sin Autenticación en el MVP**:
   La aplicación opera sin pantallas de inicio de sesión ni cabeceras de autorización. Los participantes de los gastos compartidos son entidades maestras `Person` administradas directamente en el sistema.

---

## 3. Requisitos Funcionales (Formato EARS) y Criterios de Aceptación

### RF-01: Identidad Visual Dark Mode First y Paleta Semántica Financiera
**EL SISTEMA DEBERÁ** aplicar de forma predeterminada e invariable el tema oscuro de alta precisión visual utilizando los siguientes tokens semánticos de color:
- Fondo principal de aplicación: `#090A0F` (Obsidian Ink).
- Superficie de contenedores, tarjetas y paneles modales: `#12141C`.
- Superficie elevada e interactiva (estados activos, filas resaltadas, controles de entrada): `#1A1D28`.
- Bordes estructurales divisorios de `1px`: `#232736`.
- Texto principal y cifras titulares: `#F3F5F8` (Alabaster White).
- Texto secundario y metadatos (fechas de corte/vencimiento, etiquetas de apoyo): `#8A93A6`.
- Acento semántico para Pesos Chilenos (`CLP`): `#10B981` (Emerald Mint).
- Acento semántico para Dólares Estadounidenses (`USD`): `#38BDF8` (Cyan Sky).
- Acento semántico de advertencia y conflicto (`409 Conflict`): `#F59E0B` (Amber Alert).
- Acento semántico de error (`422`) y acción destructiva: `#F43F5E` (Crimson Rose).

**Criterios de Aceptación:**
- [ ] Al iniciar la aplicación en cualquier dispositivo o preferencia de sistema operativo, el fondo principal se renderiza en `#090A0F` y el texto principal en `#F3F5F8` sin parpadeos de tema claro.
- [ ] Las divisas `CLP` y `USD` utilizan consistentemente sus colores semánticos `#10B981` y `#38BDF8` para diferenciación visual inmediata.

---

### RF-02: Sistema Tipográfico Dual y Alineación Numérica Tabular
**EL SISTEMA DEBERÁ** presentar todos los textos descriptivos, títulos, navegación y etiquetas de interfaz con la familia tipográfica geométrica `Plus Jakarta Sans`, y **MIENTRAS** se rendericen cifras monetarias, porcentajes, números de cuota (`1/3`), períodos (`YYYY-MM`) o últimos 4 dígitos de tarjetas (`•••• 1234`), **EL SISTEMA DEBERÁ** aplicar la familia monoespaciada `JetBrains Mono` con variante numérica tabular (`tabular-nums`) y alineación a la derecha en listas y tablas comparativas.

**Criterios de Aceptación:**
- [ ] Todos los montos, porcentajes, etiquetas de cuota (`installment_label`), períodos y máscaras de tarjeta utilizan `JetBrains Mono` con `font-variant-numeric: tabular-nums`.
- [ ] En cualquier lista vertical de montos de una misma moneda, las cifras quedan alineadas verticalmente dígito a dígito a la derecha.

---

### RF-03: Experiencia Instalable PWA y Endurecimiento de Seguridad en el Cliente
**EL SISTEMA DEBERÁ** exponer un manifiesto de aplicación web y soporte de instalación como Progressive Web App (PWA) con visualización independiente (`standalone`), orientación vertical preferente, color de tema `#090A0F` e iconos de aplicación; asimismo, **EL SISTEMA DEBERÁ** proteger la interfaz aplicando auto-escaping a todo dato proveniente de la API, cabeceras HTTP de seguridad (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`), ejecución local restringida a `127.0.0.1` y prohibición total de inyección HTML cruda, diálogos nativos del navegador (`alert`, `confirm`, `prompt`) y volcado de datos financieros en consola.

**Criterios de Aceptación:**
- [ ] El manifiesto web declara `display: "standalone"`, `background_color: "#090A0F"`, `theme_color: "#090A0F"` e iconos `192x192` y `512x512`.
- [ ] Si un nombre de tarjeta, persona, descripción o nota contiene caracteres especiales o etiquetas como `<script>alert(1)</script>`, el sistema los muestra literalmente como texto plano inofensivo.
- [ ] Las respuestas del servidor web incluyen las cabeceras de seguridad configuradas y el entorno de desarrollo enlaza únicamente a `127.0.0.1`.

---

### RF-04: Inmutabilidad de Montos como `string` y Prohibición de Aritmética Financiera
**CUANDO** el sistema reciba, almacene en memoria, valide en formularios o transmita hacia el backend cualquier monto monetario o porcentaje (`total_amount`, `installment_amount`, `amount_due`, `total_due`, `percentage`, `fixed_amount`, `amount`, `totals_by_currency`), **EL SISTEMA DEBERÁ** preservar el valor estrictamente como `string` numérico sin convertirlo a punto flotante para cálculos de negocio, y **EL SISTEMA DEBERÁ** abstenerse de calcular en el cliente fechas de corte, fechas de vencimiento, valores de cuota o repartos de residuos.

**Criterios de Aceptación:**
- [ ] Los contratos de datos de entrada y salida tipan todos los campos monetarios y porcentuales como `string`.
- [ ] Los payloads enviados en creación y edición de compras (`POST /api/v1/expenses` y `PUT /api/v1/expenses/{expense_id}`) serializan `total_amount`, `percentage` y `fixed_amount` como `string`.
- [ ] No existe ninguna función en el cliente que divida `total_amount / installments_count` ni que deduzca `closing_date` o `due_date`.

---

### RF-05: Formateo Visual Puro y Conversión a Unidades Enteras para Validación de Sumas
**CUANDO** se presente en pantalla un dato financiero, fecha, período o identificador de tarjeta, **EL SISTEMA DEBERÁ** formatearlo visualmente sin mutar el `string` subyacente conforme a las siguientes reglas:
1. **Moneda `CLP`**: Formato entero sin decimales con símbolo `$` y separador de miles con punto (ej. `"100000"` -> `$100.000`, `"0"` -> `$0`).
2. **Moneda `USD`**: Formato con exactamente 2 decimales y prefijo `US$` (ej. `"33.34"` -> `US$33.34`, `"30"` -> `US$30.00`, `"0.00"` -> `US$0.00`).
3. **Porcentajes**: Formato con 2 decimales y sufijo `%` (ej. `"70"` o `"70.00"` -> `70.00%`, `"33.33"` -> `33.33%`).
4. **Períodos (`YYYY-MM`)**: Formato legible en español (ej. `"2026-11"` -> `Noviembre 2026` en versión extendida o `Nov 2026` en versión compacta) sin desfase horario.
5. **Fechas (`YYYY-MM-DD`)**: Formato legible en español (ej. `"2026-10-16"` -> `16 oct 2026`) interpretado como fecha civil local sin desplazamiento por zona horaria UTC.
6. **Últimos 4 dígitos (`last_four_digits`)**: Formato enmascarado `•••• 1234` cuando contiene 4 dígitos; **SI** `last_four_digits` es `null` o vacío, **ENTONCES** no se muestra máscara ni texto residual.
7. **Verificación de sumas en formularios de reparto**: Conversión determinista de strings numéricos a unidades enteras (centavos/centésimas) mediante separación de parte entera y decimal, utilizada exclusivamente para validar que los porcentajes sumen exactamente `100.00%` (`10000` centésimas) y los montos fijos sumen exactamente `total_amount`.

**Criterios de Aceptación:**
- [ ] `"150000"` en `CLP` se formatea como `$150.000` y `"45.50"` en `USD` se formatea como `US$45.50`.
- [ ] Una fecha `"2026-10-25"` se muestra siempre como día `25` de octubre de `2026` independientemente del huso horario del navegador.
- [ ] La validación entera de `"33.33"`, `"33.33"` y `"33.34"` produce exactamente `10000` centésimas (`100.00%`) sin errores de coma flotante.

---

### RF-06: Cliente de Comunicación HTTP, Limpieza de Parámetros y Estado de Salud (`/health`)
**CUANDO** el sistema realice peticiones hacia el backend (`api-credit-warrior`), **EL SISTEMA DEBERÁ**:
1. Invocar el chequeo de salud en `GET /health` en la raíz del servidor y todos los recursos de negocio bajo el prefijo `/api/v1`.
2. Omitir automáticamente de la URL cualquier parámetro de consulta (`query param`) opcional cuyo valor sea `undefined`, `null` o cadena vacía `""`.
3. Procesar respuestas `204 No Content` en operaciones de eliminación (`DELETE`) resolviendo exitosamente sin intentar parsear contenido JSON.

**Criterios de Aceptación:**
- [ ] Al consultar listas con filtros vacíos (ej. `{ is_active: undefined, currency: undefined }` o `{ card_id: "", person_id: null }`), la URL generada no incluye `?is_active=` ni `?card_id=`.
- [ ] Las peticiones `DELETE` que responden `204 No Content` finalizan con éxito sin arrojar errores de sintaxis JSON.
- [ ] La consulta a `GET /health` permite verificar si el backend se encuentra operativo.

---

### RF-07: Normalización de Errores HTTP (`400`, `404`, `409`, `422`) y Fallos de Red
**SI** el backend responde con un código de estado HTTP no exitoso (`>= 400`) o ocurre una falla de conexión de red, **ENTONCES EL SISTEMA DEBERÁ** transformar el fallo en una estructura de error tipada y predecible que distinga:
1. **Errores de Dominio (`400 Bad Request`, `404 Not Found`, `409 Conflict`)**: Conservan el código HTTP y el mensaje legible provisto por el servidor en `detail` (`string`).
2. **Errores de Validación de Esquema (`422 Unprocessable Entity`)**: Conservan el código `422` y la colección de errores por campo `detail: [{ loc, msg, type }]`, proveyendo la asociación directa entre cada ruta `loc` (sin el prefijo `"body"`, ej. `name`, `closing_day`, `splits.0.percentage`) y el campo de formulario correspondiente.
3. **Errores de Red o Servidor No Disponible**: Presentan un mensaje comprensible indicando que no fue posible establecer conexión con el servicio de Credit Warrior.

**Criterios de Aceptación:**
- [ ] Un error `409 Conflict` con `{ "detail": "Card has associated expenses" }` expone `status === 409` y el texto exacto de `detail` para permitir flujos de recuperación (como ofrecer archivar tarjetas/personas o señalar un nombre duplicado).
- [ ] Un error `422 Unprocessable Entity` con `loc: ["body", "splits", 0, "percentage"]` se traduce a la ruta de campo `"splits.0.percentage"` con su respectivo mensaje `msg`.
- [ ] Una caída de red produce un error controlado con mensaje claro para el usuario, sin exponer trazas técnicas crudas en la interfaz.

---

### RF-08: Validación Estricta de Formularios y Contratos de Entrada (`.strict()`)
**CUANDO** se validen datos de entrada para crear o actualizar tarjetas, personas o compras antes de enviarlos al backend, **EL SISTEMA DEBERÁ** rechazar cualquier propiedad adicional no contemplada en el contrato OpenAPI (`additionalProperties: false`) y verificar las siguientes reglas de negocio:
1. **Creación y Actualización de Tarjetas (`CardCreate` / `CardUpdate`)**:
   - `name`: cadena obligatoria en creación (1 a 100 caracteres, sin cadenas compuestas solo por espacios).
   - `last_four_digits`: opcional o `null`; si se informa, debe contener exactamente 4 dígitos numéricos (`^\d{4}$`).
   - `currency`: `"CLP"` o `"USD"` (por defecto `"CLP"` en creación).
   - `closing_day` y `due_day`: números enteros entre `1` y `31` inclusive.
   - `is_active`: booleano (por defecto `true` en creación).
2. **Creación y Actualización de Personas (`PersonCreate` / `PersonUpdate`)**:
   - `name`: cadena obligatoria en creación (1 a 100 caracteres, sin cadenas compuestas solo por espacios).
   - `color_hex`: opcional o `null`; si se informa, debe cumplir el formato hexadecimal de 6 caracteres (`^#[0-9A-Fa-f]{6}$`).
   - `is_active`: booleano (por defecto `true` en creación).
3. **Creación y Actualización de Compras (`ExpenseCreate` / `ExpenseUpdate` / `ExpenseSplitInput`)**:
   - `card_id`: identificador UUID válido obligatorio.
   - `description`: cadena entre 1 y 255 caracteres (sin cadenas de solo espacios).
   - `total_amount`: `string` numérico válido mayor que `0` (`^(?:0|[1-9]\d*)(?:\.\d{1,2})?$`).
   - `purchase_date`: fecha obligatoria en formato `YYYY-MM-DD`.
   - `installments_count`: entero entre `1` y `120` inclusive (por defecto `1`).
   - `first_billing_override`: opcional o `null`; si se informa, debe cumplir `^\d{4}-(0[1-9]|1[0-2])$`.
   - `notes`: opcional o `null`, hasta 2000 caracteres.
   - `splits`: lista con al menos 1 participante donde:
     - No existen `person_id` duplicados.
     - Todos los elementos tienen el mismo `split_type` (`"EQUAL"`, `"PERCENTAGE"` o `"FIXED_AMOUNT"`).
     - **SI** `split_type === "EQUAL"`, **ENTONCES** `percentage` y `fixed_amount` se omiten o envían como `null`.
     - **SI** `split_type === "PERCENTAGE"`, **ENTONCES** cada elemento incluye `percentage` como `string` positivo y la suma total en centésimas es exactamente `100.00%`.
     - **SI** `split_type === "FIXED_AMOUNT"`, **ENTONCES** cada elemento incluye `fixed_amount` como `string` positivo y la suma total en centavos/centésimas es exactamente igual a `total_amount`.

**Criterios de Aceptación:**
- [ ] Si un objeto de entrada para tarjeta, persona, gasto o split incluye una propiedad extra (ej. `{ name: "Anyi", extraField: 123 }`), la validación falla inmediatamente en el cliente antes de realizar la petición HTTP.
- [ ] Un gasto con dos participantes que tengan el mismo `person_id` o distinto `split_type` es rechazado con un mensaje de validación específico.
- [ ] Un gasto con `split_type === "PERCENTAGE"` cuya suma sea `"99.99"` o `"100.01"` es rechazado indicando que la suma debe ser exactamente `100.00%`.
- [ ] Un gasto con `split_type === "FIXED_AMOUNT"` cuya suma no coincida exactamente con `total_amount` es rechazado indicando la discrepancia.

---

### RF-09: Cobertura Completa de Endpoints, Políticas de Frescura e Invalidación en Cascada
**EL SISTEMA DEBERÁ** proveer acceso declarativo a los 19 endpoints del backend (`GET /health`, CRUD de `/api/v1/cards`, CRUD de `/api/v1/persons`, CRUD + `/schedule` de `/api/v1/expenses`, y `/summary` + `/projection` de `/api/v1/dashboard`), manteniendo los catálogos maestros (`cards`, `persons`) frescos durante 5 minutos y los datos financieros dinámicos (`expenses`, `dashboard`) frescos durante 30 segundos con recarga al enfocar la ventana; además, **CUANDO** se complete con éxito una mutación (`POST`, `PUT`, `PATCH`, `DELETE`), **EL SISTEMA DEBERÁ** invalidar automáticamente en cascada las vistas dependientes:
- Mutación en **Tarjetas**: invalida todas las consultas de tarjetas y todas las consultas del dashboard (`summary` y `projection`).
- Mutación en **Personas**: invalida todas las consultas de personas y todas las consultas del dashboard (`summary` y `projection`).
- Mutación en **Compras**: invalida todas las consultas de compras (listas, detalles y cronogramas) y todas las consultas del dashboard (`summary` y `projection`).

**Criterios de Aceptación:**
- [ ] Al crear, actualizar o eliminar un gasto, tanto el listado de gastos como el resumen y la proyección del dashboard se marcan obsoletos y se actualizan automáticamente.
- [ ] Al crear, editar, archivar o eliminar una tarjeta o persona, su catálogo correspondiente y las consultas del dashboard se invalidan automáticamente.
- [ ] Al consultar `GET /api/v1/dashboard/summary` sin especificar `period`, la petición se envía sin query param para que el backend determine el próximo período de pago.

---

### RF-10: Primitivas Visuales Compartidas del Dominio y Feedback de Interfaz
**EL SISTEMA DEBERÁ** proporcionar primitivas visuales consistentes para presentar la información esencial del dominio en todas las pantallas futuras:
1. **Visualizador de Monto (`MoneyDisplay`)**: Renderiza un monto `string` en `CLP` o `USD` aplicando el formateo de **RF-05**, tipografía `JetBrains Mono` (`tabular-nums`) y variante cromática opcional según la divisa o jerarquía.
2. **Distintivo de Moneda (`CurrencyBadge`)**: Muestra una etiqueta compacta `CLP` (con acento `#10B981`) o `USD` (con acento `#38BDF8`) con contraste accesible sobre superficies oscuras.
3. **Píldora de Participante (`PersonChip`)**: Muestra el nombre del participante acompañado de un indicador circular o borde con su `color_hex` personalizado (o un color neutro del tema `#8A93A6` cuando `color_hex` sea `null`) y truncamiento con puntos suspensivos (`...`) si el nombre supera el ancho disponible.
4. **Estado Vacío Accionable (`EmptyState`)**: Presenta un icono contextual, título directo, explicación breve de por qué no hay datos y un botón de acción primaria con verbo en voz activa (ej. *"Crear primera tarjeta"*, *"Registrar gasto"*).
5. **Notificaciones Emergentes (`Toast`)**: Muestra mensajes breves no bloqueantes para confirmar acciones exitosas o informar errores de dominio (`400`, `404` y fallos de red).

**Criterios de Aceptación:**
- [ ] El visualizador de monto muestra `$100.000` para `("100000", "CLP")` y `US$33.34` para `("33.34", "USD")` con clase numérica tabular.
- [ ] El distintivo de moneda distingue visualmente `CLP` y `USD` con sus tokens semánticos respectivos.
- [ ] La píldora de participante renderiza correctamente tanto cuando `color_hex` está definido (ej. `"#FF5733"`) como cuando es `null`, truncando nombres largos sin romper el diseño.
- [ ] El estado vacío muestra su llamada a la acción cuando se le provee una acción primaria y ejecuta dicha acción al interactuar con el botón.

---

## 4. Flujos de Experiencia de Usuario (UX) y Estados de Interfaz

### 4.1 Estados Globales de Carga, Éxito, Vacío y Error
| Estado | Comportamiento Observable en la Interfaz |
| :--- | :--- |
| **Carga (`Loading`)** | Bloques estructurales animados discretos sobre superficie `#12141C` / `#1A1D28` que respetan las dimensiones del contenido esperado, evitando saltos bruscos de diseño (*layout shift*). |
| **Vacío (`Empty`)** | Nunca se muestra una pantalla en blanco ni un texto pasivo como *"Sin datos"*. Se presenta el componente de estado vacío explicando qué falta y ofreciendo el botón de acción inmediata. |
| **Éxito (`Success`)** | Actualización inmediata de las vistas afectadas gracias a la invalidación en cascada y confirmación visual mediante notificación emergente con verbo coherente con la acción ejecutada. |
| **Error `400` / `404`** | Notificación emergente destructiva (`#F43F5E`) que muestra el mensaje `detail` devuelto por el backend sin perder los datos que el usuario tenía en pantalla. |
| **Error `409 Conflict`** | Preservación íntegra del código `409` y su `detail` para que los flujos de tarjetas y personas ofrezcan el archivado inteligente (`PATCH { is_active: false }`) cuando existan gastos asociados, o marquen el campo `name` cuando el nombre de una persona ya exista. |
| **Error `422 Validation`** | Inyección automática de cada mensaje de error directamente debajo del campo de formulario señalado por `loc`, resaltando el borde del control en `#F43F5E`. |
| **Backend No Disponible (`/health` o Red)** | Alerta clara de desconexión con opción de reintentar la consulta cuando `api-credit-warrior` no responda en la URL configurada. |

---

## 5. Casos Límite (Edge Cases)

1. **Montos en Cero (`"0"` en `CLP` y `"0.00"` en `USD`)**:
   - En resúmenes mensuales sin compras activas, el backend puede devolver `"0"` o `"0.00"` en `totals_by_currency`. El formateador debe representarlos como `$0` y `US$0.00` respectivamente, mientras que la validación de creación de compras (`ExpenseCreate`) debe rechazar `"0"` o `"0.00"` exigiendo un monto estrictamente mayor a cero.
2. **Tarjetas sin Últimos 4 Dígitos (`last_four_digits: null`)**:
   - Cuando una tarjeta se registra sin `last_four_digits`, el formateador de máscara devuelve cadena vacía `""` y la interfaz muestra únicamente el nombre de la tarjeta y su moneda, sin renderizar `•••• null` ni `••••`.
3. **Personas sin Color Asignado (`color_hex: null`)**:
   - Si una persona tiene `color_hex: null`, la píldora de participante (`PersonChip`) utiliza el color secundario del sistema (`#8A93A6`) como indicador visual por defecto sin generar estilos inválidos.
4. **Cambio de Método de Reparto (`split_type`) con Datos Residuales**:
   - Si el usuario ingresa porcentajes o montos fijos en un formulario y luego cambia el modo a `"EQUAL"`, los campos `percentage` y `fixed_amount` deben limpiarse a `null` u omitirse para que el backend no rechace la petición con `422 Unprocessable Entity`.
5. **Fechas en Zonas Horarias Occidentales (ej. `America/Santiago` UTC-3 / UTC-4)**:
   - Parsear `"2026-10-25"` con `new Date("2026-10-25")` en JavaScript interpreta medianoche UTC y retrocede al día `24` en husos horarios negativos. El formateador de fechas y períodos debe descomponer explícitamente `YYYY`, `MM` y `DD` en hora local para garantizar que el día y mes mostrados coincidan siempre con el valor enviado por el backend.
6. **Nombres y Descripciones Extensas**:
   - Nombres de tarjetas o personas de hasta 100 caracteres y descripciones de compras de hasta 255 caracteres deben truncarse visualmente de forma limpia en contenedores estrechos móviles sin provocar desbordamiento horizontal.
