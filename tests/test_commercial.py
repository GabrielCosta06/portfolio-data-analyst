"""Behavioral checks for incremental state and publication guarantees."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("commercial", Path(__file__).resolve().parents[1] / "src/commercial.py")
commercial = importlib.util.module_from_spec(spec)
spec.loader.exec_module(commercial)


class CommercialTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.dims, self.baseline, self.corrections = commercial.fixture(self.root / "raw")
        self.out = self.root / "published"

    def test_financial_identity_and_references(self):
        result = commercial.run(self.baseline, self.dims, self.out)
        t = result["totals"]
        self.assertEqual(t["gross_cents"] - t["discount_cents"] - t["refund_cents"], t["revenue_cents"])
        self.assertEqual(t["revenue_cents"] - t["cost_cents"], t["profit_cents"])
        self.assertEqual(result["quarantined"], 43)
        self.assertEqual(result["rules"]["unknown_customer"], 5)
        self.assertTrue(all(result["checks"].values()))

    def test_late_correction_delete_stale_and_replay(self):
        first = commercial.run(self.baseline, self.dims, self.out)
        second = commercial.run(self.corrections, self.dims, self.out)
        pointer = (self.out / "current.json").read_bytes()
        replay = commercial.run(self.corrections, self.dims, self.out)
        self.assertEqual(second, replay)
        self.assertEqual(pointer, (self.out / "current.json").read_bytes())
        self.assertNotEqual(first["totals"]["revenue_cents"], second["totals"]["revenue_cents"])
        self.assertEqual(first["items"], second["items"])  # one late insertion, one tombstone
        self.assertEqual(second["deleted_items"], 1)
        self.assertEqual(second["stale_events_ignored"], 1)
        self.assertEqual(len(json.loads(pointer)["history"]), 2)

    def test_failed_publication_preserves_every_reader_artifact_then_recovers(self):
        commercial.run(self.baseline, self.dims, self.out)
        pointer = (self.out / "current.json").read_bytes()
        folder = self.out / json.loads(pointer)["path"]
        files = {p.name: p.read_bytes() for p in folder.iterdir()}
        with self.assertRaisesRegex(RuntimeError, "Injected failure"):
            commercial.run(self.corrections, self.dims, self.out, fail_before_publish=True)
        self.assertEqual(pointer, (self.out / "current.json").read_bytes())
        self.assertEqual(files, {p.name: p.read_bytes() for p in folder.iterdir()})
        self.assertFalse(list(self.out.glob(".staging-*")))
        commercial.run(self.corrections, self.dims, self.out)
        self.assertNotEqual(pointer, (self.out / "current.json").read_bytes())

    def test_conflicting_replay_fails_without_publication(self):
        commercial.run(self.baseline, self.dims, self.out)
        pointer = (self.out / "current.json").read_bytes()
        with self.assertRaisesRegex(ValueError, "Conflicting replay"):
            commercial.run([dict(self.baseline[0], quantity=999)], self.dims, self.out)
        self.assertEqual(pointer, (self.out / "current.json").read_bytes())

    def test_conflicting_version_is_quarantined_not_arbitrarily_overwritten(self):
        first = commercial.run(self.baseline[:1], self.dims, self.out)
        second = commercial.run([dict(self.baseline[0], event_id="CONFLICT", quantity=999)], self.dims, self.out)
        self.assertEqual(first["totals"], second["totals"])
        self.assertEqual(second["rules"]["conflicting_item_version"], 1)

    def test_rounding_and_return_reversal(self):
        row = dict(self.baseline[0], quantity=3, returned_qty=1, list_price_cents=101, discount_bps=5000, unit_cost_cents=20)
        result = commercial.run([row], self.dims, self.out)
        self.assertEqual(result["totals"]["revenue_cents"], 102)  # 50.5 rounds half-up to 51
        self.assertEqual(result["totals"]["cost_cents"], 40)

    def test_empty_snapshot_is_valid(self):
        result = commercial.run([], self.dims, self.out)
        self.assertEqual(result["items"], 0)
        self.assertEqual(result["totals"]["revenue_cents"], 0)

    def test_second_writer_fails_closed(self):
        commercial.run(self.baseline[:1], self.dims, self.out)
        previous = (self.out / "current.json").read_bytes()
        (self.out / ".writer.lock").write_text("other-process", encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "Writer lock"):
            commercial.run(self.corrections, self.dims, self.out)
        self.assertEqual(previous, (self.out / "current.json").read_bytes())


if __name__ == "__main__":
    unittest.main()
