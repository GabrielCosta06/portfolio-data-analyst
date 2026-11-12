import importlib.util
import tempfile
import unittest
from pathlib import Path
from shutil import copyfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("public_data",ROOT / "src/public_data.py")
public_data=importlib.util.module_from_spec(spec)
spec.loader.exec_module(public_data)


class PublicDataTest(unittest.TestCase):
    def test_offline_source_and_units(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            for name in ["brazil.csv","source.json"]:
                copyfile(ROOT / "data/public" / name,folder / name)
            result=public_data.build(folder)
        self.assertEqual(len(result["rows"]),25)
        self.assertEqual(result["checks"]["missing_values"],0)
        self.assertLess(result["rows"][0]["co2"],result["rows"][-1]["co2"])
        self.assertGreater(result["rows"][0]["co2_including_luc"],result["rows"][-1]["co2_including_luc"])

    def test_changed_extract_fails_hash_validation(self):
        with tempfile.TemporaryDirectory() as temp:
            folder=Path(temp)
            copyfile(ROOT / "data/public/source.json",folder / "source.json")
            (folder/"brazil.csv").write_text("changed data",encoding="utf-8")
            with self.assertRaisesRegex(ValueError,"hash mismatch"):
                public_data.build(folder)
