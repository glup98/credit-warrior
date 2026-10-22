# Plan Técnico: Optimización de Rendimiento, Consultas y Compresión

- **Especificación:** [`specs/005-performance-and-query-optimization/spec.md`](./spec.md)
- **Estado:** Implementado y Verificado
- **Fecha:** 2026-10-26

---

## 1. Archivos a Crear y Modificar

### Archivos a Crear
1. `alembic/versions/c7b8d2e4f01a_add_performance_indexes.py`: Migración de base de datos con los 6 índices compuestos canónicos y su correspondiente `downgrade`.
2. `tests/integration/test_dashboard_query_count.py`: Suite de tests de integración para verificar con escuchadores de eventos SQLAlchemy el conteo constante de queries ($\le 5$) en `/api/v1/dashboard/projection`.
3. `tests/integration/test_gzip_compression.py`: Suite de tests HTTP de compresión adaptativa GZip, umbral de 1000 bytes y negociación de cabeceras `Accept-Encoding`.
4. `tests/unit/test_database_pool_config.py`: Suite de tests unitarios de validación fail-fast de parámetros del pool y resolución de configuración según dialecto (PostgreSQL vs SQLite).
5. `tests/integration/test_pool_timeout_handler.py`: Suite de tests de integración para simular saturación (`TimeoutError`) y verificar la respuesta HTTP `503 Service Unavailable`.

### Archivos a Modificar
1. `app/repositories/card_fee_repo.py`: Incorporación de métodos de consulta por lote `get_fees_by_period(period: str)` y `get_fees_by_periods(periods: Sequence[str])`.
2. `app/services/dashboard_service.py`: Precarga de entidades de compras en memoria para proyecciones multi-mes, cálculo sin re-consultas SQL y batch fetching de tarifas de mantención.
3. `app/models/expense.py`: Definición de índices `ix_expenses_purchase_date_created_at`, `ix_expenses_card_id_purchase_date` en `Expense` e `ix_expense_splits_person_id_expense_id` en `ExpenseSplit`.
4. `app/models/card_monthly_fee.py`: Definición de índice `ix_card_monthly_fees_period_card_id` en `CardMonthlyFee`.
5. `app/models/card.py`: Definición de índice `ix_cards_is_active_name` en `Card`.
6. `app/models/person.py`: Definición de índice `ix_persons_is_active_name` en `Person`.
7. `app/core/config.py`: Adición de variables de entorno para pool de base de datos (`DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE`, `DB_POOL_TIMEOUT`) con validación fail-fast vía Pydantic.
8. `app/core/database.py`: Aplicación dinámica de parámetros de pool condicionados al dialecto de la base de datos (omitiendo opciones incompatibles en SQLite).
9. `app/core/exceptions.py`: Registro de manejador para `sqlalchemy.exc.TimeoutError` con respuesta HTTP 503 limpia y sin filtración de trazas.
10. `app/main.py`: Registro de `GZipMiddleware(minimum_size=1000)` en el factory de FastAPI.
11. `tests/unit/test_card_fee_repo.py`: Incorporación de tests unitarios para los nuevos métodos batch de `CardFeeRepository`.
12. `docs/constitution.md`: Registro de índices compuestos, cota fija de queries en proyecciones y configuración de pooling.
13. `MEMORY.md`: Actualización del registro histórico de especificaciones y decisiones arquitectónicas.

---

## 2. Detalle de la Arquitectura Técnica

### 2.1 Métodos Batch en `CardFeeRepository`
Actualmente, `CardFeeRepository` consulta tarifas exclusivamente por tupla única `(card_id, period)`. Se extienden sus capacidades con dos métodos optimizados:

```python
def get_fees_by_period(self, period: str) -> dict[uuid.UUID, CardMonthlyFee]:
    """Fetch all fee overrides for a given period across all cards in a single query."""
    stmt = select(CardMonthlyFee).where(CardMonthlyFee.period == period)
    records = self.db.scalars(stmt).all()
    return {rec.card_id: rec for rec in records}

def get_fees_by_periods(self, periods: Sequence[str]) -> dict[tuple[uuid.UUID, str], CardMonthlyFee]:
    """Fetch all fee overrides for a sequence of periods in a single grouped query."""
    if not periods:
        return {}
    stmt = select(CardMonthlyFee).where(CardMonthlyFee.period.in_(periods))
    records = self.db.scalars(stmt).all()
    return {(rec.card_id, rec.period): rec for rec in records}
```

- **Ventaja:** Permite resolver en una única consulta SQL todas las sobreescrituras de tarifas activas para el mes consultado o para todo el rango de meses proyectados, reduciendo los accesos a la base de datos de $O(C)$ o $O(M \times C)$ a exactamente $O(1)$.

### 2.2 Optimización de `DashboardService`
El servicio `DashboardService` se reestructura internamente para separar la carga de datos del motor de cálculo en memoria:

1. **Parámetros Opcionales de Precarga en `get_monthly_summary`:**
   ```python
   def get_monthly_summary(
       self,
       *,
       reference_date: date,
       period: str | None = None,
       preloaded_expenses: list[Expense] | None = None,
       preloaded_fee_overrides: dict[uuid.UUID, Decimal] | None = None,
   ) -> DashboardSummaryResponse:
   ```
   - Si `preloaded_expenses is None`: se consulta `self.expense_repo.list_expenses()`.
   - Si `preloaded_fee_overrides is None`: se ejecuta `self.card_fee_repo.get_fees_by_period(period_str)` en un único paso y se construye el mapa `{card_id: fee}`.
   - En el bucle de tarjetas, en vez de llamar a base de datos (`self.card_fee_repo.get_by_card_and_period`), se obtiene el override en $O(1)$ desde el diccionario en memoria.

2. **Precarga Consolidada en `get_projection`:**
   ```python
   def get_projection(
       self,
       *,
       reference_date: date,
       start_period: str | None = None,
       months: int = 6,
   ) -> DashboardProjectionResponse:
   ```
   - Calcula la lista de períodos a proyectar: `period_strings = [str(start_ym.add_months(i)) for i in range(months)]`.
   - Precarga todos los gastos una sola vez: `expenses = self.expense_repo.list_expenses()`. Debido a las opciones `selectinload` de `ExpenseRepository` (`Expense.card`, `Expense.splits -> ExpenseSplit.person`), SQLAlchemy resuelve el árbol relacional completo en **4 consultas fijas**.
   - Precarga todas las tarifas de mantención para los períodos calculados en **1 consulta batch**:
     `batch_fees = self.card_fee_repo.get_fees_by_periods(period_strings)`.
   - Agrupa en memoria las tarifas por período:
     `fees_by_period: dict[str, dict[uuid.UUID, Decimal]]`.
   - Itera los meses llamando a `get_monthly_summary` pasando `preloaded_expenses=expenses` y `preloaded_fee_overrides=fees_by_period[period_str]`.
   - **Resultado:** La cota de consultas a base de datos para proyecciones de 1 a 24 meses es estrictamente constante: **máximo 5 consultas SQL físicas** (4 para el árbol relacional de compras + 1 para el lote de tarifas).

### 2.3 Modelos e Índices de Base de Datos
Se incorporan 6 índices compuestos canónicos en los modelos SQLAlchemy y en la migración de Alembic:

1. `Expense`:
   - `Index("ix_expenses_purchase_date_created_at", Expense.purchase_date.desc(), Expense.created_at.desc())`
   - `Index("ix_expenses_card_id_purchase_date", "card_id", "purchase_date")`
2. `CardMonthlyFee`:
   - `Index("ix_card_monthly_fees_period_card_id", "period", "card_id")`
3. `ExpenseSplit`:
   - `Index("ix_expense_splits_person_id_expense_id", "person_id", "expense_id")`
4. `Card`:
   - `Index("ix_cards_is_active_name", "is_active", "name")`
5. `Person`:
   - `Index("ix_persons_is_active_name", "is_active", "name")`

**Migración Alembic (`alembic/versions/c7b8d2e4f01a_add_performance_indexes.py`):**
- `down_revision = "6395abdeaa39"`
- `upgrade()`: crea los 6 índices mediante `op.create_index(...)`.
- `downgrade()`: elimina los 6 índices mediante `op.drop_index(...)`.

### 2.4 Configuración y Resiliencia del Pool de Conexiones
1. **Configuración en `app/core/config.py`:**
   ```python
   db_pool_size: int = Field(default=10, alias="DB_POOL_SIZE", ge=1)
   db_max_overflow: int = Field(default=20, alias="DB_MAX_OVERFLOW", ge=0)
   db_pool_recycle: int = Field(default=1800, alias="DB_POOL_RECYCLE", ge=1)
   db_pool_timeout: int = Field(default=30, alias="DB_POOL_TIMEOUT", ge=1)
   ```
   La validación de Pydantic con restricciones `ge` garantiza fail-fast inmediato si se pasa una configuración inválida al iniciar la aplicación.

2. **Inicialización del Motor en `app/core/database.py`:**
   ```python
   is_sqlite = settings.database_url.startswith("sqlite")
   engine_kwargs: dict[str, Any] = {
       "pool_pre_ping": True,
   }
   if is_sqlite:
       engine_kwargs["connect_args"] = {"check_same_thread": False}
   else:
       engine_kwargs.update({
           "pool_size": settings.db_pool_size,
           "max_overflow": settings.db_max_overflow,
           "pool_recycle": settings.db_pool_recycle,
           "pool_timeout": settings.db_pool_timeout,
       })

   engine = create_engine(settings.database_url, **engine_kwargs)
   ```

3. **Manejador de Saturación en `app/core/exceptions.py`:**
   ```python
   from sqlalchemy.exc import TimeoutError as SATimeoutError

   @app.exception_handler(SATimeoutError)
   async def sqlalchemy_timeout_handler(_request: Request, exc: SATimeoutError) -> JSONResponse:
       logger.error("Database connection pool saturated: %s", exc)
       return JSONResponse(
           status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
           content={"detail": "Database connection pool saturated. Service temporarily unavailable."},
       )
   ```
   Al registrarse antes o evaluarse por encima del genérico `SQLAlchemyError`, captura específicamente timeouts de obtención de conexión sin exponer detalles internos de la base de datos.

### 2.5 Compresión HTTP Global en `app/main.py`
En `create_app()`:
```python
from starlette.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```
- Respuestas $\ge 1000$ bytes con `Accept-Encoding: gzip` (sin `q=0`) son comprimidas automáticamente con GZip, agregando `Content-Encoding: gzip`.
- Respuestas $< 1000$ bytes o sin soporte de gzip se envían en texto claro sin comprimir.

---

## 3. Decisiones Técnicas y Alternativas Descartadas

| Decisión Técnica | Alternativa Descartada | Razón del Rechazo |
| :--- | :--- | :--- |
| **Precarga y cálculo en memoria de proyecciones** (`DashboardService`) | Mantener consultas mes a mes o calcular proyecciones en PostgreSQL mediante vistas recursivas (`WITH RECURSIVE`) | Las vistas recursivas romperían la regla inquebrantable de mantener la lógica de amortización pura en `billing_engine.py`, arriesgando discrepancias de redondeo y violando la arquitectura por capas. |
| **Batch fetching de tarifas con `WHERE period IN (...)`** | Cachear tarifas indefinidamente en un diccionario global en proceso | Un cache estático en memoria no se invalida ante cambios de tarifas concurrentes en bases de datos multi-instancia y puede servir datos obsoletos. La consulta batch es ultra-rápida ($O(1)$ queries) y siempre fresca. |
| **`GZipMiddleware(minimum_size=1000)` estándar de Starlette** | Compresión manual mediante decorador de endpoints o delegar exclusivamente en Nginx/reverse proxy | El middleware de Starlette está altamente probado, maneja correctamente la negociación HTTP de cabeceras (`q-values`, `Accept-Encoding`), y funciona de forma consistente tanto en pruebas de integración directas como tras proxies reversos. |
| **Detección automática de dialecto SQLite en pooling** | Usar configuración condicional mediante variable `ENV=test` | Depender de flags de entorno para pooling es propenso a errores en desarrollos locales con SQLite. Inspeccionar el scheme del URI (`sqlite:///`) desacopla la infraestructura del nombre del entorno. |
| **Manejador global para `sqlalchemy.exc.TimeoutError` con 503** | Devolver 500 genérico o reintentar indefinidamente | Un error 500 confunde al cliente haciéndole creer que hubo un bug de código. El código 503 indica claramente sobrecarga temporal y permite al cliente o balanceador aplicar backoff exponencial. |

---

## 4. Estrategia de Tests con Pytest

1. **Tests Unitarios de Repositorio (`test_card_fee_repo.py`):**
   - Verificar `get_fees_by_period`: retorna mapa vacío cuando no hay overrides; retorna mapeo correcto `{card_id: fee}` para el período.
   - Verificar `get_fees_by_periods`: retorna diccionario vacío ante lista vacía de períodos sin consultar DB; agrupa correctamente múltiples períodos y tarjetas.
2. **Tests de Conteo de Consultas SQL (`test_dashboard_query_count.py`):**
   - Utilizar listener de eventos SQLAlchemy `before_cursor_execute` para interceptar y contabilizar cada query ejecutada.
   - Comprobar que llamar a `/api/v1/dashboard/projection` con `months=1`, `months=6`, `months=12` y `months=24` ejecuta invariablemente **$\le 5$ consultas SQL**.
   - Comprobar que llamar a `/api/v1/dashboard/summary` ejecuta 1 query de batch fetching para tarifas en vez de $N$ queries individuales.
3. **Tests de Compresión HTTP (`test_gzip_compression.py`):**
   - Petición con `Accept-Encoding: gzip` a endpoint con respuesta $\ge 1000$ bytes: verificar `Content-Encoding: gzip` y validar descompresión del payload JSON idéntico al original.
   - Petición con `Accept-Encoding: gzip` a endpoint con respuesta $< 1000$ bytes (ej. `/health`): verificar ausencia de `Content-Encoding: gzip`.
   - Petición sin `Accept-Encoding` o con `Accept-Encoding: gzip;q=0`: verificar entrega en texto claro.
4. **Tests de Configuración de Pool y Fail-Fast (`test_database_pool_config.py`):**
   - Validar que instanciar `Settings` con `DB_POOL_SIZE=0`, `DB_MAX_OVERFLOW=-1`, `DB_POOL_RECYCLE=0` o `DB_POOL_TIMEOUT=0` lanza `pydantic.ValidationError`.
   - Validar que bajo SQLite el motor no incluye argumentos no soportados de pooling.
5. **Tests de Manejo de Timeout del Pool (`test_pool_timeout_handler.py`):**
   - Simular lanzamiento de `sqlalchemy.exc.TimeoutError` durante una petición a la API.
   - Comprobar respuesta HTTP `503 Service Unavailable` con cuerpo `{"detail": "Database connection pool saturated. Service temporarily unavailable."}`.
6. **Tests de Migración Alembic:**
   - Comprobar ejecución exitosa de `upgrade head` y reversibilidad total con `downgrade -1`.

---

## 5. Trazabilidad de Requisitos Funcionales (RF)

| Requisito Funcional | Componente / Archivo | Método / Estrategia |
| :--- | :--- | :--- |
| **RF-01** (Invarianza y Precisión Decimal) | Transversal (`DashboardService`, `billing_engine`) | Preservación de tipos `Decimal` y tests de regresión E2E de contratos JSON. |
| **RF-02** (Batch Fetching en Resumen) | `CardFeeRepository`, `DashboardService` | `get_fees_by_period` consulta tarifas en una única operación agrupada. |
| **RF-03** (Batch Preload en Proyección) | `DashboardService`, `ExpenseRepository` | Precarga única en memoria y `get_fees_by_periods`, garantizando $\le 5$ queries SQL. |
| **RF-04** (6 Índices Compuestos Canónicos) | `app/models/`, `alembic/versions/` | Modelos SQLAlchemy y migración `c7b8d2e4f01a_add_performance_indexes.py`. |
| **RF-05** (Compresión HTTP GZip) | `app/main.py` | `GZipMiddleware(minimum_size=1000)` y negociación `Accept-Encoding`. |
| **RF-06** (Configuración y Timeout de Pool) | `app/core/config.py`, `database.py`, `exceptions.py` | Variables tipadas con fail-fast, pooling adaptativo a SQLite y handler HTTP 503. |
| **RF-07** (Sincronización Documental) | `docs/constitution.md`, `MEMORY.md` | Documentación formal de índices, cota de queries y resiliencia de base de datos. |
