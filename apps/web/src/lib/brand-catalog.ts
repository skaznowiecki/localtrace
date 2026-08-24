import type { SimpleIcon } from "simple-icons"
import {
  siActix,
  siAdonisjs,
  siAiohttp,
  siAlgolia,
  siAnthropic,
  siApacheairflow,
  siApachecassandra,
  siApachecouchdb,
  siApacheflink,
  siApachehbase,
  siApachehive,
  siApachekafka,
  siApachepulsar,
  siApacherocketmq,
  siApachespark,
  siApachesolr,
  siApollographql,
  siArangodb,
  siAstro,
  siAuth0,
  siBun,
  siCaddy,
  siCelery,
  siClaude,
  siClickhouse,
  siClerk,
  siCloudflare,
  siCloudflareworkers,
  siCockroachlabs,
  siConsul,
  siConvex,
  siCouchbase,
  siDatabricks,
  siDatadog,
  siDeepseek,
  siDeno,
  siDjango,
  siDocker,
  siDotnet,
  siDrizzle,
  siDuckdb,
  siElasticsearch,
  siElevenlabs,
  siElixir,
  siEnvoyproxy,
  siExpress,
  siFastapi,
  siFastify,
  siFirebase,
  siFlask,
  siFlydotio,
  siGeode,
  siGin,
  siGo,
  siGooglebigquery,
  siGooglebigtable,
  siGooglecloud,
  siGooglecloudspanner,
  siGooglecloudstorage,
  siGooglegemini,
  siGooglepubsub,
  siGrafana,
  siGraphql,
  siH2database,
  siHasura,
  siHono,
  siHuggingface,
  siInfluxdb,
  siIstio,
  siJaeger,
  siKeycloak,
  siKoa,
  siKtor,
  siKubernetes,
  siLangchain,
  siLanggraph,
  siLaravel,
  siMariadb,
  siMeilisearch,
  siMetaai,
  siMilvus,
  siMinio,
  siMistralai,
  siModelcontextprotocol,
  siMongodb,
  siMongoose,
  siMqtt,
  siMysql,
  siNatsdotio,
  siNeo4j,
  siNeon,
  siNestjs,
  siNetlify,
  siNewrelic,
  siNextdotjs,
  siNginx,
  siNodedotjs,
  siNuxt,
  siOkta,
  siOllama,
  siOpensearch,
  siOpentelemetry,
  siOpenjdk,
  siOpenrouter,
  siPerplexity,
  siPhp,
  siPhoenixframework,
  siPlanetscale,
  siPocketbase,
  siPostgresql,
  siPosthog,
  siPrisma,
  siPrometheus,
  siPython,
  siQdrant,
  siQuarkus,
  siQwen,
  siRabbitmq,
  siRailway,
  siRedis,
  siRemix,
  siRender,
  siRuby,
  siRubyonrails,
  siRust,
  siScylladb,
  siSentry,
  siSequelize,
  siSidekiq,
  siSocketdotio,
  siSnowflake,
  siSpring,
  siSpringboot,
  siSqlite,
  siSqlalchemy,
  siStripe,
  siSupabase,
  siSurrealdb,
  siSvelte,
  siTemporal,
  siTeradata,
  siTidb,
  siTimescale,
  siTraefikproxy,
  siTrino,
  siTrpc,
  siTurso,
  siTypeorm,
  siUpstash,
  siVault,
  siVercel,
  siVitess,
  siVllm,
} from "simple-icons"

import { VENDORED_GLYPHS } from "./vendored-glyphs"

export type Glyph = {
  title: string
  hex: string
  path: string
}

export type BrandDef = {
  glyph: Glyph
  /** Exact tokens: service name, db.system, component, span.type, scope. */
  aliases: string[]
  /** Distinctive substrings (hosts, breakdown labels). Longer first. */
  needles?: string[]
}

function glyph(icon: SimpleIcon): Glyph {
  return { title: icon.title, hex: icon.hex, path: icon.path }
}

function vendored(id: keyof typeof VENDORED_GLYPHS): Glyph {
  const g = VENDORED_GLYPHS[id]
  return { title: g.title, hex: g.hex, path: g.path }
}

/**
 * Brand catalog for traces/logs. Keys are stable ids used by the UI.
 * Aliases cover OTEL db.system / messaging.system, Datadog `component`,
 * and common service names.
 */
export const BRANDS = {
  postgres: {
    glyph: glyph(siPostgresql),
    aliases: [
      "postgres",
      "postgresql",
      "psycopg",
      "psycopg2",
      "asyncpg",
      "npgsql",
      "pg",
    ],
    needles: ["postgres", "postgresql"],
  },
  mysql: {
    glyph: glyph(siMysql),
    aliases: ["mysql", "mysqldb"],
    needles: ["mysql"],
  },
  sqlserver: {
    glyph: vendored("sqlserver"),
    aliases: ["sqlserver", "mssql", "microsoftsqlserver"],
    needles: ["database.windows.net", "sqlserver"],
  },
  oracle: {
    glyph: vendored("oracle"),
    aliases: ["oracle", "oracledb"],
    needles: ["oraclecloud.com", ".oracle.com"],
  },
  mariadb: {
    glyph: glyph(siMariadb),
    aliases: ["mariadb"],
    needles: ["mariadb"],
  },
  sqlite: {
    glyph: glyph(siSqlite),
    aliases: ["sqlite", "sqlite3", "libsql"],
    needles: ["sqlite"],
  },
  mongo: {
    glyph: glyph(siMongodb),
    aliases: ["mongo", "mongodb", "pymongo"],
    needles: ["mongodb", "mongo"],
  },
  redis: {
    glyph: glyph(siRedis),
    aliases: ["redis", "valkey", "ioredis", "go-redis"],
    needles: ["valkey", "redis"],
  },
  memcached: {
    glyph: {
      title: "Memcached",
      hex: "268D83",
      path: "",
    },
    aliases: ["memcached", "memcache"],
    needles: ["memcached"],
  },
  clickhouse: {
    glyph: glyph(siClickhouse),
    aliases: ["clickhouse", "clickhouse-connect"],
    needles: ["clickhouse"],
  },
  elasticsearch: {
    glyph: glyph(siElasticsearch),
    aliases: ["elasticsearch", "elastic"],
    needles: ["elasticsearch"],
  },
  opensearch: {
    glyph: glyph(siOpensearch),
    aliases: ["opensearch"],
    needles: ["opensearch"],
  },
  cassandra: {
    glyph: glyph(siApachecassandra),
    aliases: ["cassandra"],
    needles: ["cassandra"],
  },
  neo4j: {
    glyph: glyph(siNeo4j),
    aliases: ["neo4j"],
    needles: ["neo4j"],
  },
  cockroachdb: {
    glyph: glyph(siCockroachlabs),
    aliases: ["cockroachdb", "cockroach"],
    needles: ["cockroach"],
  },
  snowflake: {
    glyph: glyph(siSnowflake),
    aliases: ["snowflake"],
    needles: ["snowflake"],
  },
  bigquery: {
    glyph: glyph(siGooglebigquery),
    aliases: ["bigquery", "googlebigquery"],
    needles: ["bigquery"],
  },
  spanner: {
    glyph: glyph(siGooglecloudspanner),
    aliases: ["spanner", "gcp.spanner", "googlecloudspanner"],
    needles: ["spanner"],
  },
  influxdb: {
    glyph: glyph(siInfluxdb),
    aliases: ["influxdb", "influx"],
    needles: ["influx"],
  },
  supabase: {
    glyph: glyph(siSupabase),
    aliases: ["supabase"],
    needles: ["supabase"],
  },
  planetscale: {
    glyph: glyph(siPlanetscale),
    aliases: ["planetscale"],
    needles: ["planetscale"],
  },
  neon: {
    glyph: glyph(siNeon),
    aliases: ["neon"],
    needles: ["neon.tech"],
  },
  turso: {
    glyph: glyph(siTurso),
    aliases: ["turso"],
    needles: ["turso"],
  },
  duckdb: {
    glyph: glyph(siDuckdb),
    aliases: ["duckdb"],
    needles: ["duckdb"],
  },
  timescale: {
    glyph: glyph(siTimescale),
    aliases: ["timescale", "timescaledb"],
    needles: ["timescale"],
  },
  couchbase: {
    glyph: glyph(siCouchbase),
    aliases: ["couchbase"],
    needles: ["couchbase"],
  },
  couchdb: {
    glyph: glyph(siApachecouchdb),
    aliases: ["couchdb"],
    needles: ["couchdb"],
  },
  trino: {
    glyph: glyph(siTrino),
    aliases: ["trino", "presto"],
    needles: ["trino"],
  },
  arangodb: {
    glyph: glyph(siArangodb),
    aliases: ["arangodb"],
    needles: ["arangodb"],
  },
  scylladb: {
    glyph: glyph(siScylladb),
    aliases: ["scylladb", "scylla"],
    needles: ["scylla"],
  },
  h2: {
    glyph: glyph(siH2database),
    aliases: ["h2", "h2database"],
  },
  hbase: {
    glyph: glyph(siApachehbase),
    aliases: ["hbase"],
    needles: ["hbase"],
  },
  hive: {
    glyph: glyph(siApachehive),
    aliases: ["hive"],
  },
  solr: {
    glyph: glyph(siApachesolr),
    aliases: ["solr"],
    needles: ["solr"],
  },
  geode: {
    glyph: glyph(siGeode),
    aliases: ["geode"],
  },
  teradata: {
    glyph: glyph(siTeradata),
    aliases: ["teradata"],
    needles: ["teradata"],
  },
  milvus: {
    glyph: glyph(siMilvus),
    aliases: ["milvus"],
    needles: ["milvus"],
  },
  qdrant: {
    glyph: glyph(siQdrant),
    aliases: ["qdrant"],
    needles: ["qdrant"],
  },
  meilisearch: {
    glyph: glyph(siMeilisearch),
    aliases: ["meilisearch"],
    needles: ["meilisearch"],
  },
  algolia: {
    glyph: glyph(siAlgolia),
    aliases: ["algolia"],
    needles: ["algolia"],
  },
  prisma: {
    glyph: glyph(siPrisma),
    aliases: ["prisma"],
    needles: ["prisma"],
  },
  drizzle: {
    glyph: glyph(siDrizzle),
    aliases: ["drizzle", "drizzle-orm"],
    needles: ["drizzle"],
  },
  sequelize: {
    glyph: glyph(siSequelize),
    aliases: ["sequelize"],
    needles: ["sequelize"],
  },
  typeorm: {
    glyph: glyph(siTypeorm),
    aliases: ["typeorm"],
    needles: ["typeorm"],
  },
  sqlalchemy: {
    glyph: glyph(siSqlalchemy),
    aliases: ["sqlalchemy"],
    needles: ["sqlalchemy"],
  },
  mongoose: {
    glyph: glyph(siMongoose),
    aliases: ["mongoose"],
  },
  s3: {
    glyph: vendored("s3"),
    aliases: ["s3", "amazons3", "aws.s3"],
    needles: ["s3.amazonaws.com"],
  },
  aws: {
    glyph: vendored("aws"),
    aliases: ["aws", "amazonwebservices", "amazon-web-services", "sns", "aws_sns"],
  },
  dynamodb: {
    glyph: vendored("dynamodb"),
    aliases: ["dynamodb", "aws.dynamodb"],
    needles: ["dynamodb"],
  },
  rds: {
    glyph: vendored("rds"),
    aliases: ["rds", "amazonrds", "aws.rds"],
    needles: ["rds.amazonaws"],
  },
  redshift: {
    glyph: vendored("redshift"),
    aliases: ["redshift", "amazonredshift"],
    needles: ["redshift"],
  },
  sqs: {
    glyph: vendored("sqs"),
    aliases: ["sqs", "aws_sqs", "amazonsqs"],
    needles: ["sqs.amazonaws"],
  },
  lambda: {
    glyph: vendored("lambda"),
    aliases: ["lambda", "awslambda", "aws.lambda"],
    needles: ["lambda.amazonaws"],
  },
  apigateway: {
    glyph: vendored("apigateway"),
    aliases: ["apigateway", "api-gateway", "amazonapigateway"],
    needles: ["execute-api"],
  },
  cloudwatch: {
    glyph: vendored("cloudwatch"),
    aliases: ["cloudwatch", "amazoncloudwatch"],
    needles: ["monitoring.amazonaws", "logs.amazonaws"],
  },
  cognito: {
    glyph: vendored("cognito"),
    aliases: ["cognito", "amazoncognito"],
    needles: ["cognito-idp", "cognito-identity"],
  },
  documentdb: {
    glyph: vendored("documentdb"),
    aliases: ["documentdb", "docdb", "amazondocumentdb"],
    needles: ["docdb.amazonaws", "documentdb"],
  },
  elasticache: {
    glyph: vendored("elasticache"),
    aliases: ["elasticache", "amazonelasticache"],
    needles: ["elasticache"],
  },
  route53: {
    glyph: vendored("route53"),
    aliases: ["route53", "amazonroute53"],
    needles: ["route53"],
  },
  ecs: {
    glyph: vendored("ecs"),
    aliases: ["ecs", "amazonecs"],
    needles: ["ecs.amazonaws"],
  },
  eks: {
    glyph: vendored("eks"),
    aliases: ["eks", "amazoneks"],
    needles: ["eks.amazonaws"],
  },
  ec2: {
    glyph: vendored("ec2"),
    aliases: ["ec2", "amazonec2"],
    needles: ["ec2.amazonaws"],
  },
  amplify: {
    glyph: vendored("amplify"),
    aliases: ["amplify", "awsamplify"],
    needles: ["amplifyapp.com"],
  },
  secretsmanager: {
    glyph: vendored("secretsmanager"),
    aliases: ["secretsmanager", "awssecretsmanager"],
    needles: ["secretsmanager"],
  },
  iam: {
    glyph: vendored("iam"),
    aliases: ["iam"],
    needles: ["iam.amazonaws"],
  },
  ses: {
    glyph: vendored("ses"),
    aliases: ["ses", "amazonses", "amazonsimpleemailservice"],
    needles: ["email-smtp", "amazonses"],
  },
  elb: {
    glyph: vendored("elb"),
    aliases: ["elb", "elbv2", "elasticloadbalancing"],
    needles: ["elasticloadbalancing", "elb.amazonaws"],
  },
  awsorganizations: {
    glyph: vendored("organizations"),
    aliases: ["awsorganizations", "aws-organizations"],
    needles: ["organizations.amazonaws"],
  },
  nextjs: {
    glyph: glyph(siNextdotjs),
    aliases: ["nextjs", "next.js", "next", "platform", "platform-web"],
    needles: ["next.js", "nextjs"],
  },
  express: {
    glyph: glyph(siExpress),
    aliases: ["express", "expressjs"],
    needles: ["express"],
  },
  fastapi: {
    glyph: glyph(siFastapi),
    aliases: ["fastapi", "starlette", "internal-api"],
    needles: ["fastapi"],
  },
  django: {
    glyph: glyph(siDjango),
    aliases: ["django"],
    needles: ["django"],
  },
  flask: {
    glyph: glyph(siFlask),
    aliases: ["flask"],
  },
  nestjs: {
    glyph: glyph(siNestjs),
    aliases: ["nestjs", "nest"],
    needles: ["nestjs"],
  },
  rails: {
    glyph: glyph(siRubyonrails),
    aliases: ["rails", "ruby-on-rails", "rubyonrails"],
    needles: ["rubyonrails"],
  },
  spring: {
    glyph: glyph(siSpring),
    aliases: ["spring"],
  },
  springboot: {
    glyph: glyph(siSpringboot),
    aliases: ["springboot", "spring-boot"],
    needles: ["springboot", "spring-boot"],
  },
  laravel: {
    glyph: glyph(siLaravel),
    aliases: ["laravel"],
    needles: ["laravel"],
  },
  nuxt: {
    glyph: glyph(siNuxt),
    aliases: ["nuxt", "nuxtjs", "nuxt.js"],
    needles: ["nuxt"],
  },
  remix: {
    glyph: glyph(siRemix),
    aliases: ["remix"],
  },
  hono: {
    glyph: glyph(siHono),
    aliases: ["hono"],
  },
  fastify: {
    glyph: glyph(siFastify),
    aliases: ["fastify"],
    needles: ["fastify"],
  },
  astro: {
    glyph: glyph(siAstro),
    aliases: ["astro"],
  },
  svelte: {
    glyph: glyph(siSvelte),
    aliases: ["svelte", "sveltekit"],
    needles: ["svelte"],
  },
  koa: {
    glyph: glyph(siKoa),
    aliases: ["koa"],
  },
  gin: {
    glyph: glyph(siGin),
    aliases: ["gin"],
  },
  actix: {
    glyph: glyph(siActix),
    aliases: ["actix", "actix-web"],
    needles: ["actix"],
  },
  adonisjs: {
    glyph: glyph(siAdonisjs),
    aliases: ["adonis", "adonisjs"],
    needles: ["adonis"],
  },
  phoenix: {
    glyph: glyph(siPhoenixframework),
    aliases: ["phoenix"],
  },
  quarkus: {
    glyph: glyph(siQuarkus),
    aliases: ["quarkus"],
    needles: ["quarkus"],
  },
  ktor: {
    glyph: glyph(siKtor),
    aliases: ["ktor"],
  },
  aiohttp: {
    glyph: glyph(siAiohttp),
    aliases: ["aiohttp"],
    needles: ["aiohttp"],
  },
  kafka: {
    glyph: glyph(siApachekafka),
    aliases: ["kafka"],
    needles: ["kafka"],
  },
  rabbitmq: {
    glyph: glyph(siRabbitmq),
    aliases: ["rabbitmq", "amqp"],
    needles: ["rabbitmq"],
  },
  nats: {
    glyph: glyph(siNatsdotio),
    aliases: ["nats"],
  },
  pulsar: {
    glyph: glyph(siApachepulsar),
    aliases: ["pulsar"],
    needles: ["pulsar"],
  },
  rocketmq: {
    glyph: glyph(siApacherocketmq),
    aliases: ["rocketmq"],
    needles: ["rocketmq"],
  },
  mqtt: {
    glyph: glyph(siMqtt),
    aliases: ["mqtt"],
  },
  celery: {
    glyph: glyph(siCelery),
    aliases: ["celery"],
    needles: ["celery"],
  },
  pubsub: {
    glyph: glyph(siGooglepubsub),
    aliases: ["pubsub", "gcp_pubsub", "googlepubsub"],
    needles: ["pubsub"],
  },
  temporal: {
    glyph: glyph(siTemporal),
    aliases: ["temporal"],
    needles: ["temporal"],
  },
  socketio: {
    glyph: glyph(siSocketdotio),
    aliases: ["socket.io", "socketio"],
    needles: ["socket.io"],
  },
  graphql: {
    glyph: glyph(siGraphql),
    aliases: ["graphql"],
    needles: ["graphql"],
  },
  apollo: {
    glyph: glyph(siApollographql),
    aliases: ["apollo"],
    needles: ["apollo"],
  },
  trpc: {
    glyph: glyph(siTrpc),
    aliases: ["trpc"],
    needles: ["trpc"],
  },
  openai: {
    glyph: vendored("openai"),
    aliases: ["openai"],
    needles: ["openai"],
  },
  anthropic: {
    glyph: glyph(siAnthropic),
    aliases: ["anthropic"],
    needles: ["anthropic"],
  },
  huggingface: {
    glyph: glyph(siHuggingface),
    aliases: ["huggingface"],
    needles: ["huggingface"],
  },
  gemini: {
    glyph: glyph(siGooglegemini),
    aliases: ["gemini", "google.gemini"],
    needles: ["gemini"],
  },
  ollama: {
    glyph: glyph(siOllama),
    aliases: ["ollama"],
    needles: ["ollama"],
  },
  openrouter: {
    glyph: glyph(siOpenrouter),
    aliases: ["openrouter"],
    needles: ["openrouter"],
  },
  langchain: {
    glyph: glyph(siLangchain),
    aliases: ["langchain"],
    needles: ["langchain"],
  },
  mistral: {
    glyph: glyph(siMistralai),
    aliases: ["mistral", "mistralai"],
    needles: ["mistral"],
  },
  deepseek: {
    glyph: glyph(siDeepseek),
    aliases: ["deepseek"],
    needles: ["deepseek"],
  },
  claude: {
    glyph: glyph(siClaude),
    aliases: ["claude"],
  },
  nodejs: {
    glyph: glyph(siNodedotjs),
    aliases: ["nodejs", "node.js"],
    needles: ["nodejs"],
  },
  python: {
    glyph: glyph(siPython),
    aliases: ["python"],
  },
  go: {
    glyph: glyph(siGo),
    aliases: ["go", "golang"],
  },
  rust: {
    glyph: glyph(siRust),
    aliases: ["rust"],
  },
  bun: {
    glyph: glyph(siBun),
    aliases: ["bun"],
  },
  deno: {
    glyph: glyph(siDeno),
    aliases: ["deno"],
  },
  java: {
    glyph: glyph(siOpenjdk),
    aliases: ["java", "openjdk"],
  },
  php: {
    glyph: glyph(siPhp),
    aliases: ["php"],
  },
  ruby: {
    glyph: glyph(siRuby),
    aliases: ["ruby"],
  },
  dotnet: {
    glyph: glyph(siDotnet),
    aliases: ["dotnet", ".net", "csharp"],
    needles: ["dotnet"],
  },
  elixir: {
    glyph: glyph(siElixir),
    aliases: ["elixir"],
    needles: ["elixir"],
  },
  vercel: {
    glyph: glyph(siVercel),
    aliases: ["vercel"],
    needles: ["vercel"],
  },
  cloudflare: {
    glyph: glyph(siCloudflare),
    aliases: ["cloudflare"],
    needles: ["cloudflare"],
  },
  cloudflareworkers: {
    glyph: glyph(siCloudflareworkers),
    aliases: ["cloudflare-workers", "cloudflareworkers"],
    needles: ["workers.dev"],
  },
  gcp: {
    glyph: glyph(siGooglecloud),
    aliases: ["gcp", "googlecloud"],
    needles: ["googlecloud"],
  },
  azure: {
    glyph: vendored("azure"),
    aliases: ["azure", "microsoftazure"],
    needles: ["windows.net", "azure.com", "azure.net"],
  },
  docker: {
    glyph: glyph(siDocker),
    aliases: ["docker"],
    needles: ["docker"],
  },
  kubernetes: {
    glyph: glyph(siKubernetes),
    aliases: ["kubernetes", "k8s"],
    needles: ["kubernetes"],
  },
  nginx: {
    glyph: glyph(siNginx),
    aliases: ["nginx"],
    needles: ["nginx"],
  },
  caddy: {
    glyph: glyph(siCaddy),
    aliases: ["caddy"],
  },
  traefik: {
    glyph: glyph(siTraefikproxy),
    aliases: ["traefik"],
    needles: ["traefik"],
  },
  minio: {
    glyph: glyph(siMinio),
    aliases: ["minio"],
    needles: ["minio"],
  },
  firebase: {
    glyph: glyph(siFirebase),
    aliases: ["firebase"],
    needles: ["firebase"],
  },
  netlify: {
    glyph: glyph(siNetlify),
    aliases: ["netlify"],
    needles: ["netlify"],
  },
  railway: {
    glyph: glyph(siRailway),
    aliases: ["railway"],
    needles: ["railway"],
  },
  fly: {
    glyph: glyph(siFlydotio),
    aliases: ["fly", "fly.io"],
    needles: ["fly.dev"],
  },
  render: {
    glyph: glyph(siRender),
    aliases: ["render"],
  },
  datadog: {
    glyph: glyph(siDatadog),
    aliases: ["datadog"],
    needles: ["datadog"],
  },
  sentry: {
    glyph: glyph(siSentry),
    aliases: ["sentry"],
    needles: ["sentry"],
  },
  otel: {
    glyph: glyph(siOpentelemetry),
    aliases: ["otel", "opentelemetry"],
    needles: ["opentelemetry"],
  },
  prometheus: {
    glyph: glyph(siPrometheus),
    aliases: ["prometheus"],
    needles: ["prometheus"],
  },
  grafana: {
    glyph: glyph(siGrafana),
    aliases: ["grafana"],
    needles: ["grafana"],
  },
  jaeger: {
    glyph: glyph(siJaeger),
    aliases: ["jaeger"],
    needles: ["jaeger"],
  },
  newrelic: {
    glyph: glyph(siNewrelic),
    aliases: ["newrelic", "new-relic"],
    needles: ["newrelic"],
  },
  posthog: {
    glyph: glyph(siPosthog),
    aliases: ["posthog"],
    needles: ["posthog"],
  },
  airflow: {
    glyph: glyph(siApacheairflow),
    aliases: ["airflow"],
    needles: ["airflow"],
  },
  mcp: {
    glyph: glyph(siModelcontextprotocol),
    aliases: ["mcp", "modelcontextprotocol", "internal-mcp"],
    needles: ["modelcontextprotocol"],
  },
  upstash: {
    glyph: glyph(siUpstash),
    aliases: ["upstash"],
    needles: ["upstash"],
  },
  auth0: {
    glyph: glyph(siAuth0),
    aliases: ["auth0"],
    needles: ["auth0"],
  },
  clerk: {
    glyph: glyph(siClerk),
    aliases: ["clerk"],
  },
  keycloak: {
    glyph: glyph(siKeycloak),
    aliases: ["keycloak"],
    needles: ["keycloak"],
  },
  okta: {
    glyph: glyph(siOkta),
    aliases: ["okta"],
  },
  stripe: {
    glyph: glyph(siStripe),
    aliases: ["stripe"],
    needles: ["stripe"],
  },
  gcs: {
    glyph: glyph(siGooglecloudstorage),
    aliases: ["gcs", "googlecloudstorage"],
    needles: ["storage.googleapis.com"],
  },
  bigtable: {
    glyph: glyph(siGooglebigtable),
    aliases: ["bigtable", "googlebigtable"],
    needles: ["bigtable"],
  },
  databricks: {
    glyph: glyph(siDatabricks),
    aliases: ["databricks"],
    needles: ["databricks"],
  },
  spark: {
    glyph: glyph(siApachespark),
    aliases: ["spark", "apachespark", "pyspark"],
    needles: ["apachespark"],
  },
  flink: {
    glyph: glyph(siApacheflink),
    aliases: ["flink", "apacheflink"],
    needles: ["flink"],
  },
  surrealdb: {
    glyph: glyph(siSurrealdb),
    aliases: ["surrealdb", "surreal"],
    needles: ["surrealdb"],
  },
  tidb: {
    glyph: glyph(siTidb),
    aliases: ["tidb"],
    needles: ["tidb"],
  },
  vitess: {
    glyph: glyph(siVitess),
    aliases: ["vitess"],
    needles: ["vitess"],
  },
  hasura: {
    glyph: glyph(siHasura),
    aliases: ["hasura"],
    needles: ["hasura"],
  },
  convex: {
    glyph: glyph(siConvex),
    aliases: ["convex"],
    needles: ["convex"],
  },
  pocketbase: {
    glyph: glyph(siPocketbase),
    aliases: ["pocketbase"],
    needles: ["pocketbase"],
  },
  perplexity: {
    glyph: glyph(siPerplexity),
    aliases: ["perplexity"],
    needles: ["perplexity"],
  },
  qwen: {
    glyph: glyph(siQwen),
    aliases: ["qwen"],
    needles: ["qwen"],
  },
  elevenlabs: {
    glyph: glyph(siElevenlabs),
    aliases: ["elevenlabs"],
    needles: ["elevenlabs"],
  },
  llama: {
    glyph: glyph(siMetaai),
    aliases: ["llama", "metaai", "meta.llama"],
    needles: ["llama"],
  },
  langgraph: {
    glyph: glyph(siLanggraph),
    aliases: ["langgraph"],
    needles: ["langgraph"],
  },
  vllm: {
    glyph: glyph(siVllm),
    aliases: ["vllm"],
    needles: ["vllm"],
  },
  envoy: {
    glyph: glyph(siEnvoyproxy),
    aliases: ["envoy", "envoyproxy"],
    needles: ["envoy"],
  },
  istio: {
    glyph: glyph(siIstio),
    aliases: ["istio"],
    needles: ["istio"],
  },
  consul: {
    glyph: glyph(siConsul),
    aliases: ["consul"],
    needles: ["consul"],
  },
  vault: {
    glyph: glyph(siVault),
    aliases: ["vault", "hashicorp.vault"],
    needles: ["vault"],
  },
  sidekiq: {
    glyph: glyph(siSidekiq),
    aliases: ["sidekiq"],
    needles: ["sidekiq"],
  },
} as const satisfies Record<string, BrandDef>

export type SpanVendor = keyof typeof BRANDS

export function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_\-./]+/g, "")
}

const EXACT = new Map<string, SpanVendor>()
const NEEDLES: { needle: string; brand: SpanVendor }[] = []

for (const [id, def] of Object.entries(BRANDS) as [SpanVendor, BrandDef][]) {
  EXACT.set(normalizeToken(id), id)
  for (const alias of def.aliases) {
    EXACT.set(normalizeToken(alias), id)
  }
  for (const needle of def.needles ?? []) {
    NEEDLES.push({ needle: needle.toLowerCase(), brand: id })
  }
}

NEEDLES.sort((a, b) => b.needle.length - a.needle.length)

/** Resolve a brand from a service, host, component, or filter value. */
export function resolveBrandFromName(name: string): SpanVendor | null {
  const raw = name.trim()
  if (raw.length === 0) return null
  const exact = EXACT.get(normalizeToken(raw))
  if (exact) return exact
  const lower = raw.toLowerCase()
  for (const { needle, brand } of NEEDLES) {
    if (lower.includes(needle)) return brand
  }
  return null
}

export function isBrandId(value: string): value is SpanVendor {
  return value in BRANDS
}
