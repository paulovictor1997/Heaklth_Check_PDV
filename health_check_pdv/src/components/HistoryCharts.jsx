"use client";

// Gráficos do histórico de uma máquina. Precisa rodar no navegador ("use client"):
// o Recharts mede a largura da tela e responde ao mouse.
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDateTime, formatPercent } from "@/lib/format";

// O Recharts recebe as cores como texto (não lê as classes do Tailwind).
// LINE_COLOR é um azul mais saturado que o `destaque`, para a linha não parecer cinza
// sobre o fundo escuro. TEXT_COLOR é o `texto` da paleta (#EBEBEB) com transparência.
const LINE_COLOR = "#3987e5";
const GRID_COLOR = "rgba(235, 235, 235, 0.1)";
const AXIS_TEXT_COLOR = "rgba(235, 235, 235, 0.6)";
const CURSOR_COLOR = "rgba(235, 235, 235, 0.3)";

const METRICS = [
  { key: "disco", title: "Disco C: livre" },
  { key: "cpu", title: "Uso de CPU" },
  { key: "memoria", title: "Uso de memória" },
];

// Um gráfico por medida, todos na mesma escala (0 a 100%) e no mesmo período.
// `points` vem de toChartPoints(); `ticks` de getTimeTicks().
export default function HistoryCharts({ points, start, end, ticks, showDates }) {
  // Último ponto com dados (o fim da lista pode ser uma quebra de linha)
  const last = points.findLast((point) => point.cpu !== null);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {METRICS.map((metric) => (
        <section key={metric.key} className="rounded-lg border border-texto/10 bg-texto/5 p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-medium">{metric.title}</h2>
            <p className="text-sm text-texto/60">
              último: <span className="font-medium text-texto">{formatPercent(last[metric.key])}</span>
            </p>
          </div>

          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={GRID_COLOR} vertical={false} />
              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={[start, end]}
                ticks={ticks}
                tickFormatter={(time) => formatTick(time, showDates)}
                stroke={GRID_COLOR}
                tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => `${value}%`}
                width={44}
                axisLine={false}
                tickLine={false}
                tick={{ fill: AXIS_TEXT_COLOR, fontSize: 12 }}
              />
              <Tooltip
                cursor={{ stroke: CURSOR_COLOR, strokeWidth: 1 }}
                content={<ChartTooltip />}
                isAnimationActive={false}
              />
              <Line
                dataKey={metric.key}
                name={metric.title}
                stroke={LINE_COLOR}
                strokeWidth={2}
                dot={IsolatedDot}
                activeDot={{ r: 4, stroke: "#161014", strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      ))}
    </div>
  );
}

// Eixo do tempo: só a hora nos períodos curtos, só a data a partir de 7 dias
function formatTick(time, showDates) {
  const [date, hour] = formatDateTime(time).split(", ");
  return showDates ? date : hour;
}

// Pontos só nos registros isolados (veja toChartPoints); nos demais a linha basta
function IsolatedDot({ cx, cy, index, payload }) {
  if (!payload.isolated) {
    return <g key={index} />;
  }

  return <circle key={index} cx={cx} cy={cy} r={4} fill={LINE_COLOR} />;
}

// Caixa que aparece ao passar o mouse: valor em destaque, data/hora abaixo
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length || payload[0].value === null) {
    return null;
  }

  return (
    <div className="rounded-md border border-texto/20 bg-fundo px-3 py-2 text-sm shadow-lg">
      <p className="font-medium">{formatPercent(payload[0].value)}</p>
      <p className="text-texto/60">{formatDateTime(payload[0].payload.time)}</p>
    </div>
  );
}
