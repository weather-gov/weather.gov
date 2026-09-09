FROM python:3.12-slim

WORKDIR /work

# hadolint ignore=DL3013
RUN pip install --no-cache-dir \
    jupyterlab==4.* \
    jupytext==1.* \
    pandas==2.* \
    plotly==5.* \
    nbformat

COPY k6-visualization.py jupytext.toml /work/
COPY data/counties.json /work/data/

RUN jupytext --sync /work/*.py

EXPOSE 8888

CMD ["jupyter", "lab", \
     "--ip=0.0.0.0", \
     "--port=8888", \
     "--no-browser", \
     "--allow-root", \
     "--ServerApp.token=", \
     "--ServerApp.password=", \
     "--ServerApp.root_dir=/work"]
