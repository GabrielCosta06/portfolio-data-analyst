"""Structural checks for the public homepage, without external dependencies."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import unittest

ROOT = Path(__file__).resolve().parents[1]
HOME = ROOT / "index.html"


class HomeParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.images_without_alt = []
        self.navs = 0

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag in {"a", "link"} and "href" in attrs:
            self.links.append(attrs["href"])
        if tag == "img" and "alt" not in attrs:
            self.images_without_alt.append(attrs.get("src", "unknown"))
        if tag == "nav":
            self.navs += 1


class HomepageTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.parser = HomeParser()
        cls.parser.feed(HOME.read_text(encoding="utf-8"))

    def test_homepage_has_main_sections(self):
        for section in {"conteudo", "projetos", "experiencia", "competencias", "curriculo"}:
            with self.subTest(section=section):
                self.assertIn(section, self.parser.ids)

    def test_internal_links_and_anchor_targets_exist(self):
        for link in self.parser.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            with self.subTest(link=link):
                if url.fragment and not url.path:
                    self.assertIn(unquote(url.fragment), self.parser.ids)
                if url.path:
                    target = ROOT / unquote(url.path)
                    self.assertTrue(target.is_file() or (target.is_dir() and (target / "index.html").is_file()), link)

    def test_images_have_alt_and_navigation_exists(self):
        self.assertFalse(self.parser.images_without_alt)
        self.assertGreaterEqual(self.parser.navs, 1)


if __name__ == "__main__":
    unittest.main()
