"""Validate committed PBIP bindings and create the portable Power BI companion ZIP."""
import json
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
PROJECT=ROOT/'projects/analytics/powerbi/project'


def build():
    model=json.loads((PROJECT/'Vendas.SemanticModel/model.bim').read_text(encoding='utf-8-sig'))
    tables={table['name']:table for table in model['model']['tables']}
    for name,table in tables.items():
        columns={c['name'].casefold() for c in table.get('columns',[])}
        measures={m['name'].casefold() for m in table.get('measures',[])}
        if columns & measures:
            raise ValueError(f'Measure/column name collision in {name}: {columns & measures}')
    refs=[]
    def inspect(value):
        if isinstance(value,dict):
            for key,child in value.items():
                if key in ['Measure','Column'] and isinstance(child,dict) and 'Property' in child:
                    entity=child['Expression']['SourceRef']['Entity']
                    field=child['Property'];group='measures' if key=='Measure' else 'columns'
                    if entity not in tables or field not in {f['name'] for f in tables[entity].get(group,[])}:
                        raise ValueError(f'Unbound {key}: {entity}.{field}')
                    refs.append((entity,field))
                inspect(child)
        elif isinstance(value,list):
            for child in value:inspect(child)
    for path in (PROJECT/'Vendas.Report').rglob('*.json'):
        inspect(json.loads(path.read_text(encoding='utf-8-sig')))
    output=ROOT/'start/PowerBI-pronto.zip'
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for path in sorted(PROJECT.rglob('*'),key=lambda p:p.relative_to(PROJECT).as_posix()):
            if path.is_file() and '.pbi' not in path.parts:
                name='PowerBI/'+path.relative_to(PROJECT).as_posix()
                info=zipfile.ZipInfo(name,date_time=(2026,11,12,0,0,0))
                info.create_system=3
                info.external_attr=0o100644 << 16
                info.compress_type=zipfile.ZIP_DEFLATED
                archive.writestr(info,path.read_bytes().replace(b'\r\n',b'\n'),compresslevel=9)
        for path,name in [(ROOT/'start/PowerBI-LEIA-ME.txt','LEIA-ME.txt'),(ROOT/'projects/analytics/powerbi/measures.dax','measures.dax')]:
            info=zipfile.ZipInfo('PowerBI/'+name,date_time=(2026,11,12,0,0,0))
            info.create_system=3
            info.external_attr=0o100644 << 16
            info.compress_type=zipfile.ZIP_DEFLATED
            archive.writestr(info,path.read_bytes().replace(b'\r\n',b'\n'),compresslevel=9)
    print(f'Power BI: unique model names, {len(refs)} bound references; {output.name}')


if __name__=='__main__':
    build()
