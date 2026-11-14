import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import type {DashboardBar, DashboardData} from "./dashboardData";
import type {Strings} from "../../i18n/en";

function Columns({title, rows, color, empty}: {title: string; rows: DashboardBar[]; color: "primary" | "success"; empty: string}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Box sx={{display: "flex", flexDirection: "column", gap: 1}}>
      <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5}}>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{empty}</Typography>
      ) : (
        <Box sx={{display: "flex", alignItems: "flex-end", gap: 1, height: 180, pt: 1}}>
          {rows.map((row) => (
            <Box key={row.label} sx={{flex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 0.5}}>
              <Typography variant="caption" color="text.secondary" sx={{fontSize: 9, textAlign: "center"}}>{row.display}</Typography>
              <Box sx={{height: 112, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center"}}>
                <Box sx={{width: "72%", height: Math.max(6, (row.value / max) * 112), borderRadius: 1, bgcolor: color === "primary" ? "primary.main" : "success.main"}} />
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{fontSize: 9}}>{row.label}</Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

function Bars({title, rows, color, empty}: {title: string; rows: DashboardBar[]; color: "primary" | "success"; empty: string}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <Box sx={{display: "flex", flexDirection: "column", gap: 1}}>
      <Typography variant="caption" color="text.secondary" sx={{fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5}}>
        {title}
      </Typography>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">{empty}</Typography>
      ) : rows.map((row) => (
        <Box key={row.label} sx={{display: "flex", flexDirection: "column", gap: 0.5}}>
          <Box sx={{display: "flex", justifyContent: "space-between", gap: 1}}>
            <Typography variant="caption">{row.label}</Typography>
            <Typography variant="caption" sx={{fontWeight: 600}}>{row.display}</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            color={color}
            value={Math.max(4, (row.value / max) * 100)}
            sx={{height: 8, borderRadius: 4}}
          />
        </Box>
      ))}
    </Box>
  );
}

export default function DashboardDialog({
  t,
  data,
  open,
  onClose,
}: {
  t: Strings;
  data: DashboardData;
  open: boolean;
  onClose: () => void;
}) {
  const color = data.mode === "RIDER" ? "primary" : "success";
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t.more.dashboard}</DialogTitle>
      <DialogContent sx={{display: "flex", flexDirection: "column", gap: 2.5, pt: 1}}>
        <Box sx={{display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 1}}>
          {data.stats.map((stat) => (
            <Box key={stat.label} sx={{border: 1, borderColor: "divider", borderRadius: 2, p: 1.25}}>
              <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
              <Typography variant="subtitle1" sx={{fontWeight: 700}}>{stat.value}</Typography>
            </Box>
          ))}
        </Box>
        <Columns
          title={t.more.dashboardMonthly}
          rows={data.monthly}
          color={color}
          empty={t.more.dashboardNoActivity}
        />
        <Bars
          title={data.mode === "RIDER" ? t.more.dashboardByService : t.more.dashboardJobs}
          rows={data.breakdown}
          color={color}
          empty={t.more.dashboardNoActivity}
        />
      </DialogContent>
    </Dialog>
  );
}
