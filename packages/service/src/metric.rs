use common::AppResult;
use domain::MetricDataPoint;
use engine::MetricRepository;

pub struct MetricService {
    repo: MetricRepository,
}

impl MetricService {
    pub fn new(repo: MetricRepository) -> Self {
        Self { repo }
    }

    pub fn ingest(&self, points: &[MetricDataPoint]) -> AppResult<()> {
        self.repo.insert(points)
    }
}
