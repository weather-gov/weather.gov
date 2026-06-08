# K6 load testing

- `just notebook`: builds a docker image to build a jupyter notebook; any changes
to `k6-visualization.py` will be mirrored to `k6-visualization.ipynb` and vice
versa.

- `just load-test`: runs the k6 load test, by default the target is localhost.

Note that to run these load tests you need to copy `grid.json` which is a
normalized traffic dataset from weather.gov from elsewhere; we do not currently
provide this dataset.
