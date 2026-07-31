use common::Config;
use engine::Repositories;
use service::{LogService, MetricService, SpanService};
use std::sync::Arc;
use tokio::sync::Semaphore;

#[derive(Clone)]
pub struct AppState {
    pub spans: Arc<SpanService>,
    pub logs: Arc<LogService>,
    pub metrics: Arc<MetricService>,
    pub repos: Arc<Repositories>,
    pub config: Config,
    pub ingest_semaphore: Arc<Semaphore>,
}

impl AppState {
    pub fn new(repos: Repositories, config: Config) -> Self {
        let spans = Arc::new(SpanService::new(repos.spans.clone()));
        let logs = Arc::new(LogService::new(repos.logs.clone()));
        let metrics = Arc::new(MetricService::new(repos.metrics.clone()));
        let max_in_flight = config.otlp_max_in_flight;

        Self {
            spans,
            logs,
            metrics,
            repos: Arc::new(repos),
            config,
            ingest_semaphore: Arc::new(Semaphore::new(max_in_flight)),
        }
    }
}
