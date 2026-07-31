use common::AppResult;
use domain::SpanRecord;
use engine::SpanRepository;

pub struct SpanService {
    repo: SpanRepository,
}

impl SpanService {
    pub fn new(repo: SpanRepository) -> Self {
        Self { repo }
    }

    pub fn ingest(&self, spans: &[SpanRecord]) -> AppResult<()> {
        self.repo.insert(spans)
    }
}
