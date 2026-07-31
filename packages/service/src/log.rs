use common::AppResult;
use domain::LogRecord;
use engine::LogRepository;

pub struct LogService {
    repo: LogRepository,
}

impl LogService {
    pub fn new(repo: LogRepository) -> Self {
        Self { repo }
    }

    pub fn ingest(&self, logs: &[LogRecord]) -> AppResult<()> {
        self.repo.insert(logs)
    }
}
