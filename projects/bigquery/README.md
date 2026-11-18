# Vendas com Google BigQuery

A demonstração carrega os 600 pedidos sintéticos já validados pelo pipeline Python e calcula receita, custo direto, lucro bruto, margem ponderada e crescimento mensal em GoogleSQL. Cada pedido ocupa uma linha. O esquema usa `DATE` para datas e `NUMERIC` para valores monetários.

## Como reproduzir

Use o [comando bq](https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference) autenticado em um projeto de demonstração com a API BigQuery habilitada. Execute da raiz do repositório. Troque `SEU_PROJECT_ID` e, se necessário, `US` pela localização do seu dataset. Se `portfolio_demo` já existir no projeto, pule o comando de criação e use a localização dele.

```sh
PROJECT_ID='SEU_PROJECT_ID'
BQ_LOCATION='US'

bq --project_id="$PROJECT_ID" --location="$BQ_LOCATION" mk --dataset portfolio_demo

bq --project_id="$PROJECT_ID" --location="$BQ_LOCATION" load \
  --replace --source_format=CSV --skip_leading_rows=1 \
  --time_partitioning_type=MONTH --time_partitioning_field=order_date \
  --clustering_fields=category,region \
  portfolio_demo.fact_sales_bigquery \
  data/processed/fact_sales.csv projects/bigquery/schema.json

bq --project_id="$PROJECT_ID" --location="$BQ_LOCATION" query \
  --use_legacy_sql=false --dry_run < projects/bigquery/analysis.sql

bq --project_id="$PROJECT_ID" --location="$BQ_LOCATION" query \
  --use_legacy_sql=false < projects/bigquery/analysis.sql
```

O esquema segue a ordem das colunas do CSV. A carga substitui a tabela de demonstração a cada execução. O particionamento mensal acompanha o filtro por data da consulta. O clustering por categoria e região serve a consultas que filtrem por essas dimensões. Verifique os bytes estimados no dry run.

## Conciliação esperada

A consulta retorna seis meses, com 100 pedidos em cada um. Os totais da base são 600 pedidos, R$ 728.800,00 de receita, R$ 420.300,00 de custo e R$ 308.500,00 de lucro bruto. A margem do período é 42,33%, calculada pela divisão dos totais de lucro e receita. O crescimento de janeiro fica nulo por falta de mês anterior no recorte.

Confira as agregações no [manifesto do pipeline](../../data/processed/manifest.json). A execução em um projeto Google Cloud está pendente.

## Reproduza os resultados locais

A verificação traduz a consulta GoogleSQL versionada para DuckDB, executa sobre o CSV de vendas tipado e concilia os seis meses com o manifesto do pipeline. A rotina valida a ausência de período anterior no primeiro mês e as variações seguintes. Para verificar a execução e o particionamento no BigQuery, use os passos do Google Cloud acima.

```sh
python -m pip install -r projects/bigquery/requirements.txt
python projects/bigquery/verify_locally.py --check
```

[Resultado em JSON](../../data/processed/bigquery-results.json)
