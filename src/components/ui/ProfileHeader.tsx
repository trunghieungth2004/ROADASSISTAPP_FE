import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export type ProfileStat = {
  label: string;
  value: string | number;
};

export default function ProfileHeader({
  name,
  email,
  roleLabel,
  services,
  stats,
  onEdit,
}: {
  name: string;
  email: string;
  roleLabel: string;
  services: string[];
  stats?: ProfileStat[];
  onEdit?: () => void;
}) {
  return (
    <Card>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              sx={{
                bgcolor: "primary.main",
                color: "primary.contrastText",
                width: 56,
                height: 56,
                fontWeight: 700,
              }}
            >
              {initials(name)}
            </Avatar>
            {onEdit ? (
              <IconButton
                size="small"
                aria-label="edit"
                onClick={onEdit}
                sx={{
                  position: "absolute",
                  right: -8,
                  bottom: -8,
                  bgcolor: "background.paper",
                  border: 1,
                  borderColor: "divider",
                  "&:hover": { bgcolor: "background.paper" },
                }}
              >
                <EditIcon sx={{ fontSize: 16, color: "primary.main" }} />
              </IconButton>
            ) : null}
          </Box>
          <Box sx={{ minWidth: 0, flexGrow: 1 }}>
            <Typography noWrap sx={{ fontSize: 18, fontWeight: 700 }}>
              {name}
            </Typography>
            <Typography noWrap variant="body2" color="text.secondary">
              {email}
            </Typography>
            <Box sx={{ mt: 0.75, display: "flex", gap: 0.5, flexWrap: "wrap" }}>
              <Chip size="small" color="primary" label={roleLabel} />
              {services.map((service) => (
                <Chip
                  key={service}
                  size="small"
                  variant="outlined"
                  label={service}
                />
              ))}
            </Box>
          </Box>
        </Box>
        {stats && stats.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              borderTop: 1,
              borderColor: "divider",
              pt: 1.5,
            }}
          >
            {stats.map((stat) => (
              <Box key={stat.label} sx={{ flex: 1, textAlign: "center" }}>
                <Typography sx={{ fontWeight: 700 }}>{stat.value}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.label}
                </Typography>
              </Box>
            ))}
          </Box>
        ) : null}
      </Box>
    </Card>
  );
}
