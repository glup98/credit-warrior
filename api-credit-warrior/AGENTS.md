# AGENTS.md — Guía Operativa para Agentes en `api-credit-warrior`

Este archivo define las reglas obligatorias de arquitectura, estilo de código, seguridad y flujo de trabajo SDD (*Spec-Driven Development*) para todos los agentes que operan en este repositorio.

---

## 1. Fuentes de Verdad del Proyecto

Antes de planificar, escribir o revisar cualquier cambio, todo agente **debe** consultar:
1. **[`constitution.md`](./constitution.md)**: Documento de Diseño del Sistema (SDD). Define el esquema de base de datos (`Card`, `Person`, `Expense`, `ExpenseSplit`), las fórmulas de ciclos de facturación, el cálculo de cuotas *on-the-fly*, los *splits* y los contratos REST (`/api/v1`).
2. **[`MEMORY.md`](./MEMORY.md)**: Registro vivo del estado del proyecto, decisiones técnicas tomadas e historial de especificaciones completadas.

---

## 2. Flujo de Trabajo SDD y Roles de Subagentes

El desarrollo de funcionalidades se organiza mediante especificaciones en `specs/NNN-nombre/` y se coordina con cuatro roles definidos en `.agents/agents/`:

- **`@coordinator`** ([`.agents/agents/coordinator.md`](./.agents/agents/coordinator.md)): Dirige el ciclo completo sin editar código. Solicita aprobaciones explícitas al usuario tras la `spec.md` y tras el `plan.md` + `tasks.md`.
- **`@planner`** ([`.agents/agents/planner.md`](./.agents/agents/planner.md)): Redacta `spec.md` (requisitos funcionales con sintaxis EARS), `plan.md` y `tasks.md` dentro de `specs/NNN-nombre/`. No modifica código fuera de `specs/`.
- **`@implementer`** ([`.agents/agents/implementer.md`](./.agents/agents/implementer.md)): Ejecuta **una única tarea** del `tasks.md` por invocación aplicando TDD estricto:
  1. Escribir primero el test en `tests/` y verificar que falla (rojo).
  2. Implementar el código mínimo limpio en `app/` para pasar el test (verde).
  3. Ejecutar `pytest` y confirmar que toda la suite pasa antes de marcar la tarea como completada.
- **`@reviewer`** ([`.agents/agents/reviewer.md`](./.agents/agents/reviewer.md)): Actúa como QA. En fase de especificación detecta ambigüedades o choques con `constitution.md`; en fase de validación verifica cada requisito funcional (RF) contra los tests y `git diff`.

---

## 3. Comandos Estándar de Desarrollo y Verificación

| Acción | Comando | Notas |
| :--- | :--- | :--- |
| **Ejecutar suite de tests** | `pytest` | Debe estar 100% en verde al cerrar cualquier tarea. |
| **Ejecutar un test específico** | `pytest tests/unit/test_billing_engine.py` | Útil durante el ciclo TDD de una tarea puntual. |
| **Linter y estilo** | `ruff check .` | Reglas configuradas en `pyproject.toml`. |
| **Type checking** | `mypy app` | Todo código nuevo debe incluir anotaciones de tipo (Python 3.12+). |
| **Generar migración** | `alembic revision --autogenerate -m "mensaje"` | Revisar siempre el archivo generado en `alembic/versions/`. |
| **Aplicar migraciones** | `alembic upgrade head` | Aplica el esquema sobre la base de datos configurada en `DATABASE_URL`. |
| **Levantar servidor local** | `uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` | Siempre hacer bind a `127.0.0.1` en desarrollo/testing. |

---

## 4. Reglas Inquebrantables de Dominio y Arquitectura (Hard Rules)

### 4.1 Precisión Financiera (`Decimal`)
- **PROHIBIDO usar `float`** para representar montos, porcentajes o cálculos de cuotas.
- Utilizar siempre `decimal.Decimal` e importar las constantes de redondeo desde `decimal` (`ROUND_FLOOR`, `ROUND_HALF_UP`).
- Respetar la unidad mínima (`quantum`) por moneda de tarjeta:
  - `CLP`: `Decimal("1")` (sin decimales en facturación local).
  - `USD`: `Decimal("0.01")` (dos decimales).
- **Invariante de Cuotas:** La suma de las $N$ cuotas calculadas debe ser exactamente igual a `expense.total_amount`. Cualquier residuo de división (`remainder`) se asigna determinísticamente a la **cuota #1 (`k = 1`)**.
- **Invariante de Splits:** La suma de los montos asignados a cada persona en una cuota $k$ debe ser exactamente igual al monto de dicha cuota (`installment_amount`). El residuo de redondeo se absorbe en el último participante de la lista de splits.

### 4.2 Cálculo de Cuotas "Al Vuelo" (*On-the-Fly*)
- **PROHIBIDO crear tablas o filas por cada cuota individual** en la base de datos.
- Solo se persiste el registro maestro (`Expense`) y su distribución (`ExpenseSplit`).
- La vigencia de una compra en un período `YYYY-MM` y su número de cuota ($1 \le k \le N$) se calculan dinámicamente en `app/services/billing_engine.py`.

### 4.3 Funciones Puras y Manejo de Fechas
- Los algoritmos de `app/services/billing_engine.py` deben ser **funciones puras**, sin acceso a base de datos ni efectos secundarios.
- Nunca llamar a `date.today()` ni `datetime.now()` dentro del motor de cálculo financiero; toda función que dependa de "hoy" debe recibir `reference_date: date` como parámetro explícito para garantizar tests deterministas.
- Para meses con menos de 31 días (ej. febrero 28/29 o meses de 30 días), ajustar siempre `closing_day` y `due_day` usando `calendar.monthrange(year, month)`.

### 4.4 Arquitectura por Capas
Respetar el flujo unidireccional de dependencias:
`api/v1/endpoints` $\rightarrow$ `services` $\rightarrow$ `repositories` $\rightarrow$ `models` (con DTOs transversales en `schemas`).
- Los **Endpoints (`app/api/`)** solo manejan HTTP, códigos de estado y serialización de esquemas Pydantic. No contienen lógica financiera ni consultas SQL directas.
- Los **Servicios (`app/services/`)** orquestan casos de uso, validan reglas de dominio y llaman al motor puro `billing_engine.py`.
- Los **Repositorios (`app/repositories/`)** encapsulan las consultas a PostgreSQL con SQLAlchemy 2.0 (`select()`, `where()`).

---

## 5. Reglas de Seguridad y Calidad

1. **Prevención de SQL Injection:** Usar exclusivamente consultas parametrizadas del ORM SQLAlchemy 2.0. Prohibido concatenar strings o usar f-strings en sentencias SQL.
2. **Validación Estricta de Payloads:** Todos los esquemas de entrada (`Create` / `Update`) en `app/schemas/` deben declarar `model_config = ConfigDict(extra="forbid")`.
3. **Protección PII / Tarjetas:** Nunca solicitar, almacenar ni registrar en logs números completos de tarjeta (PAN) ni CVV. El campo `last_four_digits` solo acepta exactamente 4 dígitos (`^\d{4}$`).
4. **Gestión de Secretos y Errores:**
   - Ninguna credencial o secreto puede estar hardcodeado en el código fuente. Todo se inyecta vía variables de entorno en `app/core/config.py`.
   - Nunca exponer trazas de `SQLAlchemyError` al cliente HTTP; usar los manejadores de `app/core/exceptions.py`.
5. **Red y Cabeceras HTTP:**
   - En desarrollo y pruebas automatizadas, los servidores deben escuchar únicamente en `127.0.0.1` (`localhost`), nunca en `0.0.0.0`.
   - Mantener activas las cabeceras de seguridad en `app/core/security.py` y las anotaciones `TODO(security)` para los controles de autenticación/autorización diferidos del MVP.

---

## 6. Convenciones de Idioma y Nomenclatura

- **Código fuente, base de datos y contratos JSON:** 100% en **inglés** (`snake_case` para funciones/variables/columnas, `PascalCase` para clases/modelos/esquemas, `UPPER_SNAKE_CASE` para constantes y enums).
- **Documentación (`constitution.md`, `AGENTS.md`, `MEMORY.md`, `specs/`):** En **español** técnico claro.
