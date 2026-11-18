"""Check the incremental case's fixture and versioning rules."""
import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
import incremental_lakehouse as demo


class IncrementalLakehouseTest(unittest.TestCase):
    def test_insert_correction_quarantine_and_identical_replay(self):
        result = demo.run_case()
        manifest = json.loads((demo.ROOT / 'data/processed/manifest.json').read_text())
        baseline, changed, replay = (result['steps'][step] for step in ('baseline', 'incremental', 'replay'))
        self.assertEqual(baseline['orders'], manifest['accepted_rows'])
        self.assertEqual(baseline['revenue_cents'], manifest['revenue_cents'])
        self.assertEqual(baseline['profit_cents'], manifest['profit_cents'])
        self.assertEqual((changed['inserted'], changed['updated'], changed['quarantined']), (1, 1, 1))
        self.assertEqual((changed['orders'], changed['revenue_cents'], changed['profit_cents']), (601, 72974000, 30892500))
        self.assertEqual((replay['inserted'], replay['updated'], replay['quarantined']), (0, 0, 0))
        self.assertEqual(replay['stored_rejections'], 1)
        self.assertEqual(replay['sha256'], changed['sha256'])
        self.assertEqual([row['action'] for row in result['events']], ['inserted', 'updated', 'quarantined'])

    def test_older_revision_cannot_overwrite_and_conflicting_revision_is_rejected(self):
        baseline, changes = demo.batches()
        initial, initial_rejects = demo.prepare('initial', baseline[:1], {})
        accepted, rejected = demo.prepare('changes', [changes[1]], initial)
        updated = demo.projected_state((initial, initial_rejects), accepted, rejected)
        stale, errors = demo.prepare('stale', baseline[:1], updated[0])
        self.assertEqual(demo.projected_state(updated, stale, errors), updated)
        conflict = dict(changes[1], quantity='3')
        accepted, rejected = demo.prepare('conflict', [conflict], updated[0])
        self.assertEqual(accepted, {})
        self.assertEqual(rejected['conflict', 2]['reason'], 'revision_conflict')
