"""Tests for CSV parsing — format detection, amount parsing, sign convention."""
import pytest
from tests.conftest import fixture_path
from csv_import import parse_csv, parse_amount, detect_format, filter_checking_payments


# ── parse_amount ──────────────────────────────────────────────────────────────

class TestParseAmount:
    def test_plain(self):
        assert parse_amount("32.50") == 32.50

    def test_negative(self):
        assert parse_amount("-58.40") == -58.40

    def test_comma_thousands(self):
        assert parse_amount("-1,310.42") == -1310.42

    def test_large_positive(self):
        assert parse_amount("3,475.39") == 3475.39

    def test_quoted(self):
        assert parse_amount('"10,314.46"') == 10314.46

    def test_zero(self):
        assert parse_amount("0.00") == 0.0


# ── detect_format ─────────────────────────────────────────────────────────────

class TestDetectFormat:
    def test_chase_cc(self):
        assert detect_format(["Transaction Date", "Post Date", "Description", "Amount"]) == "chase"

    def test_amex(self):
        assert detect_format(["Date", "Description", "Appears On Your Statement As", "Amount"]) == "amex"

    def test_boa(self):
        assert detect_format(["Posted Date", "Reference Number", "Payee", "Amount"]) == "boa"

    def test_apple(self):
        assert detect_format(["Transaction Date", "Clearing Date", "Amount (USD)"]) == "apple"

    def test_chase_checking(self):
        assert detect_format(["Date", "Description", "Amount", "Running Bal."]) == "chase_checking"

    def test_unknown(self):
        assert detect_format(["foo", "bar", "baz"]) is None

    def test_case_insensitive(self):
        assert detect_format(["TRANSACTION DATE", "POST DATE", "DESCRIPTION"]) == "chase"


# ── parse_csv: Chase CC ───────────────────────────────────────────────────────

class TestChaseCC:
    def setup_method(self):
        with open(fixture_path("chase_cc.csv")) as f:
            content = f.read()
        self.rows, self.fmt = parse_csv(content)

    def test_format_detected(self):
        assert self.fmt == "chase"

    def test_expense_rows_imported(self):
        # Payment row (amount > 0 after flip) excluded as income
        expenses = [r for r in self.rows if r["amount"] > 0]
        assert len(expenses) == 5  # 5 purchases, payment is income

    def test_amounts_positive_for_expenses(self):
        doordash = next(r for r in self.rows if "DOORDASH" in r["merchant"])
        assert doordash["amount"] == 32.50

    def test_payment_row_is_income(self):
        payment = next(r for r in self.rows if "Payment" in r["merchant"])
        assert payment["category"] == "Income"
        assert payment["amount"] < 0

    def test_date_format(self):
        assert all(len(r["date"]) == 10 and r["date"][4] == "-" for r in self.rows)

    def test_categories_assigned(self):
        categories = {r["merchant"]: r["category"] for r in self.rows}
        assert categories["DOORDASH"] == "Food"
        assert categories["NETFLIX.COM"] == "Entertainment"
        assert categories["CHEVRON"] == "Transport"


# ── parse_csv: Chase Checking ─────────────────────────────────────────────────

class TestChaseChecking:
    def setup_method(self):
        with open(fixture_path("chase_checking.csv")) as f:
            content = f.read()
        self.rows, self.fmt = parse_csv(content)

    def test_format_detected(self):
        assert self.fmt == "chase_checking"

    def test_preamble_skipped(self):
        # Summary block (5 rows) should not appear as transactions
        assert not any("Beginning balance" in r["merchant"] for r in self.rows)

    def test_comma_amounts_parsed(self):
        bilt = next(r for r in self.rows if "BILT" in r["merchant"])
        assert bilt["amount"] == 1500.00

    def test_payroll_is_income(self):
        payroll = next(r for r in self.rows if "Stripe" in r["merchant"])
        assert payroll["category"] == "Income"
        assert payroll["amount"] < 0

    def test_bilt_is_rent(self):
        bilt = next(r for r in self.rows if "BILT" in r["merchant"])
        assert bilt["category"] == "Rent"

    def test_spotify_is_entertainment(self):
        spotify = next(r for r in self.rows if "SPOTIFY" in r["merchant"])
        assert spotify["category"] == "Entertainment"


# ── parse_csv: Amex ───────────────────────────────────────────────────────────

class TestAmex:
    def setup_method(self):
        with open(fixture_path("amex.csv")) as f:
            content = f.read()
        self.rows, self.fmt = parse_csv(content)

    def test_format_detected(self):
        assert self.fmt == "amex"

    def test_amex_positive_is_expense(self):
        uber = next(r for r in self.rows if "UBER" in r["merchant"])
        assert uber["amount"] == 18.50

    def test_payment_is_income(self):
        payment = next(r for r in self.rows if "PAYMENT" in r["merchant"])
        assert payment["category"] == "Income"


# ── parse_csv: Apple Card ─────────────────────────────────────────────────────

class TestAppleCard:
    def setup_method(self):
        with open(fixture_path("apple_card.csv")) as f:
            content = f.read()
        self.rows, self.fmt = parse_csv(content)

    def test_format_detected(self):
        assert self.fmt == "apple"

    def test_apple_negative_flipped_to_positive(self):
        netflix = next(r for r in self.rows if "Netflix" in r["merchant"])
        assert netflix["amount"] == 15.99

    def test_food_category(self):
        trader = next(r for r in self.rows if "Trader" in r["merchant"])
        assert trader["category"] == "Food"


# ── filter_checking_payments ──────────────────────────────────────────────────

class TestFilterCheckingPayments:
    def _rows(self, merchants):
        return [{"merchant": m, "amount": 100.0, "date": "2026-04-01", "category": "Other"}
                for m in merchants]

    def test_filters_chase_epay(self):
        rows = self._rows(["CHASE CREDIT CRD DES:EPAY ID:X123"])
        kept, n = filter_checking_payments(rows)
        assert n == 1
        assert kept == []

    def test_filters_online_banking_to_crd(self):
        rows = self._rows(["Online Banking payment to CRD 8069 Confirmation# ABC123"])
        kept, n = filter_checking_payments(rows)
        assert n == 1

    def test_keeps_regular_purchases(self):
        rows = self._rows(["WHOLE FOODS", "SPOTIFY", "BILT PAYMENT"])
        kept, n = filter_checking_payments(rows)
        assert n == 0
        assert len(kept) == 3

    def test_mixed(self):
        rows = self._rows([
            "CHASE CREDIT CRD DES:EPAY",
            "STARBUCKS",
            "Online Banking payment to CRD 4321",
            "DOORDASH",
        ])
        kept, n = filter_checking_payments(rows)
        assert n == 2
        assert len(kept) == 2
        assert all(r["merchant"] in ("STARBUCKS", "DOORDASH") for r in kept)
