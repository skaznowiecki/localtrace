#[derive(Debug, Clone)]
pub struct Config {
    pub database_path: String,
    pub api_port: u16,
    pub log_level: String,
    pub otlp_max_body_bytes: usize,
    pub otlp_max_in_flight: usize,
}

impl Config {
    pub fn from_env() -> Self {
        let _ = dotenvy::dotenv();

        Config {
            database_path: std::env::var("LT_DATABASE_PATH")
                .unwrap_or_else(|_| "./data/local-tracer.db".into()),
            api_port: std::env::var("LT_API_PORT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(4318),
            log_level: std::env::var("LT_LOG_LEVEL").unwrap_or_else(|_| "info".into()),
            otlp_max_body_bytes: std::env::var("LT_OTLP_MAX_BODY_BYTES")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(16 * 1024 * 1024),
            otlp_max_in_flight: std::env::var("LT_OTLP_MAX_IN_FLIGHT")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(4),
        }
    }
}
