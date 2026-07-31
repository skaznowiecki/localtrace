use common::{AppError, AppResult};
use duckdb::Connection;

struct Migration {
    version: i32,
    #[allow(dead_code)]
    name: &'static str,
    sql: &'static [&'static str],
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        name: "initial",
        sql: &[
            include_str!("migrations/spans.sql"),
            include_str!("migrations/traces.sql"),
            include_str!("migrations/logs.sql"),
            include_str!("migrations/metrics.sql"),
        ],
    },
    Migration {
        version: 2,
        name: "trace_http",
        sql: &[include_str!("migrations/002_trace_http.sql")],
    },
    Migration {
        version: 3,
        name: "trace_http_url",
        sql: &[include_str!("migrations/003_trace_http_url.sql")],
    },
    Migration {
        version: 4,
        name: "trace_http_route",
        sql: &[include_str!("migrations/004_trace_http_route.sql")],
    },
];

fn exec(conn: &Connection, sql: &str) -> AppResult<()> {
    conn.execute(sql, [])
        .map_err(|e| AppError::Database(e.to_string()))?;
    Ok(())
}

fn exec_script(conn: &Connection, sql: &str) -> AppResult<()> {
    for statement in sql.split(';') {
        let statement = statement.trim();
        if statement.is_empty() {
            continue;
        }
        exec(conn, statement)?;
    }
    Ok(())
}

fn ensure_meta_table(conn: &Connection) -> AppResult<()> {
    exec(
        conn,
        "CREATE TABLE IF NOT EXISTS schema_meta (version INTEGER NOT NULL)",
    )
}

fn current_version(conn: &Connection) -> AppResult<i32> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM schema_meta", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    if count == 0 {
        return Ok(0);
    }

    conn.query_row("SELECT version FROM schema_meta LIMIT 1", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))
}

fn set_version(conn: &Connection, version: i32) -> AppResult<()> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM schema_meta", [], |row| row.get(0))
        .map_err(|e| AppError::Database(e.to_string()))?;

    if count == 0 {
        conn.execute("INSERT INTO schema_meta (version) VALUES (?)", [version])
            .map_err(|e| AppError::Database(e.to_string()))?;
    } else {
        conn.execute("UPDATE schema_meta SET version = ?", [version])
            .map_err(|e| AppError::Database(e.to_string()))?;
    }

    Ok(())
}

fn run_migrations(conn: &Connection) -> AppResult<()> {
    ensure_meta_table(conn)?;

    let mut current = current_version(conn)?;

    for migration in MIGRATIONS {
        if migration.version <= current {
            continue;
        }

        if migration.version != current + 1 {
            return Err(AppError::Config(format!(
                "missing migration {} (db at v{current}, next expected v{})",
                current + 1,
                current + 1
            )));
        }

        for script in migration.sql {
            exec_script(conn, script).map_err(|e| {
                AppError::Database(format!(
                    "migration {} ({}): {e}",
                    migration.version, migration.name
                ))
            })?;
        }
        set_version(conn, migration.version)?;
        current = migration.version;
    }

    Ok(())
}

fn assert_not_legacy_schema(conn: &Connection) -> AppResult<()> {
    let traces_exists: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'main' AND table_name = 'traces'",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    if traces_exists == 0 {
        return Ok(());
    }

    let has_legacy_id: i64 = conn
        .query_row(
            "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'main' AND table_name = 'traces' AND column_name = 'id'",
            [],
            |row| row.get(0),
        )
        .map_err(|e| AppError::Database(e.to_string()))?;

    if has_legacy_id > 0 {
        return Err(AppError::Config(
            "legacy MVP database schema detected (traces.id column). Delete or move ./data/local-tracer.db and restart.".into(),
        ));
    }

    Ok(())
}

pub fn init_schema(conn: &Connection) -> AppResult<()> {
    assert_not_legacy_schema(conn)?;
    run_migrations(conn)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn applies_migrations_on_fresh_db() {
        let conn = Connection::open_in_memory().unwrap();
        init_schema(&conn).unwrap();
        assert_eq!(current_version(&conn).unwrap(), 3);
    }

    #[test]
    fn is_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        init_schema(&conn).unwrap();
        init_schema(&conn).unwrap();
        assert_eq!(current_version(&conn).unwrap(), 3);
    }

    #[test]
    fn rejects_legacy_traces_schema() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute(
            "CREATE TABLE traces (id VARCHAR PRIMARY KEY, name VARCHAR)",
            [],
        )
        .unwrap();
        let err = init_schema(&conn).unwrap_err().to_string();
        assert!(err.contains("legacy MVP database schema"));
    }
}
