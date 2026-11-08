# Databricks / PySpark / Delta Lake

Download [sales_lakehouse.ipynb](sales_lakehouse.ipynb) or import the [Databricks Python source](sales_lakehouse.py). Both contain the same synthetic fixture and transformations; no external CSV or Unity Catalog Volume is required.

## Run in Databricks Free Edition

1. In your workspace, use Import and select the IPYNB file.
2. Review the setup cell and the persistence cell. The notebook creates/replaces only `bronze`, `silver`, `quarantine` and `gold` in the demonstration schema `portfolio_gabriel_demo_20261108`, inside the current catalog. It requires schema/table creation permission.
3. Run all cells using the workspace Python/Spark runtime.
4. Check 670 Bronze rows, 600 Silver orders, 70 quarantined rows, six monthly Gold rows, BRL 728,800 revenue and the final rerun assertion.

**Workspace execution remains pending.** The console blocked automated browser control, so no Databricks execution or credential is claimed. Importing or running this study does not award a certification.

## Verified execution

All seven code cells ran successfully in [GitHub Actions run 42510152023](https://github.com/GabrielCosta06/portfolio-data-analyst/actions/runs/42510152023), using Python 3.11, Java 17, PySpark 4.0.1 and Delta Lake 4.0.1. This runtime writes Delta data to an isolated temporary directory and reads it back.

- [Executed notebook with outputs](../../../evidence/sales_lakehouse.executed.ipynb)
- [Machine-readable validation](../../../evidence/spark-validation.json)

To reproduce outside Databricks from the repository root:

```sh
pip install pyspark==4.0.1 delta-spark==4.0.1 nbclient nbformat ipykernel
python src/build_notebook.py
python src/execute_notebook.py
```

The small synthetic full refresh demonstrates transformation and validation. Production CDC, scheduling, access policies, source contracts and recovery across layers require separate work. No employer data is included. Developed with AI assistance.
