# MEMORY.md — Estado y Memoria del Proyecto (`api-credit-warrior`)

## Estado Actual
- **Fase:** Especificación 005 (`specs/005-performance-and-query-optimization`) completada e integrada.
- **Documento de Diseño:** [`docs/constitution.md`](./docs/constitution.md) actualizado y sincronizado.
- **Guía de Agentes:** [`AGENTS.md`](./AGENTS.md) configurada y sincronizada con los subagentes SDD en `.agents/agents/`.

## Decisiones Arquitectónicas Clave
1. **Stack Base:** FastAPI + Python 3.12 + PostgreSQL + SQLAlchemy 2.0 (`Mapped` / `mapped_column`) + Alembic + Pydantic V2.
2. **Modelo de Cuotas On-the-Fly:** No se almacenan cuotas individuales en la base de datos. Cada compra es un registro único en `expenses` y las cuotas activas para cualquier período `YYYY-MM` se calculan dinámicamente en `app/services/billing_engine.py`.
3. **Precisión Monetaria:** Uso exclusivo de `Decimal` con `quantum` de `1` para `CLP` y `0.01` para `USD`. El residuo de redondeo de cuotas recae en la cuota #1 (`k = 1`).
4. **Personas sin Auth en MVP:** La entidad `Person` opera como etiqueta maestra para dividir gastos (`EQUAL`, `PERCENTAGE`, `FIXED_AMOUNT`). Los requisitos futuros de autenticación quedan trazados con `TODO(security)`.
5. **Costos de Mantención y Reparto Dinámico (Spec 004):** Tarjetas definen `default_monthly_fee` y admiten sobrescrituras puntuales en `card_monthly_fees`. La mantención solo se activa si la tarjeta tiene compras con cuotas vigentes en el mes consultado. Se reparte equitativamente entre los participantes activos de la tarjeta (ordenados por UUID ascendente), con residuo absorbido por el último participante, garantizando la cuadratura exacta de totales por moneda tanto en resumen como en proyecciones.
6. **Optimización de Consultas y Cota SQL Fija (Spec 005):** Proyecciones multi-mes (`/api/v1/dashboard/projection`) precargan en memoria el grafo relacional de compras y consultan por lotes las sobreescrituras de tarifas (`WHERE period IN (...)`). La cantidad de sentencias SQL es estrictamente constante ($\le 5$ queries físicas) independientemente de si se proyecta 1 o 24 meses.
7. **Compresión GZip con Negociación HTTP RFC 9110 (Spec 005):** `ContentNegotiatedGZipMiddleware(minimum_size=1000)` ubicado antes de middlewares de seguridad para evitar que streaming en `BaseHTTPMiddleware` degrade la evaluación de umbral. Soporta factores de calidad `q=0` para respetar rechazo explícito de clientes.
8. **Resiliencia de Pool con Fail-Fast (Spec 005):** Parámetros `DB_POOL_SIZE`, `DB_MAX_OVERFLOW`, `DB_POOL_RECYCLE` y `DB_POOL_TIMEOUT` con validación `ge` en Pydantic. Dialecto adaptativo para omitir parámetros incompatibles en SQLite. Manejador global de saturación para `TimeoutError` retornando HTTP 503 limpio.

## Historial de Especificaciones (`specs/`)
- **`specs/004-card-maintenance-fees/`:** Implementación completa de costos de mantención mensual por tarjeta y reparto dinámico (`RF-01` a `RF-10`), modelo DDL Alembic, DTOs Pydantic, funciones puras en `billing_engine`, repositorio `CardFeeRepository`, servicio `CardFeeService`, endpoints `/cards/{card_id}/fees`, y extensión compatible de Dashboard (`get_monthly_summary` y `get_projection`). Suite completa de tests unitarios, de integración y E2E en verde.
- **`specs/005-performance-and-query-optimization/`:** Optimización transversal de rendimiento, resolución N+1 en dashboard y proyecciones ($\le 5$ queries fijas), 6 índices compuestos canónicos en base de datos (`c7b8d2e4f01a`), compresión HTTP adaptativa GZip con negociación de cabeceras, resiliencia y fail-fast en pool de conexiones con respuesta HTTP 503 ante saturación. Cobertura completa de tests unitarios e integración en verde.


