# Tareas de Implementación: Optimización de Rendimiento, Consultas y Compresión

- **Especificación:** [`specs/005-performance-and-query-optimization/spec.md`](./spec.md)
- **Plan Técnico:** [`specs/005-performance-and-query-optimization/plan.md`](./plan.md)
- **Estado:** Completado (10/10)
- **Fecha:** 2026-10-26

---

## Tareas Atómicas Secuenciales (Metodología TDD)

### T1: Tests y Métodos Batch en `CardFeeRepository`
- **Requisitos Funcionales:** `RF-02`, `RF-03`
- **Fase TDD:** Rojo -> Verde -> Refactor
- **Archivos:**
  - `tests/unit/test_card_fee_repo.py`
  - `app/repositories/card_fee_repo.py`
- **Descripción:** Escribir primero las pruebas unitarias para los métodos batch `get_fees_by_period(period: str)` y `get_fees_by_periods(periods: Sequence[str])`. Implementar las consultas agrupadas en `CardFeeRepository` retornando los diccionarios mapeados por tarjeta o tupla `(tarjeta, período)`, y retornando diccionario vacío sin consultar DB ante secuencias vacías de períodos.
- **Hecho cuando:** `pytest tests/unit/test_card_fee_repo.py` pasa 100% en verde comprobando que ambos métodos recuperan correctamente los registros de sobreescritura de tarifas en una única sentencia SQL.

---

### T2: Optimización de `DashboardService.get_monthly_summary` con Batch Fetching
- **Requisitos Funcionales:** `RF-01`, `RF-02`
- **Fase TDD:** Rojo -> Verde -> Refactor
- **Archivos:**
  - `app/services/dashboard_service.py`
  - `tests/integration/test_dashboard_fees_summary.py`
- **Descripción:** Refactorizar `DashboardService.get_monthly_summary` para que utilice `card_fee_repo.get_fees_by_period` en lugar de consultar individualmente cada tarjeta en el bucle. Añadir parámetros opcionales `preloaded_expenses` y `preloaded_fee_overrides` para habilitar su reutilización en cálculos consolidados multi-mes.
- **Hecho cuando:** Todos los tests en `tests/integration/test_dashboard_fees_summary.py` pasan en verde sin alterar los resultados numéricos (`Decimal`), esquemas de respuesta JSON ni contratos de la API.

---

### T3: Optimización de `DashboardService.get_projection` con Precarga Única en Memoria
- **Requisitos Funcionales:** `RF-01`, `RF-03`
- **Fase TDD:** Rojo -> Verde -> Refactor
- **Archivos:**
  - `app/services/dashboard_service.py`
  - `tests/integration/test_dashboard_fees_projection.py`
- **Descripción:** Modificar `DashboardService.get_projection` para precargar una sola vez la lista de gastos (`self.expense_repo.list_expenses()`) y todas las tarifas de mantención del rango de períodos (`self.card_fee_repo.get_fees_by_periods(...)`). Pasar estos datos en memoria a cada iteración de `get_monthly_summary` eliminando las consultas redundantes N+1.
- **Hecho cuando:** Toda la suite de tests en `tests/integration/test_dashboard_fees_projection.py` pasa en verde con resultados numéricos idénticos a la versión no optimizada.

---

### T4: Test de Conteo de Consultas Físicas SQL en `/api/v1/dashboard/projection` ($\le 5$ queries)
- **Requisitos Funcionales:** `RF-03`
- **Fase TDD:** Rojo -> Verde
- **Archivos:**
  - `tests/integration/test_dashboard_query_count.py`
- **Descripción:** Crear una suite de tests de integración con un listener de SQLAlchemy (`before_cursor_execute`) para interceptar y contabilizar el número exacto de sentencias SQL ejecutadas durante llamadas a `/api/v1/dashboard/projection`. Validar que para horizontes de 1, 6, 12 y 24 meses, el número de consultas SQL permanece invariante y nunca excede las 5 sentencias físicas (4 del árbol de compras con `selectinload` + 1 de tarifas por período).
- **Hecho cuando:** `pytest tests/integration/test_dashboard_query_count.py` pase confirmando que `/api/v1/dashboard/projection` ejecuta como máximo 5 consultas SQL físicas independientemente de la cantidad de meses proyectados ($1 \le M \le 24$).

---

### T5: Índices Compuestos Canónicos en Modelos SQLAlchemy y Migración Alembic
- **Requisitos Funcionales:** `RF-04`
- **Fase TDD:** Rojo -> Verde -> Refactor
- **Archivos:**
  - `app/models/expense.py`
  - `app/models/card_monthly_fee.py`
  - `app/models/card.py`
  - `app/models/person.py`
  - `alembic/versions/c7b8d2e4f01a_add_performance_indexes.py`
  - `tests/unit/test_models_card_fees.py`
  - `tests/unit/test_models_expenses.py`
- **Descripción:** Definir en `__table_args__` de cada modelo los 6 índices compuestos canónicos (`ix_expenses_purchase_date_created_at`, `ix_expenses_card_id_purchase_date`, `ix_card_monthly_fees_period_card_id`, `ix_expense_splits_person_id_expense_id`, `ix_cards_is_active_name`, `ix_persons_is_active_name`). Crear el archivo de migración Alembic con funciones `upgrade()` y `downgrade()` completas.
- **Hecho cuando:** Los modelos declaran explícitamente los 6 índices, y las operaciones de aplicación y reversión de la migración son sintáctica y estructuralmente válidas.

---

### T6: Configuración Parametrizable del Pool con Validación Fail-Fast y Compatibilidad SQLite
- **Requisitos Funcionales:** `RF-06`
- **Fase TDD:** Rojo -> Verde -> Refactor
- **Archivos:**
  - `app/core/config.py`
  - `app/core/database.py`
  - `tests/unit/test_database_pool_config.py`
- **Descripción:** Agregar a `Settings` los campos `db_pool_size`, `db_max_overflow`, `db_pool_recycle` y `db_pool_timeout` con validadores Pydantic `ge` para forzar rechazo en arranque (*fail-fast*) ante configuraciones incorrectas. En `app/core/database.py`, condicionar el paso de parámetros de pooling para omitir `pool_size` y `max_overflow` cuando el motor sea SQLite.
- **Hecho cuando:** `pytest tests/unit/test_database_pool_config.py` pase confirmando que configuraciones con valores fuera de rango lanzan `ValidationError` y que conexiones SQLite se inicializan limpiamente sin errores de pooling.

---

### T7: Manejador Global para `TimeoutError` de Conexión retornando HTTP 503
- **Requisitos Funcionales:** `RF-06`
- **Fase TDD:** Rojo -> Verde
- **Archivos:**
  - `app/core/exceptions.py`
  - `tests/integration/test_pool_timeout_handler.py`
- **Descripción:** Registrar en `register_exception_handlers` de `app/core/exceptions.py` un manejador específico para `sqlalchemy.exc.TimeoutError` que registre el evento en logs internos y responda al cliente con HTTP `503 Service Unavailable` y JSON `{"detail": "Database connection pool saturated. Service temporarily unavailable."}` sin filtrar trazas de base de datos.
- **Hecho cuando:** `pytest tests/integration/test_pool_timeout_handler.py` pase verificando que al agotarse las conexiones del pool se emite respuesta 503 con el payload exacto solicitado.

---

### T8: Compresión HTTP GZip Adaptativa y Negociación de Contenido en `app/main.py`
- **Requisitos Funcionales:** `RF-05`
- **Fase TDD:** Rojo -> Verde
- **Archivos:**
  - `app/main.py`
  - `tests/integration/test_gzip_compression.py`
- **Descripción:** Agregar `GZipMiddleware(minimum_size=1000)` en el factory `create_app()` de `app/main.py`. Desarrollar tests de integración verificando: compresión GZip en payloads $\ge 1000$ bytes con `Accept-Encoding: gzip`, entrega en texto claro para payloads $< 1000$ bytes (ej. `/health`), y respeto a clientes que no envían soporte de gzip o lo rechazan con `q=0`.
- **Hecho cuando:** `pytest tests/integration/test_gzip_compression.py` pase en verde verificando la compresión adaptativa, el umbral de 1000 bytes y la negociación correcta de cabeceras HTTP.

---

### T9: Sincronización de Documentación Arquitectónica (`constitution.md` y `MEMORY.md`)
- **Requisitos Funcionales:** `RF-07`
- **Fase TDD:** Documentación
- **Archivos:**
  - `docs/constitution.md`
  - `MEMORY.md`
- **Descripción:** Actualizar formalmente `docs/constitution.md` incorporando los 6 índices compuestos en la sección de esquema de base de datos, la cota de $\le 5$ queries SQL para proyecciones y los parámetros de pooling. Registrar en `MEMORY.md` la Especificación 005 en el historial de especificaciones completadas y las decisiones arquitectónicas tomadas.
- **Hecho cuando:** Ambos archivos de documentación reflejen fielmente todas las optimizaciones, índices y contratos operativos de resiliencia del sistema.

---

### T10: Verificación Integral de Regresión, Cobertura, Tipado y Estilo
- **Requisitos Funcionales:** `RF-01`, `RF-02`, `RF-03`, `RF-04`, `RF-05`, `RF-06`, `RF-07`
- **Fase TDD:** Verificación de Calidad
- **Archivos:**
  - Suite completa del proyecto (`tests/`, `app/`)
- **Descripción:** Ejecutar la suite completa de pruebas automáticas con `pytest`, chequear consistencia estática de tipos con `mypy app` y validar el formato y linter con `ruff check .`. Asegurar que no existan regresiones en ninguno de los contratos existentes de la API.
- **Hecho cuando:** El 100% de la suite de tests de la aplicación pasa en verde, `ruff check .` reporta cero incidencias y `mypy app` valida el código sin errores de tipado.
