FROM paradedb/paradedb:0.23.4

# pg_search, pgvector, pg_trgm, and pg_cron are all pre-installed in this image.
# shared_preload_libraries = 'pg_search,pg_cron,pg_stat_statements' is already
# configured in the base image's postgresql.conf.sample — do NOT redefine it here,
# as a second definition would silently override the first.
