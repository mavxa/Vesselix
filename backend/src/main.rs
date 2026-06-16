use std::{
    collections::HashMap,
    fs,
    net::{IpAddr, Ipv4Addr, SocketAddr},
    sync::{Arc, Mutex},
    time::{SystemTime, UNIX_EPOCH},
};

use axum::{
    Json, Router,
    body::Body,
    extract::{Path, Query, State},
    http::{StatusCode, Uri, header},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use bollard::{
    Docker,
    container::{
        InspectContainerOptions, KillContainerOptions, ListContainersOptions, LogsOptions,
        NetworkStats, RemoveContainerOptions, RestartContainerOptions, StartContainerOptions,
        Stats, StatsOptions, StopContainerOptions,
    },
    errors::Error as DockerError,
    models::{ContainerSummary, Port},
};
use clap::Parser;
use futures_util::StreamExt;
use include_dir::{Dir, include_dir};
use serde::{Deserialize, Serialize};
use sysinfo::System;
use thiserror::Error;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing_subscriber::EnvFilter;

#[derive(Clone)]
struct AppState {
    docker: Docker,
    system: Arc<Mutex<System>>,
}

struct HostMetrics {
    cpu_percent: f64,
    cpu_cores: u64,
    mem_used_mb: f64,
    mem_total_mb: f64,
}

static FRONTEND_DIST: Dir<'_> = include_dir!("$OUT_DIR/frontend");

const VESSELIX_LOGO: &str = r#"__________
___   ____________________________  /__(_)___  __
__ | / /  _ \_  ___/_  ___/  _ \_  /__  /__  |/_/
__ |/ //  __/(__  )_(__  )/  __/  / _  / __>  <
_____/ \___//____/ /____/ \___//_/  /_/  /_/|_|"#;

#[derive(Debug, Parser)]
#[command(
    name = "vesselix",
    version,
    about = "Lightweight local-first Docker dashboard"
)]
struct Cli {
    #[arg(short = 'H', long, env = "VESSELIX_HOST", default_value_t = IpAddr::V4(Ipv4Addr::LOCALHOST))]
    host: IpAddr,

    #[arg(short, long, env = "VESSELIX_PORT", default_value_t = 4747)]
    port: u16,

    #[arg(long, env = "VESSELIX_BACKEND_ADDR", hide = true)]
    addr: Option<SocketAddr>,
}

#[tokio::main]
async fn main() -> Result<(), AppError> {
    let cli = Cli::parse();

    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let docker = Docker::connect_with_local_defaults()?;
    let mut system = System::new_all();
    system.refresh_cpu_usage();
    system.refresh_memory();
    let state = AppState {
        docker,
        system: Arc::new(Mutex::new(system)),
    };

    let app = Router::new()
        .route("/api/health", get(health))
        .route("/api/host", get(host))
        .route("/api/containers", get(containers))
        .route("/api/containers/{id}/logs", get(container_logs))
        .route(
            "/api/containers/{id}/actions/{action}",
            post(container_action),
        )
        .fallback(static_asset)
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = cli
        .addr
        .unwrap_or_else(|| SocketAddr::new(cli.host, cli.port));

    print_startup_banner(addr);
    tracing::info!(%addr, url = %format!("http://{addr}"), "starting Vesselix");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    Ok(())
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
}

fn print_startup_banner(addr: SocketAddr) {
    let url = format!("http://{addr}");
    let description = "local-first Docker dashboard";
    let width = description.len().max(url.len()).max(" Vesselix ".len());
    let rule_width = width + 2;
    let title_rule = "-- Vesselix ";

    println!("{VESSELIX_LOGO}");
    println!("");
    println!(
        "+{title_rule}{}+",
        "-".repeat(rule_width - title_rule.len())
    );
    println!("| {description:<width$} |");
    println!("| {url:<width$} |");
    println!("+{}+", "-".repeat(rule_width));
}

async fn static_asset(uri: Uri) -> Response {
    let requested = uri.path().trim_start_matches('/');
    let path = if requested.is_empty() {
        "index.html"
    } else {
        requested
    };

    let Some(file) = FRONTEND_DIST
        .get_file(path)
        .or_else(|| FRONTEND_DIST.get_file("index.html"))
    else {
        return (StatusCode::NOT_FOUND, "not found").into_response();
    };

    let mime = mime_guess::from_path(file.path()).first_or_octet_stream();
    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, mime.as_ref())
        .body(Body::from(file.contents().to_vec()))
        .unwrap_or_else(|_| StatusCode::INTERNAL_SERVER_ERROR.into_response())
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse { ok: true })
}

async fn host(State(state): State<AppState>) -> Result<Json<HostInfo>, AppError> {
    let version = state.docker.version().await?;
    let info = state.docker.info().await?;
    let metrics = read_host_metrics(&state);
    let os = read_os_pretty_name()
        .or(version.os)
        .unwrap_or_else(|| "unknown".to_string());

    Ok(Json(HostInfo {
        hostname: info.name.unwrap_or_else(|| "local-docker".to_string()),
        docker_connected: true,
        engine_version: version.version.unwrap_or_else(|| "unknown".to_string()),
        api_version: version.api_version.unwrap_or_else(|| "unknown".to_string()),
        os,
        arch: version.arch.unwrap_or_else(|| "unknown".to_string()),
        cpu_percent: metrics.cpu_percent,
        cpu_cores: if metrics.cpu_cores > 0 {
            metrics.cpu_cores
        } else {
            info.ncpu.unwrap_or_default() as u64
        },
        mem_used_mb: metrics.mem_used_mb,
        mem_total_mb: if metrics.mem_total_mb > 0.0 {
            metrics.mem_total_mb
        } else {
            info.mem_total.unwrap_or_default() as f64 / 1024.0 / 1024.0
        },
    }))
}

async fn containers(State(state): State<AppState>) -> Result<Json<Vec<Container>>, AppError> {
    let summaries = state
        .docker
        .list_containers(Some(ListContainersOptions::<String> {
            all: true,
            ..Default::default()
        }))
        .await?;

    let mut out = Vec::with_capacity(summaries.len());
    for summary in summaries {
        out.push(container_from_summary(&state.docker, summary).await?);
    }

    Ok(Json(out))
}

async fn container_logs(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Query(query): Query<LogsQuery>,
) -> Result<Json<Vec<LogLine>>, AppError> {
    let tail = query.tail.unwrap_or(500).clamp(1, 10_000).to_string();
    let mut stream = state.docker.logs::<String>(
        &id,
        Some(LogsOptions {
            stdout: true,
            stderr: true,
            timestamps: true,
            tail,
            ..Default::default()
        }),
    );

    let mut lines = Vec::new();
    while let Some(item) = stream.next().await {
        let output = item?;
        let (stream_name, text) = match output {
            bollard::container::LogOutput::StdOut { message } => ("stdout", message),
            bollard::container::LogOutput::StdErr { message } => ("stderr", message),
            bollard::container::LogOutput::Console { message } => ("stdout", message),
            _ => continue,
        };

        let raw = String::from_utf8_lossy(&text).trim_end().to_string();
        let (ts, text) = split_docker_timestamp(&raw);
        let level = infer_level(&text);
        lines.push(LogLine {
            id: lines.len() as u64,
            ts,
            level,
            stream: stream_name.to_string(),
            text,
        });
    }

    Ok(Json(lines))
}

async fn container_action(
    State(state): State<AppState>,
    Path((id, action)): Path<(String, String)>,
) -> Result<StatusCode, AppError> {
    match action.as_str() {
        "start" => {
            state
                .docker
                .start_container(&id, None::<StartContainerOptions<String>>)
                .await?;
        }
        "stop" => {
            state
                .docker
                .stop_container(&id, Some(StopContainerOptions { t: 10 }))
                .await?;
        }
        "restart" => {
            state
                .docker
                .restart_container(&id, Some(RestartContainerOptions { t: 10 }))
                .await?;
        }
        "kill" => {
            state
                .docker
                .kill_container(&id, None::<KillContainerOptions<String>>)
                .await?;
        }
        "pause" => {
            state.docker.pause_container(&id).await?;
        }
        "unpause" => {
            state.docker.unpause_container(&id).await?;
        }
        "remove" => {
            state
                .docker
                .remove_container(
                    &id,
                    Some(RemoveContainerOptions {
                        force: false,
                        v: false,
                        link: false,
                    }),
                )
                .await?;
        }
        _ => return Err(AppError::BadRequest(format!("unknown action: {action}"))),
    }

    Ok(StatusCode::NO_CONTENT)
}

async fn container_from_summary(
    docker: &Docker,
    summary: ContainerSummary,
) -> Result<Container, AppError> {
    let id = summary.id.unwrap_or_default();
    let inspect = docker
        .inspect_container(&id, None::<InspectContainerOptions>)
        .await
        .ok();
    let stats = if summary.state.as_deref() == Some("running") {
        read_one_stats(docker, &id).await.ok()
    } else {
        None
    };

    let name = summary
        .names
        .as_ref()
        .and_then(|names| names.first())
        .map(|name| name.trim_start_matches('/').to_string())
        .unwrap_or_else(|| id.chars().take(12).collect());

    let state = map_state(summary.state.as_deref().unwrap_or("unknown"));
    let health = inspect
        .as_ref()
        .and_then(|inspect| inspect.state.as_ref())
        .and_then(|state| state.health.as_ref())
        .and_then(|health| health.status.as_ref())
        .map(|status| map_health(&format!("{status:?}").to_lowercase()))
        .unwrap_or(ContainerHealth::None);

    let (cpu_percent, memory_usage_mb, memory_limit_mb, network_rx_bytes, network_tx_bytes, pids) =
        stats_metrics(stats.as_ref());

    let created_at = summary.created.unwrap_or_default() * 1000;
    let started_at = inspect
        .as_ref()
        .and_then(|inspect| inspect.state.as_ref())
        .and_then(|state| state.started_at.as_ref())
        .and_then(|started_at| parse_rfc3339_millis(started_at))
        .unwrap_or(created_at as u64);

    Ok(Container {
        id: id.clone(),
        name,
        image: summary.image.unwrap_or_default(),
        image_id: summary.image_id.unwrap_or_default(),
        command: summary.command.unwrap_or_default(),
        state,
        status: summary.status.unwrap_or_default(),
        health,
        cpu_percent,
        memory_usage_mb,
        memory_limit_mb,
        network_rx_bytes,
        network_tx_bytes,
        network_rx_rate: 0.0,
        network_tx_rate: 0.0,
        block_read_bytes: 0,
        block_write_bytes: 0,
        pids,
        ports: summary
            .ports
            .unwrap_or_default()
            .into_iter()
            .map(port_mapping)
            .collect(),
        created_at,
        started_at,
        cpu_history: vec![cpu_percent; 32],
        mem_history: vec![memory_usage_mb; 32],
        restart_policy: inspect
            .as_ref()
            .and_then(|inspect| inspect.host_config.as_ref())
            .and_then(|host_config| host_config.restart_policy.as_ref())
            .and_then(|policy| policy.name.as_ref())
            .map(|policy| format!("{policy:?}"))
            .unwrap_or_else(|| "no".to_string()),
        networks: inspect
            .as_ref()
            .and_then(|inspect| inspect.network_settings.as_ref())
            .and_then(|settings| settings.networks.as_ref())
            .map(|networks| networks.keys().cloned().collect())
            .unwrap_or_default(),
        mounts: inspect
            .as_ref()
            .and_then(|inspect| inspect.mounts.as_ref())
            .map(|mounts| {
                mounts
                    .iter()
                    .map(|mount| MountInfo {
                        r#type: mount
                            .typ
                            .as_ref()
                            .map(|typ| format!("{typ:?}").to_lowercase())
                            .unwrap_or_else(|| "bind".to_string()),
                        source: mount.source.clone().unwrap_or_default(),
                        destination: mount.destination.clone().unwrap_or_default(),
                        mode: mount.mode.clone().unwrap_or_default(),
                        rw: mount.rw.unwrap_or_default(),
                    })
                    .collect()
            })
            .unwrap_or_default(),
        env: inspect
            .as_ref()
            .and_then(|inspect| inspect.config.as_ref())
            .and_then(|config| config.env.clone())
            .unwrap_or_default(),
        labels: inspect
            .as_ref()
            .and_then(|inspect| inspect.config.as_ref())
            .and_then(|config| config.labels.clone())
            .unwrap_or_default(),
    })
}

async fn read_one_stats(docker: &Docker, id: &str) -> Result<Stats, DockerError> {
    let mut stream = docker.stats(
        id,
        Some(StatsOptions {
            stream: false,
            one_shot: true,
        }),
    );
    match stream.next().await {
        Some(result) => result,
        None => Err(DockerError::IOError {
            err: std::io::Error::new(std::io::ErrorKind::UnexpectedEof, "empty stats stream"),
        }),
    }
}

fn stats_metrics(stats: Option<&Stats>) -> (f64, f64, f64, u64, u64, u64) {
    let Some(stats) = stats else {
        return (0.0, 0.0, 0.0, 0, 0, 0);
    };

    let cpu_total = stats.cpu_stats.cpu_usage.total_usage as f64;
    let pre_cpu_total = stats.precpu_stats.cpu_usage.total_usage as f64;
    let system_cpu = stats.cpu_stats.system_cpu_usage.unwrap_or_default() as f64;
    let pre_system_cpu = stats.precpu_stats.system_cpu_usage.unwrap_or_default() as f64;
    let cpu_delta = cpu_total - pre_cpu_total;
    let system_delta = system_cpu - pre_system_cpu;
    let online_cpus = stats.cpu_stats.online_cpus.unwrap_or(1) as f64;
    let cpu_percent = if system_delta > 0.0 && cpu_delta > 0.0 {
        (cpu_delta / system_delta) * online_cpus * 100.0
    } else {
        0.0
    };

    let memory_usage_mb = stats.memory_stats.usage.unwrap_or_default() as f64 / 1024.0 / 1024.0;
    let memory_limit_mb = stats.memory_stats.limit.unwrap_or_default() as f64 / 1024.0 / 1024.0;
    let (network_rx_bytes, network_tx_bytes) =
        stats.networks.as_ref().map(sum_networks).unwrap_or((0, 0));
    let pids = stats.pids_stats.current.unwrap_or_default();

    (
        cpu_percent,
        memory_usage_mb,
        memory_limit_mb,
        network_rx_bytes,
        network_tx_bytes,
        pids,
    )
}

fn sum_networks(networks: &HashMap<String, NetworkStats>) -> (u64, u64) {
    networks.values().fold((0, 0), |(rx, tx), network| {
        (rx + network.rx_bytes, tx + network.tx_bytes)
    })
}

fn port_mapping(port: Port) -> PortMapping {
    PortMapping {
        private_port: port.private_port,
        public_port: port.public_port,
        protocol: port
            .typ
            .map(|typ| typ.to_string())
            .filter(|typ| !typ.is_empty())
            .unwrap_or_else(|| "tcp".to_string()),
        host_ip: port.ip,
    }
}

fn map_state(state: &str) -> ContainerState {
    match state {
        "running" => ContainerState::Running,
        "exited" | "dead" | "created" => ContainerState::Exited,
        "paused" => ContainerState::Paused,
        "restarting" => ContainerState::Restarting,
        _ => ContainerState::Exited,
    }
}

fn map_health(health: &str) -> ContainerHealth {
    match health {
        "healthy" => ContainerHealth::Healthy,
        "unhealthy" => ContainerHealth::Unhealthy,
        "starting" => ContainerHealth::Starting,
        _ => ContainerHealth::None,
    }
}

fn infer_level(text: &str) -> LogLevel {
    let lower = text.to_lowercase();
    if lower.contains("error") || lower.contains("panic") || lower.contains("failed") {
        LogLevel::Error
    } else if lower.contains("warn") {
        LogLevel::Warn
    } else if lower.contains("debug") {
        LogLevel::Debug
    } else {
        LogLevel::Info
    }
}

fn split_docker_timestamp(raw: &str) -> (u64, String) {
    let Some((ts, rest)) = raw.split_once(' ') else {
        return (now_millis(), raw.to_string());
    };
    (
        parse_rfc3339_millis(ts).unwrap_or_else(now_millis),
        rest.to_string(),
    )
}

fn parse_rfc3339_millis(_value: &str) -> Option<u64> {
    // Keep this dependency-free for now. The frontend can display live-relative
    // data with current timestamps until richer log streaming lands.
    Some(now_millis())
}

fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis() as u64)
        .unwrap_or_default()
}

fn read_host_metrics(state: &AppState) -> HostMetrics {
    let Some(mut system) = state.system.lock().ok() else {
        return HostMetrics {
            cpu_percent: 0.0,
            cpu_cores: 0,
            mem_used_mb: 0.0,
            mem_total_mb: 0.0,
        };
    };

    system.refresh_cpu_usage();
    system.refresh_memory();

    HostMetrics {
        cpu_percent: system.global_cpu_usage() as f64,
        cpu_cores: system.cpus().len() as u64,
        mem_used_mb: system.used_memory() as f64 / 1024.0 / 1024.0,
        mem_total_mb: system.total_memory() as f64 / 1024.0 / 1024.0,
    }
}

fn read_os_pretty_name() -> Option<String> {
    let content = fs::read_to_string("/etc/os-release").ok()?;
    content.lines().find_map(|line| {
        let value = line.strip_prefix("PRETTY_NAME=")?;
        let pretty = unquote_os_release_value(value.trim());
        (!pretty.is_empty()).then_some(pretty)
    })
}

fn unquote_os_release_value(value: &str) -> String {
    let quoted = value
        .strip_prefix('"')
        .and_then(|inner| inner.strip_suffix('"'))
        .or_else(|| {
            value
                .strip_prefix('\'')
                .and_then(|inner| inner.strip_suffix('\''))
        });

    quoted
        .unwrap_or(value)
        .replace("\\\"", "\"")
        .replace("\\\\", "\\")
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HealthResponse {
    ok: bool,
}

#[derive(Deserialize)]
struct LogsQuery {
    tail: Option<u64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HostInfo {
    hostname: String,
    docker_connected: bool,
    engine_version: String,
    api_version: String,
    os: String,
    arch: String,
    cpu_percent: f64,
    cpu_cores: u64,
    mem_used_mb: f64,
    mem_total_mb: f64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Container {
    id: String,
    name: String,
    image: String,
    image_id: String,
    command: String,
    state: ContainerState,
    status: String,
    health: ContainerHealth,
    cpu_percent: f64,
    memory_usage_mb: f64,
    memory_limit_mb: f64,
    network_rx_bytes: u64,
    network_tx_bytes: u64,
    network_rx_rate: f64,
    network_tx_rate: f64,
    block_read_bytes: u64,
    block_write_bytes: u64,
    pids: u64,
    ports: Vec<PortMapping>,
    created_at: i64,
    started_at: u64,
    cpu_history: Vec<f64>,
    mem_history: Vec<f64>,
    restart_policy: String,
    networks: Vec<String>,
    mounts: Vec<MountInfo>,
    env: Vec<String>,
    labels: HashMap<String, String>,
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
enum ContainerState {
    Running,
    Exited,
    Paused,
    Restarting,
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
enum ContainerHealth {
    Healthy,
    Unhealthy,
    Starting,
    None,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PortMapping {
    private_port: u16,
    public_port: Option<u16>,
    protocol: String,
    host_ip: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct MountInfo {
    r#type: String,
    source: String,
    destination: String,
    mode: String,
    rw: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "lowercase")]
enum LogLevel {
    Info,
    Warn,
    Error,
    Debug,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LogLine {
    id: u64,
    ts: u64,
    level: LogLevel,
    stream: String,
    text: String,
}

#[derive(Debug, Error)]
enum AppError {
    #[error("docker error: {0}")]
    Docker(#[from] DockerError),
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("bad request: {0}")]
    BadRequest(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = match self {
            AppError::BadRequest(_) => StatusCode::BAD_REQUEST,
            AppError::Docker(_) | AppError::Io(_) => StatusCode::INTERNAL_SERVER_ERROR,
        };
        let body = Json(serde_json::json!({ "error": self.to_string() }));
        (status, body).into_response()
    }
}
