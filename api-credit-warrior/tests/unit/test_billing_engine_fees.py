import uuid
from decimal import Decimal

from app.models.base import CurrencyEnum
from app.services.billing_engine import (
    ParticipantFeeShare,
    prorate_maintenance_fee,
    resolve_card_monthly_fee,
)


def test_resolve_card_monthly_fee_inactive_card() -> None:
    # Inactive card must always return zero fee
    fee_clp = resolve_card_monthly_fee(
        card_is_active=False,
        purchases_total=Decimal("50000"),
        default_fee=Decimal("4990"),
        override_fee=None,
        currency=CurrencyEnum.CLP,
    )
    assert fee_clp == Decimal("0")

    fee_usd = resolve_card_monthly_fee(
        card_is_active=False,
        purchases_total=Decimal("100.00"),
        default_fee=Decimal("15.00"),
        override_fee=Decimal("10.00"),
        currency=CurrencyEnum.USD,
    )
    assert fee_usd == Decimal("0.00")


def test_resolve_card_monthly_fee_zero_or_negative_purchases() -> None:
    # Active card with no purchases in the period must return zero fee
    fee_zero = resolve_card_monthly_fee(
        card_is_active=True,
        purchases_total=Decimal("0"),
        default_fee=Decimal("4990"),
        override_fee=None,
        currency=CurrencyEnum.CLP,
    )
    assert fee_zero == Decimal("0")

    fee_neg = resolve_card_monthly_fee(
        card_is_active=True,
        purchases_total=Decimal("-10.50"),
        default_fee=Decimal("15.00"),
        override_fee=Decimal("20.00"),
        currency=CurrencyEnum.USD,
    )
    assert fee_neg == Decimal("0.00")


def test_resolve_card_monthly_fee_default_vs_override() -> None:
    # Without override, uses quantized default_fee
    fee_default = resolve_card_monthly_fee(
        card_is_active=True,
        purchases_total=Decimal("10000"),
        default_fee=Decimal("4990"),
        override_fee=None,
        currency=CurrencyEnum.CLP,
    )
    assert fee_default == Decimal("4990")

    # With override, uses quantized override_fee
    fee_override = resolve_card_monthly_fee(
        card_is_active=True,
        purchases_total=Decimal("10000"),
        default_fee=Decimal("4990"),
        override_fee=Decimal("3500"),
        currency=CurrencyEnum.CLP,
    )
    assert fee_override == Decimal("3500")

    # Override can explicitly be 0 even if default_fee > 0
    fee_override_zero = resolve_card_monthly_fee(
        card_is_active=True,
        purchases_total=Decimal("10000"),
        default_fee=Decimal("4990"),
        override_fee=Decimal("0"),
        currency=CurrencyEnum.CLP,
    )
    assert fee_override_zero == Decimal("0")


def test_resolve_card_monthly_fee_quantum() -> None:
    # CLP quantum is 1 (no decimals)
    fee_clp_rounded = resolve_card_monthly_fee(
        card_is_active=True,
        purchases_total=Decimal("10000"),
        default_fee=Decimal("4990.6"),
        override_fee=None,
        currency=CurrencyEnum.CLP,
    )
    assert fee_clp_rounded == Decimal("4991")

    # USD quantum is 0.01 (2 decimals)
    fee_usd_rounded = resolve_card_monthly_fee(
        card_is_active=True,
        purchases_total=Decimal("50.00"),
        default_fee=Decimal("12.345"),
        override_fee=None,
        currency=CurrencyEnum.USD,
    )
    assert fee_usd_rounded == Decimal("12.35")


def test_prorate_maintenance_fee_empty_participants() -> None:
    result = prorate_maintenance_fee(
        fee=Decimal("5000"),
        participant_ids=[],
        currency=CurrencyEnum.CLP,
    )
    assert result == []


def test_prorate_maintenance_fee_zero_or_negative_fee() -> None:
    pid1 = uuid.uuid4()
    pid2 = uuid.uuid4()

    # Zero fee with multiple participants
    shares_zero = prorate_maintenance_fee(
        fee=Decimal("0"),
        participant_ids=[pid1, pid2],
        currency=CurrencyEnum.CLP,
    )
    assert len(shares_zero) == 2
    assert all(share.fee_share == Decimal("0") for share in shares_zero)

    # Negative fee clamped to 0
    shares_neg = prorate_maintenance_fee(
        fee=Decimal("-500"),
        participant_ids=[pid1],
        currency=CurrencyEnum.USD,
    )
    assert len(shares_neg) == 1
    assert shares_neg[0].fee_share == Decimal("0.00")


def test_prorate_maintenance_fee_single_participant() -> None:
    pid = uuid.uuid4()

    # CLP 100%
    shares_clp = prorate_maintenance_fee(
        fee=Decimal("3500"),
        participant_ids=[pid],
        currency=CurrencyEnum.CLP,
    )
    assert shares_clp == [ParticipantFeeShare(person_id=pid, fee_share=Decimal("3500"))]

    # USD 100% normalized
    shares_usd = prorate_maintenance_fee(
        fee=Decimal("9.99"),
        participant_ids=[pid],
        currency=CurrencyEnum.USD,
    )
    assert shares_usd == [ParticipantFeeShare(person_id=pid, fee_share=Decimal("9.99"))]


def test_prorate_maintenance_fee_deterministic_order_and_deduplication() -> None:
    pids = [uuid.uuid4() for _ in range(3)]
    # Randomize / reverse and add duplicates
    shuffled_with_dups = [pids[2], pids[0], pids[1], pids[0], pids[2]]

    shares = prorate_maintenance_fee(
        fee=Decimal("3000"),
        participant_ids=shuffled_with_dups,
        currency=CurrencyEnum.CLP,
    )

    # Should deduplicate to 3 participants
    assert len(shares) == 3
    # Should be sorted strictly ascending by UUID
    expected_order = sorted(set(pids))
    assert [s.person_id for s in shares] == expected_order


def test_prorate_maintenance_fee_specific_cases() -> None:
    pids = sorted([uuid.uuid4() for _ in range(4)])

    # Case 1: CLP: 3 participants, fee 5.000 -> 1666, 1666, 1668 (sum 5000)
    clp_shares = prorate_maintenance_fee(
        fee=Decimal("5000"),
        participant_ids=pids[:3],
        currency=CurrencyEnum.CLP,
    )
    assert [s.fee_share for s in clp_shares] == [
        Decimal("1666"),
        Decimal("1666"),
        Decimal("1668"),
    ]
    assert sum(s.fee_share for s in clp_shares) == Decimal("5000")

    # Case 2: USD: 3 participants, fee 10.00 -> 3.33, 3.33, 3.34 (sum 10.00)
    usd_shares = prorate_maintenance_fee(
        fee=Decimal("10.00"),
        participant_ids=pids[:3],
        currency=CurrencyEnum.USD,
    )
    assert [s.fee_share for s in usd_shares] == [
        Decimal("3.33"),
        Decimal("3.33"),
        Decimal("3.34"),
    ]
    assert sum(s.fee_share for s in usd_shares) == Decimal("10.00")

    # Case 3: Low fee: CLP with 4 participants, fee 2 -> 0, 0, 0, 2 (sum 2)
    low_fee_shares = prorate_maintenance_fee(
        fee=Decimal("2"),
        participant_ids=pids[:4],
        currency=CurrencyEnum.CLP,
    )
    assert [s.fee_share for s in low_fee_shares] == [
        Decimal("0"),
        Decimal("0"),
        Decimal("0"),
        Decimal("2"),
    ]
    assert sum(s.fee_share for s in low_fee_shares) == Decimal("2")


def test_prorate_maintenance_fee_invariants() -> None:
    # Test strict non-negativity: share_M >= base_share >= 0 and sum(shares) == fee
    pids = [uuid.uuid4() for _ in range(7)]

    # USD 1.00 with 7 participants -> 1.00 / 7 = 0.1428... -> base 0.14 * 6 = 0.84, last gets 0.16
    shares = prorate_maintenance_fee(
        fee=Decimal("1.00"),
        participant_ids=pids,
        currency=CurrencyEnum.USD,
    )
    assert len(shares) == 7
    base = shares[0].fee_share
    assert base == Decimal("0.14")
    for s in shares[:-1]:
        assert s.fee_share == base
    assert shares[-1].fee_share == Decimal("0.16")
    assert shares[-1].fee_share >= base >= Decimal("0")
    assert sum(s.fee_share for s in shares) == Decimal("1.00")
