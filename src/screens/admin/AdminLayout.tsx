import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import { useState, type ReactNode } from "react";
import { useStrings } from "../../context/LanguageContext";

export type AdminSection = {
  id: string;
  label: string;
  icon: ReactNode;
};

export type AdminGroup = {
  label: string;
  items: AdminSection[];
};

export default function AdminLayout({
  title,
  groups,
  active,
  onSelect,
  onSignOut,
  badges,
  children,
}: {
  title: string;
  groups: AdminGroup[];
  active: string;
  onSelect: (id: string) => void;
  onSignOut: () => void;
  badges?: Record<string, number>;
  children: ReactNode;
}) {
  const { t } = useStrings();
  const [open, setOpen] = useState(false);

  const nav = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ px: 2.5, py: 2 }}>
        <Typography variant="h6">RoadAssist</Typography>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1, overflowY: "auto", py: 1 }}>
        {groups.map((group) => (
          <Box key={group.label}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", px: 2.5, pt: 1.5, pb: 0.5, fontWeight: 700 }}
            >
              {group.label}
            </Typography>
            {group.items.map((item) => (
              <ListItemButton
                key={item.id}
                selected={active === item.id}
                onClick={() => {
                  onSelect(item.id);
                  setOpen(false);
                }}
                sx={{ mx: 1, borderRadius: 2 }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: active === item.id ? "primary.main" : "text.secondary" }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} />
                {(badges?.[item.id] ?? 0) > 0 ? (
                  <Chip
                    size="small"
                    color="primary"
                    label={badges?.[item.id]}
                    sx={{ height: 20, "& .MuiChip-label": { px: 0.75, fontSize: 11 } }}
                  />
                ) : null}
              </ListItemButton>
            ))}
          </Box>
        ))}
      </List>
      <Divider />
      <List sx={{ py: 1 }}>
        <ListItemButton
          onClick={onSignOut}
          sx={{ mx: 1, borderRadius: 2, color: "error.main" }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: "error.main" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary={t.more.signOut} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ height: "100%", display: "flex" }}>
      <Drawer
        variant="permanent"
        open
        sx={{
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": {
            position: "relative",
            width: 260,
            borderRight: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
          },
        }}
      >
        {nav}
      </Drawer>
      <Drawer
        variant="temporary"
        open={open}
        onClose={() => setOpen(false)}
        sx={{ display: { md: "none" }, "& .MuiDrawer-paper": { width: 260 } }}
      >
        {nav}
      </Drawer>
      <Box sx={{ flexGrow: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: { md: "none" },
            alignItems: "center",
            gap: 1,
            px: 1,
            py: 0.5,
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          <IconButton aria-label="menu" onClick={() => setOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="subtitle1">{title}</Typography>
        </Box>
        <Box sx={{ flexGrow: 1, overflowY: "auto", p: { xs: 2, md: 3 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
