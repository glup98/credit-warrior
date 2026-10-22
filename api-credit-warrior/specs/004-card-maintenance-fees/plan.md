# Plan Técnico 004: Costos de Mantención Mensual por Tarjeta y Reparto Dinámico

- **Spec de referencia:** [`specs/004-card-maintenance-fees/spec.md`](./spec.md)
- **Estado:** Borrador para aprobación
- **Módulo:** `cards`, `billing_engine` & `dashboard`

---

## 1. Arquitectura y Archivos a Crear / Modificar

| Capa | Archivo | Acción | Responsabilidad | RF Cubiertos |
| :--- | :--- | :--- | :--- | :--- |
| **Domain Models** | `app/models/base.py` | Modificar | Registrar `FeeSourceEnum` (`CARD_DEFAULT`, `OVERRIDE`). | `RF-02`, `RF-03` |
| **Domain Models** | `app/models/card.py` | Modificar | Agregar columna `default_monthly_fee` (Numeric(14,2) $\ge 0$) y relación `monthly_fees`. | `RF-01` |
| **Domain Models** | `app/models/card_monthly_fee.py` | Crear | Definir entidad `CardMonthlyFee` (`id`, `card_id`, `period`, `fee`, timestamps, constraints). | `RF-02`, `RF-04`, `RF-05` |
| **Domain Models** | `app/models/__init__.py` | Modificar | Exportar `CardMonthlyFee` y `FeeSourceEnum`. | `RF-01`, `RF-02` |
| **Migrations** | `alembic/versions/<rev>_add_card_monthly_fees.py` | Crear | Migración DDL para `cards.default_monthly_fee` y tabla `card_monthly_fees`. | `RF-01`, `RF-02` |
| **Schemas (DTO)** | `app/schemas/card.py` | Modificar | Agregar `default_monthly_fee` a `CardBase`, `CardCreate`, `CardUpdate`, `CardRead`. | `RF-01`, `RF-05` |
| **Schemas (DTO)** | `app/schemas/card_fee.py` | Crear | DTOs `CardMonthlyFeeCreateOrUpdate` y `CardMonthlyFeeResponse`. | `RF-02`, `RF-03`, `RF-05` |
| **Schemas (DTO)** | `app/schemas/dashboard.py` | Modificar | Extender `CardMonthlySummary` (`purchases_total`, `maintenance_fee`, `total_due`) y `CardPersonBreakdown` (`purchases_amount`, `fee_share`, `amount_due`). | `RF-09` |
| **Schemas (DTO)** | `app/schemas/__init__.py` | Modificar | Exportar nuevos esquemas de mantención. | `RF-01`–`RF-03`, `RF-09` |
| **Pure Domain** | `app/services/billing_engine.py` | Modificar | Añadir funciones puras `prorate_maintenance_fee` y `resolve_card_monthly_fee`. | `RF-06`, `RF-07`, `RF-08` |
| **Repositories** | `app/repositories/card_fee_repo.py` | Crear | Consultas SQLAlchemy 2.0 (`upsert`, `get_by_card_and_period`, `list_by_card`, `delete`). | `RF-02`–`RF-04` |
| **Repositories** | `app/repositories/__init__.py` | Modificar | Exportar `CardFeeRepository`. | `RF-02`–`RF-04` |
| **Services** | `app/services/card_fee_service.py` | Crear | Orquestación del ciclo de vida de tarifas de mantención (upsert, get, list, delete). | `RF-02`–`RF-05` |
| **Services** | `app/services/dashboard_service.py` | Modificar | Incorporar mantención y reparto equitativo en `get_monthly_summary` y `get_projection`. | `RF-06`–`RF-10` |
| **API Endpoints** | `app/api/v1/endpoints/card_fees.py` | Crear | Endpoints REST para `/cards/{card_id}/fees` y `/cards/{card_id}/fees/{period}`. | `RF-02`–`RF-05` |
| **API Router** | `app/api/v1/router.py` | Modificar | Registrar router de `card_fees`. | `RF-02`–`RF-05` |
| **Tests Unitarios** | `tests/unit/test_billing_engine_fees.py` | Crear | Tests unitarios para las funciones puras `prorate_maintenance_fee` y `resolve_card_monthly_fee`. | `RF-06`, `RF-07`, `RF-08` |
| **Tests Unitarios** | `tests/unit/test_models_card_fees.py` | Crear | Verificación de constraints de base de datos e integridad referencial. | `RF-01`, `RF-02` |
| **Tests Unitarios** | `tests/unit/test_schemas_card_fees.py` | Crear | Validación de payload, regex `YYYY-MM`, `extra="forbid"` y valores no negativos. | `RF-01`, `RF-02`, `RF-05` |
| **Tests Integración**| `tests/integration/test_card_fees_api.py` | Crear | Integración REST completa de mantención en tarjetas (PUT idempotente, GET, DELETE). | `RF-01`–`RF-05` |
| **Tests Integración**| `tests/integration/test_dashboard_fees_summary.py`| Crear | Integración en dashboard: invariante de cuadratura, tarjetas inactivas/sin uso, splits. | `RF-06`–`RF-09` |
| **Tests Integración**| `tests/integration/test_dashboard_fees_projection.py`| Crear | Integración en proyecciones: extinción de cuotas y mantención proyectada a `$0`. | `RF-10` |

---

## 2. Modelo de Datos y Migración Alembic

### 2.1 Modificación en `Card` (`app/models/card.py`)
- Columna agregada:
  ```python
  default_monthly_fee: Mapped[Decimal] = mapped_column(
      Numeric(14, 2),
      default=Decimal("0"),
      server_default=sa.text("0"),
      nullable=False,
  )
  ```
- Constraint en `__table_args__`:
  ```python
  CheckConstraint("default_monthly_fee >= 0", name="ck_cards_default_monthly_fee_non_negative")
  ```
- Relación:
  ```python
  monthly_fees: Mapped[list["CardMonthlyFee"]] = relationship(
      "CardMonthlyFee",
      back_populates="card",
      cascade="all, delete-orphan",
      passive_deletes=True,
  )
  ```

### 2.2 Nueva Entidad `CardMonthlyFee` (`app/models/card_monthly_fee.py`)
```python
class CardMonthlyFee(Base, TimestampMixin):
    __tablename__ = "card_monthly_fees"
    __table_args__ = (
        UniqueConstraint("card_id", "period", name="uq_card_monthly_fees_card_period"),
        CheckConstraint("fee >= 0", name="ck_card_monthly_fees_fee_non_negative"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    card_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period: Mapped[str] = mapped_column(String(7), nullable=False)  # YYYY-MM
    fee: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    card: Mapped["Card"] = relationship("Card", back_populates="monthly_fees")
```

### 2.3 Nuevo Enum de Dominio (`app/models/base.py`)
```python
class FeeSourceEnum(enum.StrEnum):
    CARD_DEFAULT = "CARD_DEFAULT"
    OVERRIDE = "OVERRIDE"
```

### 2.4 Migración Alembic
Archivo: `alembic/versions/<timestamp>_add_card_monthly_fees.py`
- Operación `upgrade`:
  1. `op.add_column('cards', sa.Column('default_monthly_fee', sa.Numeric(14, 2), server_default='0', nullable=False))`
  2. `op.create_check_constraint('ck_cards_default_monthly_fee_non_negative', 'cards', 'default_monthly_fee >= 0')`
  3. `op.create_table('card_monthly_fees', ...)` con índices y claves foráneas.
- Operación `downgrade`:
  1. `op.drop_table('card_monthly_fees')`
  2. `op.drop_constraint('ck_cards_default_monthly_fee_non_negative', 'cards', type_='check')`
  3. `op.drop_column('cards', 'default_monthly_fee')`

---

## 3. Funciones Puras en Servicios de Dominio (`billing_engine.py`)

Siguiendo la regla 4.3 de `AGENTS.md`, las funciones del motor financiero son estrictamente puras, deterministas y no invocan al reloj del sistema ni a la base de datos.

### 3.1 Prorrateo de Mantención (`prorate_maintenance_fee`)
```python
@dataclass(frozen=True)
class ParticipantFeeShare:
    """Calculated maintenance fee share for a person."""
    person_id: uuid.UUID
    fee_share: Decimal


def prorate_maintenance_fee(
    fee: Decimal,
    participant_ids: Sequence[uuid.UUID],
    currency: CurrencyEnum,
) -> list[ParticipantFeeShare]:
    """
    Prorate maintenance fee F across active participants strictly ordered by person_id (UUID ascending).
    Applies ROUND_FLOOR ensuring:
    1. base_share = quantize_floor(fee / M, quantum)
    2. share_i = base_share for i in 1..M-1
    3. share_M = fee - (base_share * (M - 1))
    Guarantees share_M >= base_share >= 0 and exact sum preservation.
    """
```
- **Orden determinista:** `sorted_pids = sorted(set(participant_ids))`
- **Casos base:**
  - Si `fee <= Decimal("0")` o no hay participantes ($M = 0$): cada participante recibe `Decimal("0")`.
  - Si $M = 1$: el único participante asume `normalized_fee`.
- **Caso general ($M > 1$):**
  - $\text{base\_share} = \text{quantize\_floor}(\text{normalized\_fee} / M, \text{quantum})$
  - Para los primeros $M - 1$: $\text{share}_i = \text{base\_share}$
  - Para el último participante: $\text{share}_M = \text{normalized\_fee} - (\text{base\_share} \times (M - 1))$

### 3.2 Resolución de Tarifa Efectiva (`resolve_card_monthly_fee`)
```python
def resolve_card_monthly_fee(
    card_is_active: bool,
    purchases_total: Decimal,
    default_fee: Decimal,
    override_fee: Decimal | None,
    currency: CurrencyEnum,
) -> Decimal:
    """
    Determine the effective maintenance fee to charge for a card in a given period.
    Returns Decimal('0') if card is inactive or has no active purchase installments.
    Otherwise returns quantized override_fee if present, or default_fee.
    """
```
- Si `not card_is_active` o `purchases_total <= Decimal("0")`: retorna `Decimal("0")` (o `Decimal("0.00")` según quantum).
- De lo contrario, si `override_fee is not None`: retorna `override_fee.quantize(quantum)`.
- En caso contrario: retorna `default_fee.quantize(quantum)`.

---

## 4. Esquemas DTO (`app/schemas/`)

### 4.1 Modificación en `app/schemas/card.py`
- En `CardBase`:
  ```python
  default_monthly_fee: Decimal = Field(default=Decimal("0"), ge=0)
  ```
- En `CardUpdate`:
  ```python
  default_monthly_fee: Decimal | None = Field(default=None, ge=0)
  ```

### 4.2 Nuevo Archivo `app/schemas/card_fee.py`
```python
class CardMonthlyFeeCreateOrUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fee: Decimal = Field(..., ge=0)


class CardMonthlyFeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    card_id: uuid.UUID
    period: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    fee: Decimal
    source: FeeSourceEnum
```

### 4.3 Extensión Compatible en `app/schemas/dashboard.py`
```python
class CardPersonBreakdown(BaseModel):
    person_id: uuid.UUID
    person_name: str
    purchases_amount: Decimal = Decimal("0")
    fee_share: Decimal = Decimal("0")
    amount_due: Decimal  # purchases_amount + fee_share


class CardMonthlySummary(BaseModel):
    card_id: uuid.UUID
    card_name: str
    currency: CurrencyEnum
    closing_date: date
    due_date: date
    purchases_total: Decimal = Decimal("0")
    maintenance_fee: Decimal = Decimal("0")
    total_due: Decimal  # purchases_total + maintenance_fee
    by_person: list[CardPersonBreakdown]
```

---

## 5. Decisiones Técnicas y Alternativas Descartadas

1. **Almacenamiento de Sobreescrituras (`Overrides`) Exclusivas vs. Generación de Registros Mensuales:**
   - *Decisión:* Persistir en `card_monthly_fees` única y exclusivamente los períodos que contienen un `override` explícito. El valor por defecto se almacena una sola vez en `cards.default_monthly_fee`.
   - *Alternativa descartada:* Generar una fila en base de datos para cada período mensual transcurrido o proyectado. Descartada porque causaría inflación innecesaria de la tabla y rompería la consistencia cuando el usuario modifique `default_monthly_fee` retroactiva o prospectivamente.
2. **Ordenamiento de Participantes para Reparto de Residuo por UUID:**
   - *Decisión:* Ordenar a los participantes de forma ascendente estricta según su identificador UUID (`person_id`).
   - *Alternativa descartada:* Ordenar por nombre o por orden de creación de splits. Descartada porque los nombres de las personas son mutables (pueden ser editados por un endpoint) y el orden de consulta SQL sin clave primaria unívoca no es determinista entre bases de datos. El UUID garantiza determinismo matemático inmutable.
3. **División con `ROUND_FLOOR` y Asignación de Residuo al Último Participante:**
   - *Decisión:* Utilizar truncamiento al piso (`ROUND_FLOOR`) en la cuota base y asignar la diferencia restante al último participante de la lista ordenada por UUID. Esto garantiza que ningún participante reciba montos negativos y que la suma sea exacta.
   - *Alternativa descartada:* Utilizar `ROUND_HALF_UP` en todos los participantes y absorber el delta en el último. Descartada porque si se redondea hacia arriba en varios participantes, la suma provisional puede superar la tarifa total, resultando en un aporte final menor que la cuota base o potencialmente anómalo.
4. **Exclusión de Cargos de Mantención en `active_installments`:**
   - *Decisión:* Mantener `active_installments` restringido estrictamente a cuotas vigentes de compras (`Expense`).
   - *Alternativa descartada:* Inyectar un elemento ficticio en `active_installments` para la mantención. Descartada porque violaría la especificación del dashboard, donde cada elemento de `active_installments` referencia obligatoriamente un `expense_id` y `installments_count`.
5. **Condición de Uso: Mantención $0 si no hay compras activas:**
   - *Decisión:* Evaluar en `0` la mantención si la tarjeta no tiene cuotas activas de compras en el período consultado, o si la tarjeta está inactiva (`is_active = False`).
   - *Alternativa descartada:* Cobrar la mantención fija independientemente de si la tarjeta tuvo actividad. Descartada conforme a los requerimientos de negocio de la banca y a la definición explícita en `RF-06`.

---

## 6. Estrategia de Tests (`pytest`) y Trazabilidad de RF

### 6.1 Tests Unitarios
- `tests/unit/test_models_card_fees.py`:
  - Creación de `Card` con `default_monthly_fee` por defecto `0` (`RF-01`).
  - Constraint `default_monthly_fee >= 0` rechaza negativos en base de datos (`RF-01`, `RF-05`).
  - Creación de `CardMonthlyFee` con constraint de unicidad `(card_id, period)` y constraint `fee >= 0` (`RF-02`, `RF-05`).
  - Cascada: eliminación de `Card` elimina automáticamente sus `CardMonthlyFee` (`RF-02`).
- `tests/unit/test_schemas_card_fees.py`:
  - `CardCreate` y `CardUpdate` con `default_monthly_fee` válido (`RF-01`).
  - Rechazo con 422 de `default_monthly_fee: null` o negativo (`RF-01`, `RF-05`).
  - Validación de formato regex de `period` (`YYYY-MM`) y rechazo de meses inválidos como `2026-13` o `2026-00` (`RF-02`, `RF-05`).
  - Rechazo de campos extra en payload de tarifa mensual (`extra="forbid"`) (`RF-02`, `RF-05`).
- `tests/unit/test_billing_engine_fees.py`:
  - `resolve_card_monthly_fee`: tarjeta inactiva retorna `0`, compras totales `0` retorna `0`, tarjeta activa con compras retorna override si existe o default si no (`RF-06`).
  - `prorate_maintenance_fee`:
    - Tarifa $0 o lista vacía retorna shares en 0 (`RF-08`).
    - 1 participante asume el 100% (`RF-08`).
    - 3 participantes en CLP con tarifa de $5.000: base de $1.666 y último participante con $1.668 (`RF-07`, `RF-08`).
    - 3 participantes en USD con tarifa de $10.00: base de $3.33 y último participante con $3.34 (`RF-07`, `RF-08`).
    - Demostración de no negatividad: $\text{share}_M \ge \text{base\_share} \ge 0$ en combinaciones extremas (`RF-08`).

### 6.2 Tests de Integración
- `tests/integration/test_card_fees_api.py`:
  - `POST /api/v1/cards` y `PATCH /api/v1/cards/{id}` con `default_monthly_fee` (`RF-01`).
  - `PUT /api/v1/cards/{card_id}/fees/{period}` registra e idempotentemente sobreescribe con `200 OK` (`RF-02`).
  - `GET /api/v1/cards/{card_id}/fees` devuelve lista cronológica ascendente (`RF-03`).
  - `GET /api/v1/cards/{card_id}/fees/{period}` devuelve tarifa con `source: "OVERRIDE"` o `source: "CARD_DEFAULT"` (`RF-03`).
  - `DELETE /api/v1/cards/{card_id}/fees/{period}` devuelve `204 No Content` al eliminar override existente y `404 Not Found` al intentar eliminar un período no sobreescrito (`RF-04`).
  - Validación de errores: `404 Not Found` ante `card_id` inexistente, `422 Unprocessable Entity` ante fee negativo o formato de fecha erróneo (`RF-05`).
- `tests/integration/test_dashboard_fees_summary.py`:
  - Tarjeta sin compras o inactiva reporta `maintenance_fee = 0` y no genera cargos en `by_card` ni `totals_by_currency` (`RF-06`).
  - Persona con `is_active = False` pero con cuotas vigentes participa en el prorrateo de mantención de su tarjeta (`RF-07`).
  - Escenario mixto CLP/USD: verificar que `CardMonthlySummary.total_due == purchases_total + maintenance_fee` y `CardPersonBreakdown.amount_due == purchases_amount + fee_share` (`RF-09`).
  - Verificación matemática del invariante de cuadratura:
    $$\text{totals\_by\_currency} \equiv \sum \text{by\_card.total\_due} \equiv \sum \text{by\_person.totals\_by\_currency}$$
- `tests/integration/test_dashboard_fees_projection.py`:
  - Proyección de 6 meses donde una tarjeta agota sus cuotas en el mes 3: en meses 1 y 2 aplica mantención (override o default); en meses 3 a 6 la mantención cae determinísticamente a `$0` (`RF-10`).
