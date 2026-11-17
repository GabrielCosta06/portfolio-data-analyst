# Sales with Google BigQuery

Load 600 synthetic orders validated by the Python pipeline. The GoogleSQL query calculates revenue, direct costs, gross profit, weighted margin and month-over-month growth. Each row represents one order. The schema uses DATE for dates and NUMERIC for monetary values.

## Run the study

Use the authenticated [bq command-line tool](https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference) in a demonstration Google Cloud project with the BigQuery API enabled. Run the commands from the repository root. Set YOUR_PROJECT_ID to your project ID and US to your dataset location. If the dataset already exists, skip its creation and use its location.

```sh
PROJECT_ID='YOUR_PROJECT_ID'
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

The schema follows the CSV column order. Each load replaces the demonstration table. Monthly partitioning supports the query's date filter. Clustering supports queries that filter by category or region. Check the estimated bytes in the dry run.

## Expected totals

The query returns six months with 100 orders per month. The dataset totals 600 orders, R$728,800.00 in revenue, R$420,300.00 in direct costs and R$308,500.00 in gross profit. Weighted margin is 42.33%. January's growth is null because there is no prior month in the selected period.

Compare the monthly aggregates with the [pipeline manifest](../../data/processed/manifest.json). The Google Cloud run is pending.
