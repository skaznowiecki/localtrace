use common::{AppError, AppResult};
use duckdb::Connection;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tracing::warn;

/// Serialized access to the underlying database handle.
pub struct DatabaseConnection {
    inner: Mutex<Connection>,
}

impl DatabaseConnection {
    pub fn open(path: &Path) -> AppResult<Self> {
        let conn = match Connection::open(path) {
            Ok(conn) => conn,
            Err(err) if is_wal_replay_failure(&err.to_string()) => {
                // DuckDB cannot replay this WAL (e.g. a DDL entry whose
                // function-based DEFAULT fails to re-bind during replay).
                // Quarantine the WAL and reopen from the last checkpoint so
                // the process self-heals instead of crashing on every start.
                quarantine_wal(path, &err.to_string())?;
                Connection::open(path).map_err(|e| AppError::Database(e.to_string()))?
            }
            Err(err) => return Err(AppError::Database(err.to_string())),
        };
        Ok(Self {
            inner: Mutex::new(conn),
        })
    }

    pub fn with_conn<F, T>(&self, f: F) -> AppResult<T>
    where
        F: FnOnce(&Connection) -> AppResult<T>,
    {
        let conn = self
            .inner
            .lock()
            .map_err(|_| AppError::Database("database lock poisoned".into()))?;
        f(&conn)
    }
}

fn is_wal_replay_failure(message: &str) -> bool {
    message.contains("replaying WAL") || message.contains("Failure while replaying WAL file")
}

/// Move `<db>.wal` aside so a corrupt/unreplayable WAL doesn't block startup.
/// Un-checkpointed data in the WAL is lost, but the process can recover.
fn quarantine_wal(db_path: &Path, reason: &str) -> AppResult<()> {
    let wal_path = wal_path_for(db_path);
    if !wal_path.exists() {
        return Ok(());
    }

    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let backup = wal_path.with_extension(format!("wal.corrupt-{ts}"));

    std::fs::rename(&wal_path, &backup).map_err(|e| {
        AppError::Database(format!(
            "failed to quarantine corrupt WAL {}: {e}",
            wal_path.display()
        ))
    })?;

    warn!(
        wal = %wal_path.display(),
        backup = %backup.display(),
        reason,
        "quarantined unreplayable DuckDB WAL and recovered from last checkpoint (un-checkpointed data lost)"
    );
    Ok(())
}

fn wal_path_for(db_path: &Path) -> PathBuf {
    let mut os = db_path.as_os_str().to_os_string();
    os.push(".wal");
    PathBuf::from(os)
}
