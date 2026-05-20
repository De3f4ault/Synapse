FROM postgres:16

RUN apt-get update && apt-get install -y \
    postgresql-16-pgvector \
    postgresql-16-cron \
    && rm -rf /var/lib/apt/lists/*

RUN echo "shared_preload_libraries = 'pg_cron'" >> /usr/share/postgresql/postgresql.conf.sample
RUN echo "cron.database_name = 'synapse'" >> /usr/share/postgresql/postgresql.conf.sample
