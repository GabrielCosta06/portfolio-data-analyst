"""Structural checks for the public homepage, without external dependencies."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import unittest

ROOT = Path(__file__).resolve().parents[1]
HOME = ROOT / "index.html"
PORTFOLIO_PAGES = (
    Path("index.html"),
    Path("projects/analytics/index.html"),
    Path("projects/analytics/powerbi/index.html"),
    Path("projects/bigquery/index.html"),
    Path("projects/pipeline/index.html"),
    Path("projects/quality/index.html"),
)


class HomeParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.images_without_alt = []
        self.navs = 0
        self.language = None
        self.alternates = {}
        self.language_links = {}

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag in {"a", "link"} and "href" in attrs:
            self.links.append(attrs["href"])
        if tag == "script" and "src" in attrs:
            self.links.append(attrs["src"])
        if tag == "html":
            self.language = attrs.get("lang")
        if tag == "link" and attrs.get("rel") == "alternate":
            self.alternates[attrs["hreflang"]] = attrs["href"]
        if tag == "a" and "data-language" in attrs:
            self.language_links[attrs["data-language"]] = attrs
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

    def test_bilingual_routes_have_matching_anchors_and_language_links(self):
        for page in PORTFOLIO_PAGES:
            pt = ROOT / page
            en = ROOT / "en" / page
            parsed = {}
            for locale, path in (("pt-BR", pt), ("en", en)):
                with self.subTest(page=path.relative_to(ROOT)):
                    parser = HomeParser()
                    parser.feed(path.read_text(encoding="utf-8"))
                    parsed[locale] = parser
                    self.assertEqual(parser.language, locale)
                    for lang, expected in (("pt-BR", pt), ("en", en)):
                        href = parser.alternates[lang]
                        self.assertEqual((path.parent / href / "index.html").resolve(), expected)
                    for short, expected in (("pt", pt), ("en", en)):
                        link = parser.language_links[short]
                        url = urlsplit(link["href"])
                        self.assertEqual(url.query, f"lang={short}")
                        self.assertEqual((path.parent / url.path / "index.html").resolve(), expected)
                        self.assertEqual(link.get("aria-current") == "true", short == locale.split("-")[0])
                    for link in parser.links:
                        url = urlsplit(link)
                        if url.scheme or url.netloc:
                            continue
                        if url.path:
                            target = path.parent / unquote(url.path)
                            self.assertTrue(target.is_file() or (target / "index.html").is_file(), link)
                        elif url.fragment:
                            self.assertIn(unquote(url.fragment), parser.ids)
            self.assertEqual(parsed["pt-BR"].ids, parsed["en"].ids, page)


if __name__ == "__main__":
    unittest.main()
