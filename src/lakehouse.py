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
