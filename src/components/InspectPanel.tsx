import type { Container } from "../lib/types";
import { formatAge, formatUptime, shortId } from "../lib/format";
import { cn } from "../lib/cn";

interface Props {
  container: Container;
}

export function InspectPanel({ container: c }: Props) {
  return (
    <div className="h-full overflow-y-auto p-3 text-[12px]">
      <Group title="General">
        <Field label="Container ID" mono value={shortId(c.id)} full />
        <Field label="Name" value={c.name} />
        <Field label="State" value={c.state} />
        <Field label="Status" value={c.status} full />
        <Field label="Image" mono value={c.image} full />
        <Field label="Image ID" mono value={c.imageId} full />
        <Field label="Command" mono value={c.command} full />
        <Field label="Created" value={formatAge(c.createdAt) + " ago"} />
        <Field
          label="Started"
          value={
            c.state === "running" ? formatUptime(c.startedAt) + " ago" : "—"
          }
        />
        <Field label="Restart policy" mono value={c.restartPolicy} />
        <Field label="PIDs" value={String(c.pids)} />
      </Group>

      <Group title={`Ports (${c.ports.length})`}>
        {c.ports.length === 0 ? (
          <Empty />
        ) : (
          <div className="col-span-2 flex flex-col gap-1">
            {c.ports.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-2 font-mono text-[11px]"
              >
                <span className="text-accent">
                  {p.hostIp ?? "0.0.0.0"}:{p.publicPort ?? "—"}
                </span>
                <span className="text-faint">→</span>
                <span className="text-muted">
                  {p.privatePort}/{p.protocol}
                </span>
              </div>
            ))}
          </div>
        )}
      </Group>

      <Group title={`Mounts (${c.mounts.length})`}>
        {c.mounts.length === 0 ? (
          <Empty />
        ) : (
          <div className="col-span-2 flex flex-col gap-1.5">
            {c.mounts.map((m, i) => (
              <div key={i} className="font-mono text-[11px] leading-tight">
                <span
                  className="mr-1.5 rounded px-1 py-px text-[10px]"
                  style={{
                    background: "var(--surface-active)",
                    color: "var(--muted-subtle)",
                  }}
                >
                  {m.type}
                </span>
                <span className="text-muted">{m.source}</span>
                <span className="text-faint"> → </span>
                <span className="text-foreground">{m.destination}</span>
                <span
                  className={cn("ml-1.5", m.rw ? "text-warning" : "text-faint")}
                >
                  {m.rw ? "rw" : "ro"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Group>

      <Group title={`Networks (${c.networks.length})`}>
        <div className="col-span-2 flex flex-wrap gap-1">
          {c.networks.map((n) => (
            <span
              key={n}
              className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-muted"
            >
              {n}
            </span>
          ))}
        </div>
      </Group>

      <Group title={`Environment (${c.env.length})`}>
        <div className="col-span-2 flex flex-col gap-0.5">
          {c.env.map((e, i) => {
            const eq = e.indexOf("=");
            const key = eq >= 0 ? e.slice(0, eq) : e;
            const val = eq >= 0 ? e.slice(eq + 1) : "";
            return (
              <div key={i} className="font-mono text-[11px] leading-tight">
                <span className="text-accent">{key}</span>
                <span className="text-faint">=</span>
                <span className="text-muted">{val}</span>
              </div>
            );
          })}
        </div>
      </Group>

      <Group title={`Labels (${Object.keys(c.labels).length})`}>
        <div className="col-span-2 flex flex-col gap-0.5">
          {Object.entries(c.labels).map(([k, v]) => (
            <div key={k} className="font-mono text-[11px] leading-tight">
              <span className="text-muted-subtle">{k}</span>
              <span className="text-faint">: </span>
              <span className="text-muted">{v}</span>
            </div>
          ))}
        </div>
      </Group>
    </div>
  );
}

function Group({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-2 rounded-md border border-border bg-surface">
      <div className="border-b border-border px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
        {title}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 px-2.5 py-2">
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
  full,
}: {
  label: string;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", full && "col-span-2")}>
      <span className="text-[10px] uppercase tracking-wide text-faint">
        {label}
      </span>
      <span
        className={cn(
          "break-all text-foreground",
          mono ? "font-mono text-[11px]" : "text-[12px]",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Empty() {
  return <span className="col-span-2 text-faint">None</span>;
}
