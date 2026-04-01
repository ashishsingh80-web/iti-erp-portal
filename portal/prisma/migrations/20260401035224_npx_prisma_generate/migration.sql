-- Replaces an erroneous migration that duplicated the full schema (CREATE TYPE …) and failed on DBs where enums/tables already exist.
-- No DDL: schema is already applied by earlier migrations or `db push`.
SELECT 1;
