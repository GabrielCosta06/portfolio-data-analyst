# Databricks notebook source
# MAGIC %md
# MAGIC # Synthetic sales lakehouse
# MAGIC Companion notebook — not executed in a Databricks workspace in this delivery.
# MAGIC Upload data/raw/sales.csv to a Unity Catalog Volume. Set source_csv and output_root
# MAGIC to paths in an existing volume where you have write permission. No cloud resources are provisioned.
# MAGIC Grain: one valid order line per order_id. Full-refresh demonstration, no CDC.

# COMMAND ----------
dbutils.widgets.text('source_csv', '')
dbutils.widgets.text('output_root', '')
source_csv = dbutils.widgets.get('source_csv')
output_root = dbutils.widgets.get('output_root').rstrip('/')
if not source_csv.startswith('/Volumes/') or not output_root.startswith('/Volumes/'):
    raise ValueError('Provide existing /Volumes/... source_csv and output_root paths.')
if source_csv.startswith(output_root + '/'):
    raise ValueError('Keep input outside the output directory.')

# COMMAND ----------
from pyspark.sql import functions as F
from pyspark.sql.window import Window

columns = ['order_id','order_date','category','region','channel','quantity','unit_price','unit_cost']
raw = spark.read.option('header',True).option('inferSchema',False).csv(source_csv)
if raw.columns != columns:
    raise ValueError(f'Schema mismatch: {raw.columns}')
raw.write.format('delta').mode('overwrite').save(output_root+'/bronze')
bronze = spark.read.format('delta').load(output_root+'/bronze')
typed = (bronze.withColumn('parsed_date',F.expr('try_cast(order_date as date)'))
    .withColumn('qty',F.expr('try_cast(quantity as int)'))
    .withColumn('price',F.expr('try_cast(unit_price as decimal(18,2))'))
    .withColumn('cost',F.expr('try_cast(unit_cost as decimal(18,2))')))
valid_condition = F.coalesce(
    (F.length(F.trim('order_id'))>0) & F.col('parsed_date').isNotNull() & (F.col('qty')>0)
    & F.col('category').isin('Equipamentos','Consumiveis','Servicos')
    & F.col('region').isin('Sudeste','Sul','Nordeste','Centro-Oeste')
    & F.col('channel').isin('Direto','Distribuidor') & (F.col('price')>=0) & (F.col('cost')>=0),F.lit(False))
typed = typed.withColumn('is_valid',valid_condition)
invalid = typed.filter(~F.col('is_valid')).withColumn('reason',F.lit('domain_or_type_validation'))
ranked = typed.filter('is_valid').withColumn('row_rank',F.row_number().over(Window.partitionBy('order_id').orderBy(*columns)))
duplicates = ranked.filter('row_rank > 1').drop('row_rank').withColumn('reason',F.lit('duplicate_order_id'))
quarantine = invalid.unionByName(duplicates)
quarantine.write.format('delta').mode('overwrite').save(output_root+'/quarantine')
silver = ranked.filter('row_rank = 1').select('order_id',F.col('parsed_date').alias('order_date'),
    'category','region','channel',F.col('qty').alias('quantity'),
    (F.col('qty')*F.col('price')).alias('revenue'),(F.col('qty')*F.col('cost')).alias('direct_cost'))
silver = silver.withColumn('gross_profit',F.col('revenue')-F.col('direct_cost'))
silver.write.format('delta').mode('overwrite').save(output_root+'/silver')

# COMMAND ----------
gold = silver.groupBy(F.date_format('order_date','yyyy-MM').alias('month')).agg(
    F.count('*').alias('orders'),F.sum('revenue').alias('revenue'),F.sum('gross_profit').alias('gross_profit'))
gold = gold.withColumn('gross_margin',F.when(F.col('revenue')!=0,F.col('gross_profit')/F.col('revenue')))
gold.write.format('delta').mode('overwrite').save(output_root+'/gold')
assert bronze.count() == 670
assert silver.count() == 600
assert quarantine.count() == 70
assert silver.select('order_id').distinct().count() == silver.count()
assert silver.agg(F.sum('revenue')).first()[0] == 728800
display(gold.orderBy('month'))

# MAGIC %md
# MAGIC The sample checks target the bundled fixture, not arbitrary production inputs.
# MAGIC The local Python pipeline rejects extra decimal places instead of rounding, and keeps
# MAGIC first-valid source order. This Spark companion casts to Decimal(18,2) and selects a
# MAGIC deterministic lexical row for duplicates; align these policies before comparing other inputs.
# MAGIC All writes overwrite only the four output Delta datasets. Not a production deployment.
