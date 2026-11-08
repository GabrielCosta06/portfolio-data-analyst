"""CI execution records its environment honestly; it is not a Databricks run."""
from pathlib import Path
import nbformat
from nbclient import NotebookClient

path=Path('projects/pipeline/databricks/sales_lakehouse.ipynb')
notebook=nbformat.read(path,as_version=4)
nbformat.validate(notebook)
client=NotebookClient(notebook,timeout=600,kernel_name='python3')
client.execute()
Path('evidence').mkdir(exist_ok=True)
nbformat.write(notebook,'evidence/sales_lakehouse.executed.ipynb')
print('Notebook executed top-to-bottom using local Spark + Delta in GitHub Actions.')
