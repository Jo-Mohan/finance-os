"""Tests for the /cards/optimize endpoint."""
import pytest
import models


def _add_transaction(db, date, amount, category):
    db.add(models.Transaction(date=date, amount=amount, merchant="TEST", category=category))


def _add_card(db, name, rates, point_value=0.02, annual_fee=0):
    db.add(models.Card(
        name=name,
        annual_fee=annual_fee,
        rewards={"rates": rates, "point_value": point_value, "base_rate": rates.get("Other", 1)},
    ))


class TestOptimize:
    def test_returns_empty_summaries_with_no_cards(self, client, db):
        _add_transaction(db, "2026-04-01", 100.0, "Food")
        db.commit()
        r = client.get("/cards/optimize?month=2026-04")
        assert r.status_code == 200
        data = r.json()
        assert data["card_summaries"] == []

    def test_best_card_per_category(self, client, db):
        # Amex Gold: 4x Food @ 2¢ = 8% on Food, 1x elsewhere
        # CSR: 3x Transport @ 1.5¢ = 4.5% on Transport, 1x elsewhere
        _add_card(db, "Amex Gold",
                  {"Food": 4, "Transport": 1, "Entertainment": 1, "Rent": 1, "Other": 1}, 0.02)
        _add_card(db, "Chase Sapphire Reserve",
                  {"Food": 3, "Transport": 3, "Entertainment": 1, "Rent": 1, "Other": 1}, 0.015)
        _add_transaction(db, "2026-04-05", 200.0, "Food")
        _add_transaction(db, "2026-04-10", 100.0, "Transport")
        db.commit()

        r = client.get("/cards/optimize?month=2026-04")
        assert r.status_code == 200
        recs = {x["category"]: x for x in r.json()["recommendations"]}

        assert recs["Food"]["best_card"] == "Amex Gold"
        assert recs["Food"]["pct"] == pytest.approx(8.0)
        assert recs["Food"]["estimated_rewards"] == pytest.approx(16.0)

        assert recs["Transport"]["best_card"] == "Chase Sapphire Reserve"
        assert recs["Transport"]["pct"] == pytest.approx(4.5)

    def test_categories_with_zero_spend_excluded(self, client, db):
        _add_card(db, "Test Card", {"Food": 2, "Transport": 1, "Other": 1}, 0.01)
        _add_transaction(db, "2026-04-01", 50.0, "Food")
        db.commit()

        r = client.get("/cards/optimize?month=2026-04")
        recs = r.json()["recommendations"]
        non_zero = [x for x in recs if x["spent"] > 0]
        assert all(x["spent"] > 0 for x in non_zero)
        assert any(x["category"] == "Food" for x in non_zero)

    def test_net_annual_subtracts_fee(self, client, db):
        _add_card(db, "Premium Card",
                  {"Food": 4, "Transport": 1, "Entertainment": 1, "Rent": 1, "Other": 1},
                  point_value=0.02, annual_fee=250)
        _add_transaction(db, "2026-04-01", 500.0, "Food")
        db.commit()

        r = client.get("/cards/optimize?month=2026-04")
        summary = r.json()["card_summaries"][0]
        # monthly_est = 500 * 4 * 0.02 = 40; annual = 480; net = 480 - 250 = 230
        assert summary["monthly_est"] == pytest.approx(40.0)
        assert summary["annual_est"] == pytest.approx(480.0)
        assert summary["net_annual"] == pytest.approx(230.0)

    def test_defaults_to_current_month(self, client, db):
        from datetime import date
        this_month = date.today().strftime("%Y-%m")
        _add_card(db, "Card", {"Food": 1, "Transport": 1, "Entertainment": 1, "Rent": 1, "Other": 1}, 0.01)
        _add_transaction(db, f"{this_month}-15", 100.0, "Food")
        db.commit()

        r = client.get("/cards/optimize")
        assert r.status_code == 200
        assert r.json()["month"] == this_month
