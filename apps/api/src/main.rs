use api::{build_app, state::AppState};
use common::Config;
use engine::Repositories;
use tracing::info;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let config = Config::from_env();

    let env_filter = match std::env::var("RUST_LOG") {
        Ok(rust_log) if !rust_log.trim().is_empty() => {
            tracing_subscriber::EnvFilter::try_new(rust_log)?
        }
        _ => tracing_subscriber::EnvFilter::try_new(format!(
            "api={},tower_http=warn,engine=warn",
            config.log_level
        ))?,
    };

    tracing_subscriber::fmt().with_env_filter(env_filter).init();

    let repos = Repositories::open(&config.database_path)?;
    let state = AppState::new(repos, config.clone());

    let router = build_app(state);

    let addr = format!("0.0.0.0:{}", config.api_port);
    info!(%addr, "starting local-tracer api");

    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, router).await?;

    Ok(())
}
