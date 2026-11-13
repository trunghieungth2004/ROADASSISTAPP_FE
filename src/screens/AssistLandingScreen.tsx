import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import BuildIcon from "@mui/icons-material/Build";
import { MOBILE_RELEASES_URL, MOBILE_REPO_URL } from "../components/AssistCtaDialog";
import Screen from "../components/ui/Screen";
import { useStrings } from "../context/LanguageContext";

export default function AssistLandingScreen() {
  const { t } = useStrings();
  return (
    <Screen>
      <Card>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BuildIcon />
          </Box>
          <Typography variant="h5">{t.assistCta.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {t.assistCta.body}
          </Typography>
          <Button
            variant="contained"
            href={MOBILE_RELEASES_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.assistCta.download}
          </Button>
          <Button
            variant="outlined"
            href={MOBILE_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.assistCta.source}
          </Button>
        </CardContent>
      </Card>
    </Screen>
  );
}
