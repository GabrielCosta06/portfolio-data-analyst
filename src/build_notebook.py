"""Build self-contained IPYNB and Databricks source from the reviewed Spark functions."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
module=(ROOT/'src/lakehouse.py').read_text(encoding='utf-8')
setup='''# Databricks provides spark. CI creates a local Spark + Delta session.
import json
import tempfile
from pathlib import Path
from pyspark.sql import functions as F
ON_DATABRICKS = 'dbutils' in globals()
if not ON_DATABRICKS:
    from pyspark.sql import SparkSession
    from delta import configure_spark_with_delta_pip
    builder = (SparkSession.builder.master('local[2]').appName('gabriel-portfolio-demo')
        .config('spark.sql.extensions','io.delta.sql.DeltaSparkSessionExtension')
        .config('spark.sql.catalog.spark_catalog','org.apache.spark.sql.delta.catalog.DeltaCatalog')
        .config('spark.sql.shuffle.partitions','2')
        .config('spark.ui.enabled','false'))
    spark = configure_spark_with_delta_pip(builder).getOrCreate()
    spark.sparkContext.setLogLevel('ERROR')
    def display(frame):
        frame.show(12,truncate=False)
'''
build='''frames=build_frames(spark)
for layer,frame in frames.items():
    print(f'{layer}: {frame.count()} rows')
display(frames['quarantine'].groupBy('reasons').count().orderBy('reasons'))
'''
persist='''# Writes only this named demonstration schema or a temporary local directory.
# Re-running replaces these four demonstration tables. No enterprise data is read.
if ON_DATABRICKS:
    catalog=spark.sql('SELECT current_catalog()').first()[0]
    namespace=f'`{catalog.replace("`","``")}`.`portfolio_gabriel_demo_20261108`'
    spark.sql(f'CREATE SCHEMA IF NOT EXISTS {namespace}')
    for layer,frame in frames.items():
        frame.write.format('delta').mode('overwrite').saveAsTable(f'{namespace}.{layer}')
    saved={layer:spark.table(f'{namespace}.{layer}') for layer in frames}
    print('Delta tables saved in',namespace)
else:
    local_output=Path(tempfile.mkdtemp(prefix='gabriel-delta-'))
    for layer,frame in frames.items():
        frame.write.format('delta').mode('overwrite').save(str(local_output/layer))
    saved={layer:spark.read.format('delta').load(str(local_output/layer)) for layer in frames}
    print('Delta tables written and read back in an isolated CI directory.')
'''
checks='''assert saved['bronze'].count()==670
assert saved['silver'].count()==600
assert saved['quarantine'].count()==70
assert saved['silver'].select('order_id').distinct().count()==600
totals=saved['silver'].agg(F.sum('revenue'),F.sum('direct_cost'),F.sum('gross_profit')).first()
assert tuple(totals)==(728800,420300,308500)
counts={row.reasons:row['count'] for row in saved['quarantine'].groupBy('reasons').count().collect()}
assert counts=={'duplicate_order_id':20,'invalid_quantity':10,'invalid_unit_price':10,'invalid_category':10,'invalid_date':10,'invalid_unit_cost':10}
display(saved['gold'].orderBy('month'))
validation={'environment':'Databricks' if ON_DATABRICKS else 'GitHub Actions / local Spark + Delta',
    'input_rows':670,'accepted_rows':600,'quarantined_rows':70,
    'revenue':str(totals[0]),'direct_cost':str(totals[1]),'gross_profit':str(totals[2]),'rule_counts':counts}
print(json.dumps(validation,indent=2))
if not ON_DATABRICKS:
    Path('evidence').mkdir(exist_ok=True)
    Path('evidence/spark-validation.json').write_text(json.dumps(validation,indent=2)+'\\n')
'''
analytics='''# Separate category aggregation: revenue leadership differs from profit contribution.
category_summary=saved['silver'].groupBy('category').agg(
    F.sum('revenue').alias('revenue'),F.sum('gross_profit').alias('gross_profit'))
category_summary=category_summary.withColumn('gross_margin',F.col('gross_profit')/F.col('revenue'))
display(category_summary.orderBy(F.desc('revenue')))
'''
rerun='''# Re-run the same full-refresh writes and prove that no records accumulate.
for layer,frame in frames.items():
    if ON_DATABRICKS:
        frame.write.format('delta').mode('overwrite').saveAsTable(f'{namespace}.{layer}')
    else:
        frame.write.format('delta').mode('overwrite').save(str(local_output/layer))
assert (spark.table(f'{namespace}.silver').count() if ON_DATABRICKS else
    spark.read.format('delta').load(str(local_output/'silver')).count())==600
print('PASS: rerun preserves 600 distinct valid orders.')
if not ON_DATABRICKS:
    spark.stop()
'''
sections=[('markdown','# Lakehouse de vendas — Databricks / PySpark / Delta\n\n## Objetivo\nPipeline reproduzível com dados sintéticos, validação, quarentena e camadas Bronze/Silver/Gold. Nenhum dado de empregador.\n\n**Estado:** execução no workspace Databricks pendente; o CI registra sua própria execução separadamente.\n\n## Setup\nNo Databricks Free Edition, importe este arquivo e use Run all. A execução cria ou substitui somente quatro tabelas no schema `portfolio_gabriel_demo_20261108`, dentro do catálogo atual. Exige permissão para criar schema/tabelas. Sem conexão a AWS/Azure ou fontes externas.\n\nPara validar fora do Databricks: Python 3.11, Java 17, `pip install pyspark==4.0.1 delta-spark==4.0.1 nbclient nbformat ipykernel`. Importar o notebook não gera certificado.'),
('markdown','### 1. Preparar o runtime'),('code',setup),
('markdown','### 2. Gerar dados e definir regras\nGrão: uma linha por pedido. Datas de janeiro a junho de 2026. Valores em BRL. Primeira ocorrência válida por identificador; nenhum arredondamento de moeda com mais de duas casas é aceito.'),('code',module),
('markdown','### 3. Construir Bronze, Silver, Gold e quarentena'),('code',build),
('markdown','### 4. Persistir e reler Delta'),('code',persist),
('markdown','### 5. Validar contagens, regras e conciliação\nAsserções conferem o fixture sintético. Não são metas nem resultados de uma empresa.'),('code',checks),
('markdown','### 6. Comparar receita e contribuição de lucro bruto\nA tabela mantém os valores exatos; o dashboard web do portfólio permite explorar meses e segmentos.'),('code',analytics),
('markdown','### 7. Verificar reexecução'),('code',rerun),
('markdown','## Próximos passos\nPara produção: contratos por fonte, carga incremental/CDC, observabilidade, testes de integração, orquestração e recuperação de falhas entre camadas. Este full refresh é uma demonstração pequena em memória. Não estima impacto empresarial ou domínio profissional das plataformas.')]
cells=[]
for i,(kind,source) in enumerate(sections):
    cell={'cell_type':kind,'id':f'gabriel-{i:02d}','metadata':{},'source':source.splitlines(keepends=True)}
    if kind=='code':cell.update(execution_count=None,outputs=[])
    cells.append(cell)
notebook={'nbformat':4,'nbformat_minor':5,'metadata':{'kernelspec':{'name':'python3','display_name':'Python 3','language':'python'},'language_info':{'name':'python'}},'cells':cells}
out=ROOT/'projects/pipeline/databricks'
(out/'sales_lakehouse.ipynb').write_text(json.dumps(notebook,ensure_ascii=False,indent=1)+'\n',encoding='utf-8')
chunks=['# Databricks notebook source']
for kind,source in sections:
    chunks.append('\n# COMMAND ----------\n')
    chunks.append('\n'.join('# MAGIC '+line for line in ('%md\n'+source).splitlines()) if kind=='markdown' else source)
(out/'sales_lakehouse.py').write_text('\n'.join(chunks)+'\n',encoding='utf-8')
print(f'Generated {len(cells)} notebook cells; cloud execution not claimed.')
