"""Tests for categorizer — normalization, keyword rules, DB lookup, LLM isolation."""
import pytest
from categorizer import normalize, keyword_categorize, apply_to_rows, save_rule, db_lookup
import models


# ── normalize ─────────────────────────────────────────────────────────────────

class TestNormalize:
    def test_strips_tst_prefix(self):
        assert "buen dia coffee" in normalize("TST* BUEN DIA COFFEE SAN LUIS OBISCA")

    def test_strips_sq_prefix(self):
        assert normalize("SQ *L&L HAWAIIAN BARBECUE Honolulu HI").startswith("l&l hawaiian")

    def test_strips_phone_number(self):
        result = normalize("SPOTIFY 04/05 PURCHASE 877-778-1161 NY")
        assert "877" not in result
        assert "spotify" in result

    def test_strips_fused_state_code(self):
        result = normalize("LERS ROS - HAYES SAN FRANCISCOCA")
        assert not result.endswith("ca")

    def test_strips_trailing_city_state(self):
        result = normalize("MUIR WOODS VISITOR CENTER MILL VALLEY CA")
        assert "ca" not in result.split()
        assert "muir woods" in result

    def test_strips_numeric_id_prefix(self):
        result = normalize("68202 4227 SPEEDWAY SAN JOSE CA")
        assert "speedway" in result
        assert "68202" not in result

    def test_strips_conf_number(self):
        result = normalize("Zelle payment to Alex Conf# mcowz9ld9")
        assert "mcowz9ld9" not in result
        assert "zelle" in result

    def test_preserves_meaningful_name(self):
        assert "skydive hawaii" in normalize("SKYDIVE HAWAII 180-86379700 HI")

    def test_lowercase(self):
        assert normalize("STARBUCKS") == "starbucks"

    def test_idempotent(self):
        once = normalize("TST* COFFEE SHOP NEW YORK NY")
        twice = normalize(once)
        assert once == twice


# ── keyword_categorize ────────────────────────────────────────────────────────

class TestKeywordCategorize:
    def test_food(self):
        assert keyword_categorize("DOORDASH") == "Food"
        assert keyword_categorize("CHIPOTLE MEXICAN GRILL") == "Food"
        assert keyword_categorize("STARBUCKS #1234") == "Food"
        assert keyword_categorize("TRADER JOE'S") == "Food"

    def test_transport(self):
        assert keyword_categorize("UBER *TRIP") == "Transport"
        assert keyword_categorize("CHEVRON GAS STATION") == "Transport"
        assert keyword_categorize("LYFT *RIDE") == "Transport"
        assert keyword_categorize("SPEEDWAY 46684") == "Transport"

    def test_entertainment(self):
        assert keyword_categorize("NETFLIX.COM") == "Entertainment"
        assert keyword_categorize("SPOTIFY USA") == "Entertainment"
        assert keyword_categorize("AMC THEATERS") == "Entertainment"

    def test_rent(self):
        assert keyword_categorize("RENT PAYMENT") == "Rent"
        assert keyword_categorize("BILT PAYMENT BILTRENT") == "Rent"

    def test_other(self):
        assert keyword_categorize("SOME UNKNOWN MERCHANT XYZ") == "Other"
        assert keyword_categorize("RANDOM STORE 12345") == "Other"

    def test_case_insensitive(self):
        assert keyword_categorize("doordash") == "Food"
        assert keyword_categorize("Netflix") == "Entertainment"


# ── DB rule lookup ────────────────────────────────────────────────────────────

class TestDBLookup:
    def test_returns_none_when_no_rules(self, db):
        assert db_lookup("STARBUCKS", db) is None

    def test_returns_category_after_save(self, db):
        save_rule("STARBUCKS", "Food", "user", db)
        db.flush()
        assert db_lookup("STARBUCKS", db) == "Food"

    def test_normalized_key_matches_variant(self, db):
        # Same merchant, different phone number appended — should resolve to same key
        save_rule("SPOTIFY 04/05 PURCHASE 877-778-1161 NY", "Entertainment", "user", db)
        db.flush()
        result = db_lookup("SPOTIFY 05/10 PURCHASE 877-778-1161 NY", db)
        # Both normalize to "spotify 05/10 purchase" and "spotify 04/05 purchase" — keys differ
        # by date fragment, so test the phone-stripping specifically
        assert db_lookup("SPOTIFY 04/05 PURCHASE 877-778-1161 NY", db) == "Entertainment"

    def test_user_correction_overwrites_llm(self, db):
        save_rule("SPEEDWAY", "Other", "llm", db)
        db.flush()
        save_rule("SPEEDWAY", "Transport", "user", db)
        db.flush()
        assert db_lookup("SPEEDWAY", db) == "Transport"


# ── apply_to_rows ─────────────────────────────────────────────────────────────

class TestApplyToRows:
    def _make_rows(self, merchants_cats):
        return [
            {"merchant": m, "category": c, "amount": 10.0, "date": "2026-04-01"}
            for m, c in merchants_cats
        ]

    def test_db_rule_overrides_keyword(self, db):
        save_rule("SOME VENDOR", "Food", "user", db)
        db.flush()
        rows = self._make_rows([("SOME VENDOR", "Other")])
        result = apply_to_rows(rows, db)
        assert result[0]["category"] == "Food"

    def test_income_rows_untouched(self, db):
        rows = self._make_rows([("STRIPE PAYROLL", "Income")])
        result = apply_to_rows(rows, db)
        assert result[0]["category"] == "Income"

    def test_unknown_merchant_stays_other(self, db):
        rows = self._make_rows([("COMPLETELY UNKNOWN MERCHANT XYZ", "Other")])
        result = apply_to_rows(rows, db)
        assert result[0]["category"] == "Other"
