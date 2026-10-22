# Especificación 005: Optimización de Rendimiento, Consultas y Compresión

- **Estado:** Implementado y Verificado
- **Fecha:** 2026-10-26
- **Módulo:** `transversal` / `dashboard` / `database` (`/api/v1/dashboard/summary`, `/api/v1/dashboard/projection`, `HTTP Middleware`, `Database Pooling & Indexing`)

---

## 1. Resumen (QUÉ y POR QUÉ)

### QUÉ
Optimizar integralmente la velocidad de respuesta, el uso de recursos y el rendimiento de la API en escenarios de alta concurrencia o proyecciones multi-mes, manteniendo **100% la compatibilidad retroactiva** de los contratos JSON existentes y preservando con precisión estricta los cálculos monetarios con `Decimal`.

La optimización abarca cuatro áreas fundamentales:
1. **Eliminación de consultas redundantes y problema N+1 en Dashboard y Proyecciones:** Agrupación en una sola operación (`batch fetch`) de las tarifas de mantención consultadas por período, y precarga en un único paso de los registros de compras para calcular proyecciones multi-mes en memoria, garantizando una cota fija e independiente del horizonte de proyección ($1 \le M \le 24$) de **máximo 5 consultas SQL físicas** (4 para el árbol completo de entidades de compras cargadas vía `selectinload` + 1 para las tarifas de mantención del rango de períodos `WHERE period IN (...)`).
2. **Indexación compuesta en base de datos:** Creación de 6 índices compuestos con nombres canónicos optimizados para las operaciones más frecuentes de ordenamiento temporal, llaves foráneas y filtrado por estado activo en las tablas `expenses`, `card_monthly_fees`, `expense_splits`, `cards` y `persons`, documentando su especificación en `docs/constitution.md` y `MEMORY.md`.
3. **Compresión HTTP adaptativa (GZip):** Aplicación global en la aplicación FastAPI mediante `GZipMiddleware(minimum_size=1000)` para respuestas mayores o iguales a 1000 bytes cuando el cliente declare compatibilidad mediante `Accept-Encoding: gzip` (respetando la negociación HTTP y omitiendo compresión si el cliente indica `q=0`, omite `gzip` o el cuerpo es `< 1000` bytes).
4. **Gestión avanzada del pool de conexiones:** Parametrización configurable con validación fail-fast (`DB_POOL_SIZE >= 1`, `DB_MAX_OVERFLOW >= 0`, `DB_POOL_RECYCLE >= 1`, `DB_POOL_TIMEOUT >= 1`), compatibilidad automática con SQLite (omitiendo parámetros de pooling incompatibles), manejo limpio y seguro de saturación o timeout del pool retornando `503 Service Unavailable` sin filtrar trazas internas de base de datos, y sincronización en `docs/constitution.md` y `MEMORY.md`.

### POR QUÉ
A medida que se registran compras y se consultan horizontes amplios de desendeudamiento (hasta 24 meses proyectados), el cálculo mes a mes provocaba consultas reiterativas a la base de datos (problema N+1), multiplicando la latencia de red y la carga en el motor de base de datos. Asimismo, los payloads JSON de proyección para múltiples meses alcanzan tamaños considerables que aumentan el tiempo de transferencia. Optimizando las consultas a nivel de agregación, indexando los caminos de acceso críticos, protegiendo la resiliencia del pool de conexiones y habilitando compresión en el transporte, se logra una respuesta casi instantánea y robusta sin requerir ningún cambio en el cliente web o móvil.

---

## 2. Supuestos y Definiciones de Dominio

1. **Invarianza Estricta de Contratos (Zero Breaking Changes):** Ningún campo existente en los contratos JSON de respuesta de `/api/v1/dashboard/summary`, `/api/v1/dashboard/projection` ni en endpoints de entidades debe ser renombrado, removido, modificado en su tipo de dato o reordenado en su semántica. El frontend actual debe interactuar con la API sin requerir ajuste alguno.
2. **Integridad y Precisión Monetaria Inquebrantable:** Todos los cálculos matemáticos, distribución de cuotas, prorrateo de mantención y asignación de residuos mantienen sin alteraciones el uso exclusivo de `Decimal`, con quantums de `1` para `CLP` y `0.01` para `USD`. Ningún cambio de rendimiento puede inducir cálculos en coma flotante (`float`) ni variar los resultados numéricos ya garantizados.
3. **Determinismo en Proyecciones Multi-Mes:** La respuesta de `/api/v1/dashboard/projection` calculada de forma consolidada debe producir exactamente los mismos valores numéricos que ejecutar de forma independiente `/api/v1/dashboard/summary` para cada uno de los períodos que componen el horizonte proyectado.
4. **Soporte de Entornos de Persistencia y Compatibilidad SQLite:** Las mejoras en el pool de conexiones deben ser compatibles tanto con entornos de producción sobre PostgreSQL como con entornos de pruebas automáticas locales y en memoria (SQLite). En SQLite se deben omitir automáticamente los argumentos incompatibles de pooling (`pool_size`, `max_overflow`), utilizando la estrategia de conexión idónea (`StaticPool` o configuración por defecto).
5. **Documentación Arquitectónica Viva:** Las optimizaciones estructurales (los 6 índices compuestos y los parámetros de resiliencia y pooling de base de datos) deben reflejarse en los documentos de arquitectura y memoria del sistema (`docs/constitution.md` y `MEMORY.md`).

---

## 3. Requisitos Funcionales (Sintaxis EARS)

### 3.1 Contratos y Retrocompatibilidad

- **RF-01 (Invarianza Absoluta de Contratos y Precisión Decimal — Ubiquitous):**  
  El sistema DEBE mantener 100% idéntica la estructura de respuesta, nombres de claves, tipos de datos y valores numéricos calculados en todos los endpoints de la API, conservando la aritmética de punto fijo (`Decimal`) y las reglas de asignación determinista de residuos monetarios.

### 3.2 Optimización de Consultas en Dashboard y Proyecciones

- **RF-02 (Batch Fetching de Tarifas de Mantención en Resumen Mensual — Event-Driven / State-Driven):**  
  CUANDO un cliente solicita el resumen mensual (`GET /api/v1/dashboard/summary`), el sistema DEBE obtener todas las tarifas de mantención sobreescritas para el período consultado en una única operación agrupada de base de datos (`batch fetch`), en lugar de ejecutar consultas individuales por cada tarjeta activa.

- **RF-03 (Batch Preload y Reducción de Consultas en Proyecciones Multi-Mes — Event-Driven):**  
  CUANDO un cliente solicita la proyección de pagos multi-mes (`GET /api/v1/dashboard/projection`), el sistema DEBE precargar en memoria el conjunto de compras y participantes una sola vez para todo el horizonte proyectado y consultar todas las tarifas de mantención del rango de períodos en una única operación agrupada (`WHERE period IN (...)`), ejecutando a nivel de base de datos una cota física constante e independiente de la cantidad de meses proyectados ($1 \le M \le 24$) de **máximo 5 consultas SQL físicas** (4 consultas para cargar el grafo de entidades de compras con sus relaciones vía `selectinload` —gastos, tarjetas, splits y personas— más 1 consulta para el lote de tarifas de mantención del rango de períodos), en lugar de ejecutar consultas repetitivas por cada mes o tarjeta.

### 3.3 Índices Compuestos en Base de Datos

- **RF-04 (Indexación Compuesta de Tablas Relacionales — Ubiquitous):**  
  El sistema DEBE disponer de los siguientes 6 índices compuestos con nombres canónicos en el motor de base de datos relacional para acelerar los filtros de ordenamiento, llaves foráneas y búsquedas recurrentes:
  1. `ix_expenses_purchase_date_created_at` en la tabla `expenses`: columnas `(purchase_date DESC, created_at DESC)`.
  2. `ix_expenses_card_id_purchase_date` en la tabla `expenses`: columnas `(card_id, purchase_date)`.
  3. `ix_card_monthly_fees_period_card_id` en la tabla `card_monthly_fees`: columnas `(period, card_id)`.
  4. `ix_expense_splits_person_id_expense_id` en la tabla `expense_splits`: columnas `(person_id, expense_id)`.
  5. `ix_cards_is_active_name` en la tabla `cards`: columnas `(is_active, name)`.
  6. `ix_persons_is_active_name` en la tabla `persons`: columnas `(is_active, name)`.

### 3.4 Compresión HTTP en Transporte

- **RF-05 (Compresión Automática de Respuestas HTTP GZip y Negociación de Contenido — Event-Driven / Optional / Unwanted Behavior):**  
  El sistema DEBE aplicar compresión HTTP a nivel global en la aplicación FastAPI mediante `GZipMiddleware(minimum_size=1000)`:
  - CUANDO un cliente envía una petición HTTP incluyendo la cabecera `Accept-Encoding` con soporte para compresión `gzip` (sin rechazarla explícitamente mediante factor de calidad nulo `q=0`), Y la respuesta generada por el sistema tenga un tamaño en bytes igual o superior a 1000 bytes, el sistema DEBE comprimir el cuerpo de la respuesta con GZip e incluir la cabecera `Content-Encoding: gzip`.
  - SI el cliente no declara compatibilidad con `gzip` en `Accept-Encoding`, O especifica rechazo explícito (`Accept-Encoding: gzip;q=0`), O el tamaño de la respuesta es estrictamente menor a 1000 bytes (`< 1000`), ENTONCES el sistema DEBE entregar la respuesta sin compresión GZip.

### 3.5 Gestión, Configuración y Resiliencia del Pool de Conexiones

- **RF-06 (Configuración Parametrizable del Pool, Validación Fail-Fast y Manejo de Saturación — State-Driven / Unwanted Behavior):**  
  MIENTRAS el sistema opere conectado a un motor de base de datos relacional en red, el sistema DEBE gestionar las conexiones mediante un pool reutilizable configurable a través de variables de entorno tipadas en `Settings` con valores por defecto razonables:
  - `DB_POOL_SIZE`: Tamaño base del pool de conexiones persistentes (entero $\ge 1$, por defecto `10`).
  - `DB_MAX_OVERFLOW`: Cantidad máxima de conexiones adicionales temporales ante picos de carga (entero $\ge 0$, por defecto `20`).
  - `DB_POOL_RECYCLE`: Intervalo en segundos tras el cual las conexiones se reciclan para evitar desconexiones silenciosas del servidor de base de datos (entero $\ge 1$, por defecto `1800` segundos / 30 minutos).
  - `DB_POOL_TIMEOUT`: Tiempo límite de espera en segundos para obtener una conexión libre antes de rechazar la solicitud (entero $\ge 1$, por defecto `30` segundos).
  - Verificación previa de conexión (`pool_pre_ping = True`) en todas las solicitudes para descartar conexiones rotas.

  SI los valores provistos en la configuración no cumplen las restricciones mínimas (`DB_POOL_SIZE < 1`, `DB_MAX_OVERFLOW < 0`, `DB_POOL_RECYCLE < 1` o `DB_POOL_TIMEOUT < 1`), ENTONCES el sistema DEBE fallar inmediatamente al inicio (*fail-fast*) rechazando el arranque con un error de validación explícito.

  SI el motor de persistencia configurado es SQLite (ej. desarrollo local o suite de pruebas automatizadas), ENTONCES el sistema DEBE omitir automáticamente los argumentos incompatibles de `pool_size` y `max_overflow`, aplicando la estrategia de conexión correspondiente (`StaticPool` o pooling por defecto de SQLite).

  SI durante la operación el pool de conexiones se satura completamente y expira el tiempo límite de espera (`TimeoutError`), ENTONCES el sistema DEBE capturar limpiamente la excepción mediante un manejador global y responder al cliente con código HTTP `503 Service Unavailable` y el cuerpo JSON `{"detail": "Database connection pool saturated. Service temporarily unavailable."}`, sin exponer trazas internas de la base de datos ni detalles de infraestructura.

### 3.6 Actualización de Documentación Arquitectónica

- **RF-07 (Sincronización de Documentación Arquitectónica — Ubiquitous):**  
  El sistema DEBE reflejar formalmente en `docs/constitution.md` y `MEMORY.md` los 6 nuevos índices compuestos, la cota constante de consultas SQL para proyecciones y la parametrización de resiliencia del pool de conexiones.

---

## 4. Casos Límite (Edge Cases)

1. **Respuestas en el Umbral de Tamaño de Compresión:**  
   Una respuesta con exactamente 999 bytes no debe comprimirse con GZip; una respuesta con exactamente 1000 bytes sí debe comprimirse cuando el cliente declare `Accept-Encoding: gzip`.
2. **Negociación HTTP y Clientes sin Soporte o Rechazo de Compresión:**  
   Si el cliente envía peticiones omitiendo la cabecera `Accept-Encoding`, especificando `identity`, o indicando rechazo explícito con ponderación cero (`Accept-Encoding: gzip;q=0`), el sistema debe enviar el cuerpo en texto claro (JSON crudo estándar) sin cabecera `Content-Encoding: gzip`.
3. **Proyección Extensa (Hasta 24 Meses) y Cota Estricta de Consultas:**  
   Al consultar un horizonte de hasta 24 meses (`months=24`), la cantidad de consultas físicas a la base de datos es invariante e independiente de $M$: se ejecutan como máximo 5 consultas SQL físicas (4 para el árbol completo de entidades de compras cargadas vía `selectinload` + 1 para las tarifas de mantención del rango de períodos `WHERE period IN (...)`).
4. **Período sin Tarifas Sobreescritas en el Rango Proyectado:**  
   Si ninguna de las tarjetas tiene overrides para los períodos solicitados, la consulta agrupada de tarifas debe retornar un conjunto vacío y el sistema debe resolver transparentemente la tarifa por defecto (`default_monthly_fee`) de cada tarjeta sin incurrir en consultas adicionales ni errores de consulta.
5. **Base de Datos SQLite en Entorno de Pruebas Automáticas y Desarrollo Ligero:**  
   La configuración del pool de conexiones debe reconocer automáticamente si el motor configurado es SQLite (en memoria o archivo) para omitir opciones incompatibles (`pool_size`, `max_overflow`), asegurando que las suites de prueba unitarias e integrales se ejecuten limpiamente sin excepciones de configuración (`StaticPool` o por defecto).
6. **Configuración Inválida de Parámetros de Pool (Fail-Fast):**  
   Si en el entorno se configuran valores inválidos como `DB_POOL_SIZE=0`, `DB_MAX_OVERFLOW=-1`, `DB_POOL_RECYCLE=0` o `DB_POOL_TIMEOUT=0`, la inicialización de `Settings` debe rechazar la configuración inmediatamente mediante un error de validación de Pydantic al arrancar el servicio.
7. **Saturación del Pool de Conexiones y Expiración de Timeout:**  
   Bajo condiciones extremas de concurrencia donde todas las conexiones del pool y del sobreflujo (`max_overflow`) estén ocupadas y se exceda `DB_POOL_TIMEOUT`, el manejador global de excepciones captura la excepción de timeout de conexión (`TimeoutError`) y devuelve HTTP `503 Service Unavailable` con `{"detail": "Database connection pool saturated. Service temporarily unavailable."}`, evitando que la aplicación emita un error 500 no controlado o exponga la traza de base de datos.
8. **Período sin Compras ni Actividad:**  
   Tanto en resumen mensual como en proyecciones, períodos con cero compras registradas deben resolverse inmediatamente con colecciones vacías y totales en cero, sin ejecutar consultas adicionales de división o participantes.

---

## 5. Criterios de Aceptación Verificables

- [ ] **CA-01 (Invarianza Funcional y Retrocompatibilidad):** El 100% de las suites de prueba unitarias, de integración y E2E existentes se ejecutan y pasan con éxito sin ninguna alteración en los esquemas de respuesta esperados.
- [ ] **CA-02 (Conteo Físico de Consultas en Proyecciones Multi-Mes):** Se comprueba mediante pruebas automatizadas con inspección y conteo de sentencias SQL que la llamada a `/api/v1/dashboard/projection` para cualquier número de meses ($1 \le M \le 24$) ejecuta una cantidad constante de **como máximo 5 consultas SQL físicas** (4 para el grafo de compras con `selectinload` + 1 para el lote de tarifas de mantención `WHERE period IN (...)`).
- [ ] **CA-03 (Batch Fetching en Resumen Mensual):** Se comprueba que `/api/v1/dashboard/summary` consulta las tarifas de mantención del período en un único acceso a la base de datos para todas las tarjetas.
- [ ] **CA-04 (Compresión HTTP Global y Negociación de Contenido GZip):** Se comprueba mediante pruebas de integración HTTP que `GZipMiddleware(minimum_size=1000)` comprime respuestas $\ge 1000$ bytes enviadas con `Accept-Encoding: gzip` retornando `Content-Encoding: gzip` y cuerpo válido, mientras que respuestas $< 1000$ bytes, solicitudes sin cabecera o con `Accept-Encoding: gzip;q=0` se entregan sin comprimir.
- [ ] **CA-05 (Migración e Índices Compuestos Canónicos):** Se verifica mediante una nueva migración de Alembic que los 6 índices compuestos con sus nombres canónicos (`ix_expenses_purchase_date_created_at`, `ix_expenses_card_id_purchase_date`, `ix_card_monthly_fees_period_card_id`, `ix_expense_splits_person_id_expense_id`, `ix_cards_is_active_name`, `ix_persons_is_active_name`) se crean y se revierten (`downgrade`) limpiamente en la base de datos.
- [ ] **CA-06 (Parámetros del Pool Configurables, Fail-Fast y Compatibilidad SQLite):** Se verifica que las variables `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE`, `DB_POOL_TIMEOUT` validan fail-fast ante valores inválidos, se aplican correctamente al motor en entornos PostgreSQL, y omiten `pool_size` y `max_overflow` en SQLite sin fallos.
- [ ] **CA-07 (Manejo Seguro de Saturación del Pool):** Se verifica mediante tests de integración/mock que cuando se produce un `TimeoutError` por agotamiento del pool de conexiones, la API responde con código HTTP `503 Service Unavailable` y `{"detail": "Database connection pool saturated. Service temporarily unavailable."}`, sin exponer trazas de la base de datos al cliente.
- [ ] **CA-08 (Sincronización de Documentación Arquitectónica):** Se verifica que `docs/constitution.md` y `MEMORY.md` han sido actualizados registrando los 6 índices compuestos creados, la cota de consultas de proyección y los parámetros de configuración y resiliencia del pool.
- [ ] **CA-09 (Calidad de Código y Tipado Estricto):** La suite completa pasa `ruff check .` y `mypy app` sin ningún error ni advertencia.
