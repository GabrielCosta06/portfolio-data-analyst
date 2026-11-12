"""Rebuild deterministic artifacts in temporary locations and compare to committed files."""
import importlib.util
import json
import tempfile
from xml.etree import ElementTree
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ElementTree.parse(ROOT/'assets/icons.svg')
def module(name):
    spec=importlib.util.spec_from_file_location(name,ROOT/'src'/f'{name}.py')
    result=importlib.util.module_from_spec(spec);spec.loader.exec_module(result);return result
with tempfile.TemporaryDirectory() as temporary:
    output=Path(temporary)
    module('commercial').demo(output/'raw',output)
    for path in output.rglob('*'):
        if path.is_file() and path.suffix!='.sqlite':
            expected=ROOT/'data/commercial'/path.relative_to(output)
            if not expected.exists() or path.read_bytes()!=expected.read_bytes():
                raise SystemExit(f'Commercial evidence drift: {expected.relative_to(ROOT)}')
site=module('build_site')
for relative,content in [('index.html',site.home()),('projects/commercial/index.html',site.commercial()),('projects/brazil/index.html',site.public())]:
    if (ROOT/relative).read_text(encoding='utf-8')!=content+'\n':
        raise SystemExit(f'Generated page drift: {relative}; run python src/build_site.py')
module('public_data').build(ROOT/'data/public')
print('Commercial evidence, generated pages and public source: deterministic checks passed')
