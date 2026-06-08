FROM python:3.12-slim

WORKDIR /work

RUN pip install --no-cache-dir \
    jupyterlab==4.* \
    jupytext==1.* \
    pandas==2.* \
    plotly==5.* \
    nbformat

EXPOSE 8888

CMD jupytext --sync /work/*.py 2>/dev/null || true; \
    exec jupyter lab \
        --ip=0.0.0.0 \
        --port=8888 \
        --no-browser \
        --allow-root \
        --ServerApp.token= \
        --ServerApp.password= \
        --ServerApp.root_dir=/work
