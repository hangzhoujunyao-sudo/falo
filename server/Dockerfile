FROM python:3.13-slim
WORKDIR /app
COPY app.py /app/app.py
RUN useradd --create-home falo && mkdir /data && chown falo:falo /data
USER falo
ENV FALO_DB=/data/falo.sqlite3
VOLUME ["/data"]
EXPOSE 8787
CMD ["python", "app.py", "serve", "--host", "0.0.0.0"]
