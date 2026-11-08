# Databricks notebook source

# COMMAND ----------

# MAGIC %md
# MAGIC # Lakehouse de vendas — Databricks / PySpark / Delta
# MAGIC 
# MAGIC ## Objetivo
# MAGIC Pipeline reproduzível com dados sintéticos, validação, quarentena e camadas Bronze/Silver/Gold. Nenhum dado de empregador.
# MAGIC 
# MAGIC **Estado:** execução no workspace Databricks pendente; o CI registra sua própria execução separadamente.
# MAGIC 
# MAGIC ## Setup
# MAGIC No Databricks Free Edition, importe este arquivo e use Run all. A execução cria ou substitui somente quatro tabelas no schema `portfolio_gabriel_demo_20261108`, dentro do catálogo atual. Exige permissão para criar schema/tabelas. Sem conexão a AWS/Azure ou fontes externas.
# MAGIC 
# MAGIC Para validar fora do Databricks: Python 3.11, Java 17, `pip install pyspark==4.0.1 delta-spark==4.0.1 nbclient nbformat ipykernel`. Importar o notebook não gera certificado.

# COMMAND ----------

# MAGIC %md
# MAGIC ### 1. Preparar o runtime

# COMMAND ----------

# Databricks provides spark. CI creates a local Spark + Delta session.
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


# COMMAND ----------

# MAGIC %md
# MAGIC ### 2. Gerar dados e definir regras
# MAGIC Grão: uma linha por pedido. Datas de janeiro a junho de 2026. Valores em BRL. Primeira ocorrência válida por identificador; nenhum arredondamento de moeda com mais de duas casas é aceito.

# COMMAND ----------

"""Portable Spark transformations for the synthetic Databricks portfolio notebook."""


def generate_rows():
    fields = ['order_id','order_date','category','region','channel','quantity','unit_price','unit_cost']
    rows = []
    for i in range(600):
        price = [420,85,260][i%3] + (i%7)*5
        cost = [285,49,115][i%3] + (i%5)*3
        rows.append(dict(zip(fields,[f'ORD-{i+1:05d}',f'2026-{i//100+1:02d}-{i%28+1:02d}',
            ['Equipamentos','Consumiveis','Servicos'][i%3],
            ['Sudeste','Sul','Nordeste','Centro-Oeste'][(i//3)%4],
            ['Direto','Distribuidor'][(i//7)%2],str(1+i%8),f'{price:.2f}',f'{cost:.2f}'])))
    rows.extend(dict(row) for row in rows[:20])
    for field,bad in [('quantity','0'),('unit_price','NaN'),('category',''),('order_date','2026-02-31'),('unit_cost','-1')]:
        for i in range(10):
            row=dict(rows[i]);row['order_id']=f'INVALID-{field}-{i}';row[field]=bad;rows.append(row)
    return rows


def build_frames(spark):
    from pyspark.sql import functions as F
    from pyspark.sql.window import Window
    raw = spark.createDataFrame([dict(row,source_row=i+2) for i,row in enumerate(generate_rows())])
    typed = (raw.withColumn('parsed_date',F.expr('try_cast(order_date as date)'))
        .withColumn('qty',F.expr('try_cast(quantity as int)'))
        .withColumn('price',F.expr('try_cast(unit_price as decimal(18,2))'))
        .withColumn('cost',F.expr('try_cast(unit_cost as decimal(18,2))')))
    rules = [
        ('missing_order_id',F.length(F.trim('order_id'))>0),
        ('invalid_date',F.col('parsed_date').isNotNull() & F.col('order_date').rlike(r'^\d{4}-\d{2}-\d{2}$')),
        ('invalid_category',F.col('category').isin('Equipamentos','Consumiveis','Servicos')),
        ('invalid_region',F.col('region').isin('Sudeste','Sul','Nordeste','Centro-Oeste')),
        ('invalid_channel',F.col('channel').isin('Direto','Distribuidor')),
        ('invalid_quantity',F.col('quantity').rlike(r'^\d+$') & (F.col('qty')>0)),
        ('invalid_unit_price',F.col('unit_price').rlike(r'^\d+(\.\d{1,2})?$') & (F.col('price')>=0)),
        ('invalid_unit_cost',F.col('unit_cost').rlike(r'^\d+(\.\d{1,2})?$') & (F.col('cost')>=0))]
    typed=typed.withColumn('reasons',F.concat_ws(';',*[F.when(~F.coalesce(condition,F.lit(False)),F.lit(name)) for name,condition in rules]))
    invalid=typed.filter(F.col('reasons')!='')
    ranked=typed.filter(F.col('reasons')=='').withColumn('row_rank',F.row_number().over(Window.partitionBy('order_id').orderBy('source_row')))
    duplicates=ranked.filter('row_rank > 1').drop('row_rank').withColumn('reasons',F.lit('duplicate_order_id'))
    quarantine=invalid.unionByName(duplicates)
    silver=ranked.filter('row_rank = 1').select('order_id',F.col('parsed_date').alias('order_date'),'category','region','channel',
        F.col('qty').alias('quantity'),(F.col('qty')*F.col('price')).alias('revenue'),(F.col('qty')*F.col('cost')).alias('direct_cost'))
    silver=silver.withColumn('gross_profit',F.col('revenue')-F.col('direct_cost'))
    gold=silver.groupBy(F.date_format('order_date','yyyy-MM').alias('month')).agg(
        F.count('*').alias('orders'),F.sum('revenue').alias('revenue'),F.sum('gross_profit').alias('gross_profit'))
    gold=gold.withColumn('gross_margin',F.when(F.col('revenue')!=0,F.col('gross_profit')/F.col('revenue')))
    return {'bronze':raw,'quarantine':quarantine,'silver':silver,'gold':gold}


# COMMAND ----------

# MAGIC %md
# MAGIC ### 3. Construir Bronze, Silver, Gold e quarentena

# COMMAND ----------

frames=build_frames(spark)
for layer,frame in frames.items():
    print(f'{layer}: {frame.count()} rows')
display(frames['quarantine'].groupBy('reasons').count().orderBy('reasons'))


# COMMAND ----------

# MAGIC %md
# MAGIC ### 4. Persistir e reler Delta

# COMMAND ----------

# Writes only this named demonstration schema or a temporary local directory.
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


# COMMAND ----------

# MAGIC %md
# MAGIC ### 5. Validar contagens, regras e conciliação
# MAGIC Asserções conferem o fixture sintético. Não são metas nem resultados de uma empresa.

# COMMAND ----------

assert saved['bronze'].count()==670
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
    Path('evidence/spark-validation.json').write_text(json.dumps(validation,indent=2)+'\n')


# COMMAND ----------

# MAGIC %md
# MAGIC ### 6. Comparar receita e contribuição de lucro bruto
# MAGIC A tabela mantém os valores exatos; o dashboard web do portfólio permite explorar meses e segmentos.

# COMMAND ----------

# Separate category aggregation: revenue leadership differs from profit contribution.
category_summary=saved['silver'].groupBy('category').agg(
    F.sum('revenue').alias('revenue'),F.sum('gross_profit').alias('gross_profit'))
category_summary=category_summary.withColumn('gross_margin',F.col('gross_profit')/F.col('revenue'))
display(category_summary.orderBy(F.desc('revenue')))


# COMMAND ----------

# MAGIC %md
# MAGIC ### 7. Verificar reexecução

# COMMAND ----------

# Re-run the same full-refresh writes and prove that no records accumulate.
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


# COMMAND ----------

# MAGIC %md
# MAGIC ## Próximos passos
# MAGIC Para produção: contratos por fonte, carga incremental/CDC, observabilidade, testes de integração, orquestração e recuperação de falhas entre camadas. Este full refresh é uma demonstração pequena em memória. Não estima impacto empresarial ou domínio profissional das plataformas.
