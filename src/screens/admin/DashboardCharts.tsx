import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { formatDateDMY } from "../../utils/date";

type Series = { key: string; label: string; color: string };

function ChartCard({
  title,
  subtitle,
  series,
  children,
}: {
  title: string;
  subtitle?: string;
  series: Series[];
  children: React.ReactNode;
}) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        <Box>
          <Typography variant="subtitle2">{title}</Typography>
          {subtitle ? (
            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
          ) : null}
        </Box>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          {series.map((item) => (
            <Box key={item.key} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: item.color }} />
              <Typography variant="caption" color="text.secondary">{item.label}</Typography>
            </Box>
          ))}
        </Box>
        {children}
      </CardContent>
    </Card>
  );
}

function maxOf(data: Array<Record<string, number>>, series: Series[]): number {
  let max = 0;
  for (const row of data) {
    for (const item of series) max = Math.max(max, row[item.key] ?? 0);
  }
  return max > 0 ? max : 1;
}

export function LineChart({
  title,
  subtitle,
  data,
  series,
  format,
  onSelectDate,
}: {
  title: string;
  subtitle?: string;
  data: Array<{ date: string; values: Record<string, number> }>;
  series: Series[];
  format: (value: number) => string;
  onSelectDate?: (date: string) => void;
}) {
  const max = maxOf(data.map((row) => row.values), series);
  const width = 600;
  const height = 180;
  const left = 8;
  const right = 8;
  const top = 12;
  const bottom = 26;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const point = (index: number, value: number): [number, number] => [
    left + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW),
    top + innerH - (value / max) * innerH,
  ];
  return (
    <ChartCard title={title} subtitle={subtitle} series={series}>
      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary">—</Typography>
      ) : (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 190 }}>
            {[0, 0.5, 1].map((part) => (
              <line
                key={part}
                x1={left}
                y1={top + innerH * part}
                x2={width - right}
                y2={top + innerH * part}
                stroke="#e5e5e5"
                strokeWidth="1"
              />
            ))}
            {series.map((item) => (
              <polyline
                key={item.key}
                fill="none"
                stroke={item.color}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={data.map((row, index) =>
                  point(index, row.values[item.key] ?? 0).join(",")).join(" ")}
              />
            ))}
            {series.map((item) => {
              const last = data[data.length - 1];
              const [x, y] = point(data.length - 1, last.values[item.key] ?? 0);
              return <circle key={item.key} cx={x} cy={y} r="3" fill={item.color} />;
            })}
            {onSelectDate ? data.map((row, index) => {
              const hitWidth = data.length <= 1 ? innerW : innerW / (data.length - 1);
              const [cx] = point(index, 0);
              const x = Math.max(left, cx - hitWidth / 2);
              const width = Math.min(innerW, hitWidth);
              return (
                <rect
                  key={`hit-${row.date}`}
                  x={x}
                  y={top}
                  width={width}
                  height={innerH}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectDate(row.date)}
                />
              );
            }) : null}
            <text x={left} y={height - 6} fontSize="10" fill="#737373">
              {formatDateDMY(data[0]?.date ?? "")}
            </text>
            <text x={width - right} y={height - 6} fontSize="10" fill="#737373" textAnchor="end">
              {formatDateDMY(data[data.length - 1]?.date ?? "")}
            </text>
            <text x={left} y={top - 2} fontSize="10" fill="#737373">
              {format(max)}
            </text>
          </svg>
          <Typography variant="caption" color="text.secondary">
            {`${series[0]?.label ?? ""}: ${format(data[data.length - 1]?.values[series[0]?.key] ?? 0)}`}
          </Typography>
        </>
      )}
    </ChartCard>
  );
}

export function BarChart({
  title,
  subtitle,
  data,
  series,
  onSelectDate,
}: {
  title: string;
  subtitle?: string;
  data: Array<{ label: string; values: Record<string, number>; date?: string }>;
  series: Series[];
  onSelectDate?: (date: string) => void;
}) {
  const max = maxOf(data.map((row) => row.values), series);
  const width = 600;
  const height = 180;
  const left = 8;
  const right = 8;
  const top = 12;
  const bottom = 26;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const groupW = data.length > 0 ? innerW / data.length : innerW;
  const barW = Math.max(3, (groupW * 0.7) / Math.max(1, series.length));
  return (
    <ChartCard title={title} subtitle={subtitle} series={series}>
      {data.length === 0 ? (
        <Typography variant="body2" color="text.secondary">—</Typography>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 190 }}>
          {[0, 0.5, 1].map((part) => (
            <line
              key={part}
              x1={left}
              y1={top + innerH * part}
              x2={width - right}
              y2={top + innerH * part}
              stroke="#e5e5e5"
              strokeWidth="1"
            />
          ))}
          {data.map((row, index) => (
            <g key={`${row.label}-${index}`}>
              {series.map((item, seriesIndex) => {
                const value = row.values[item.key] ?? 0;
                const h = (value / max) * innerH;
                return (
                  <rect
                    key={item.key}
                    x={left + groupW * index + groupW * 0.15 + seriesIndex * barW}
                    y={top + innerH - h}
                    width={barW}
                    height={Math.max(0, h)}
                    rx="2"
                    fill={item.color}
                  />
                );
              })}
              {onSelectDate && row.date ? (
                <rect
                  x={left + groupW * index}
                  y={top}
                  width={groupW}
                  height={innerH}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onClick={() => onSelectDate(row.date as string)}
                />
              ) : null}
            </g>
          ))}
          {data.length <= 8 ? data.map((row, index) => (
            <text
              key={`${row.label}-label`}
              x={left + groupW * index + groupW / 2}
              y={height - 6}
              fontSize="9"
              fill="#737373"
              textAnchor="middle"
            >
              {row.label}
            </text>
          )) : null}
        </svg>
      )}
    </ChartCard>
  );
}

export function BarList({
  title,
  subtitle,
  data,
  format,
}: {
  title: string;
  subtitle?: string;
  data: Array<{ label: string; value: number; color?: string }>;
  format: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((row) => row.value));
  return (
    <ChartCard title={title} subtitle={subtitle} series={[]}>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {data.length === 0 ? (
          <Typography variant="body2" color="text.secondary">—</Typography>
        ) : data.map((row) => (
          <Box key={row.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" color="text.secondary" sx={{ width: 90 }}>
              {row.label}
            </Typography>
            <Box sx={{ flexGrow: 1, height: 8, bgcolor: "divider", borderRadius: 4, overflow: "hidden" }}>
              <Box sx={{ width: `${(row.value / max) * 100}%`, height: "100%", bgcolor: row.color ?? "primary.main" }} />
            </Box>
            <Typography variant="caption" sx={{ width: 70, textAlign: "right" }}>
              {format(row.value)}
            </Typography>
          </Box>
        ))}
      </Box>
    </ChartCard>
  );
}

export function Sparkline({
  values,
  color,
  height = 40,
}: {
  values: number[];
  color: string;
  height?: number;
}) {
  const max = Math.max(1, ...values);
  const width = 160;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values.map((value, index) =>
    `${index * step},${height - (value / max) * (height - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}
