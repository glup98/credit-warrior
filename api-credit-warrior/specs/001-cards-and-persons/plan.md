# Plan Técnico 001: Gestión de Tarjetas (`Card`) y Personas (`Person`)

- **Spec de referencia:** [`specs/001-cards-and-persons/spec.md`](./spec.md)
- **Estado:** Borrador para aprobación

---

## 1. Arquitectura y Archivos a Crear / Modificar

Siguiendo la arquitectura en capas definida en [`constitution.md`](../../constitution.md) y [`AGENTS.md`](../../AGENTS.md):

| Capa | Archivo | Acción | Responsabilidad | RF Cubiertos |
| :--- | :--- | :--- | :--- | :--- |
| **Models (ORM)** | `app/models/card.py` | Crear | Modelo `Card` en SQLAlchemy 2.0 (`Mapped`, `mapped_column`, `CheckConstraint` 1..31). | `RF-01`, `RF-02` |
| **Models (ORM)** | `app/models/person.py` | Crear | Modelo `Person` en SQLAlchemy 2.0 (`name` único indexado, `color_hex`, `is_active`). | `RF-07`, `RF-08` |
| **Models (ORM)** | `app/models/__init__.py` | Modificar | Exportar `Card`, `Person`, `CurrencyEnum`, `SplitTypeEnum`. | Todos |
| **Schemas (DTO)** | `app/schemas/card.py` | Crear | `CardCreate`, `CardUpdate`, `CardRead` con `ConfigDict(extra="forbid")`, `strip()` de `name` y regex `^\d{4}$`. | `RF-01`, `RF-02`, `RF-05` |
| **Schemas (DTO)** | `app/schemas/person.py` | Crear | `PersonCreate`, `PersonUpdate`, `PersonRead` con `ConfigDict(extra="forbid")`, `strip()` de `name` y regex `^#[0-9A-Fa-f]{6}$`. | `RF-07`, `RF-09` |
| **Exceptions** | `app/core/exceptions.py` | Modificar | Añadir `ConflictError` (`409 Conflict`) y captura de `IntegrityError` para restricciones de unicidad/FK. | `RF-08` |
| **Repositories** | `app/repositories/card_repo.py` | Crear | Consultas parametrizadas SQLAlchemy 2.0 (`list_cards`, `get_by_id`, `create`, `update`, `delete`). | `RF-01`, `RF-03`–`RF-06` |
| **Repositories** | `app/repositories/person_repo.py` | Crear | Consultas parametrizadas (`list_persons`, `get_by_id`, `get_by_name_ci` con `func.lower()`, `create`, `update`, `delete`). | `RF-07`, `RF-08`, `RF-10`, `RF-11` |
| **Services** | `app/services/card_service.py` | Crear | Casos de uso de `Card`, validación de existencia (`EntityNotFoundError` $\rightarrow$ `404`). | `RF-01`–`RF-06` |
| **Services** | `app/services/person_service.py` | Crear | Casos de uso de `Person`, verificación de unicidad *case-insensitive* (`ConflictError` $\rightarrow$ `409`). | `RF-07`–`RF-11` |
| **API v1** | `app/api/v1/endpoints/cards.py` | Crear | Endpoints REST `/api/v1/cards`. | `RF-01`–`RF-06` |
| **API v1** | `app/api/v1/endpoints/persons.py` | Crear | Endpoints REST `/api/v1/persons`. | `RF-07`–`RF-11` |
| **API v1** | `app/api/v1/router.py` | Modificar | Registrar los routers de `cards` y `persons`. | Todos |
| **Tests** | `tests/conftest.py` | Modificar | Fixture de base de datos SQLite en memoria con `StaticPool` y recreación limpia de tablas por test. | Todos |
| **Tests** | `tests/integration/test_cards_api.py` | Crear | Suite de tests de integración para `RF-01` a `RF-06` y casos límite. | `RF-01`–`RF-06` |
| **Tests** | `tests/integration/test_persons_api.py` | Crear | Suite de tests de integración para `RF-07` a `RF-11` y casos límite. | `RF-07`–`RF-11` |

---

## 2. Decisiones Técnicas y Alternativas Descartadas

1. **Comparación *Case-Insensitive* de `Person.name` mediante `func.lower(Person.name)` en el Repositorio:**
   - *Decisión:* Antes de crear o actualizar el nombre de una persona, `PersonRepository.get_by_name_ci(name)` consulta `select(Person).where(func.lower(Person.name) == name.lower())`. Si existe otro registro con distinto `id`, `PersonService` lanza `ConflictError` (`409 Conflict`).
   - *Alternativa descartada:* Depender únicamente de una extensión `CITEXT` de PostgreSQL, ya que rompería la compatibilidad inmediata con SQLite en memoria durante la ejecución ultrarrápida de tests unitarios/integración en `pytest`.
2. **Normalización (`strip()`) en Validadores de Pydantic V2:**
   - *Decisión:* Usar `@field_validator("name", mode="before")` para aplicar `.strip()` a los strings de entrada antes de evaluar `min_length=1`. Así un nombre compuesto solo por espacios (`"   "`) se convierte en `""` y falla automáticamente con `422 Unprocessable Entity`.
   - *Alternativa descartada:* Hacer el `strip()` en el servicio o repositorio, lo que permitiría que el esquema Pydantic aprobara erróneamente cadenas en blanco.
3. **Aislamiento de Base de Datos en Tests (`StaticPool` en SQLite in-memory):**
   - *Decisión:* En `tests/conftest.py`, crear un engine SQLite en memoria con `StaticPool`, ejecutar `Base.metadata.create_all(bind=test_engine)` antes de cada test y `Base.metadata.drop_all(bind=test_engine)` al finalizar, inyectando la sesión vía `app.dependency_overrides[get_db]`.
   - *Alternativa descartada:* Usar una base de datos compartida sin limpieza entre tests, lo que acoplaría el orden de ejecución.

---

## 3. Verification Plan

### Estrategia de Tests (`pytest`)
- **Tests de Integración de Tarjetas (`tests/integration/test_cards_api.py`):**
  - Creación exitosa en `CLP` y `USD`, con y sin `last_four_digits` (`RF-01`).
  - Rechazo `422` por `closing_day`/`due_day` fuera de `1..31`, PAN de más de 4 dígitos o alfanumérico, `name` en blanco y campos extra (`RF-02`).
  - Listado ordenado y filtrado por `is_active` y `currency` (`RF-03`).
  - Obtención por ID (`200` y `404`), actualización parcial `PATCH` (`200` y `404`) y eliminación `DELETE` (`204` y `404`) (`RF-04`, `RF-05`, `RF-06`).
- **Tests de Integración de Personas (`tests/integration/test_persons_api.py`):**
  - Creación exitosa con y sin `color_hex` (`RF-07`).
  - Rechazo `409 Conflict` al duplicar nombre exacto o con distinta capitalización (`"Anyi"` vs `"anyi"`), permitiendo actualizar una persona conservando su propio nombre (`RF-08`).
  - Rechazo `422` por `name` vacío/espacios, `color_hex` inválido o campos extra (`RF-09`).
  - Listado ordenado y filtrado por `is_active` (`RF-10`).
  - Obtención, actualización `PATCH` y eliminación `DELETE` con verificación de `404 Not Found` (`RF-11`).

### Automated Security Check
- **Security Scanner**: Run a scan on all newly created files to identify common vulnerabilities (e.g., XSS, SQL injection). If findings are detected, auto-apply the fix and document the results.
- **Security Audit**: Audit the new code for design-level security issues (input validation, secrets handling, auth checks). Document findings and remediations in the `walkthrough.md` artifact using the `generate_security_audit_report` skill.
