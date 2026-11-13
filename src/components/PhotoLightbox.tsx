import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import StorageImage from "./StorageImage";

export type PhotoPreview = {
  photos: string[];
  index: number;
};

export default function PhotoLightbox({
  preview,
  onClose,
  onChange,
}: {
  preview: PhotoPreview | null;
  onClose: () => void;
  onChange: (index: number) => void;
}) {
  if (preview === null || preview.photos.length === 0) return null;
  const total = preview.photos.length;
  const current = preview.photos[preview.index] ?? preview.photos[0];
  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent sx={{ position: "relative", bgcolor: "background.default", p: 1 }}>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", top: 8, right: 8, zIndex: 2, bgcolor: "background.paper" }}
        >
          <CloseIcon />
        </IconButton>
        <StorageImage
          path={current}
          sx={{ width: "100%", maxHeight: "78vh", objectFit: "contain" }}
        />
        {total > 1 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: 1,
            }}
          >
            <IconButton
              aria-label="previous"
              disabled={preview.index <= 0}
              onClick={() => onChange(Math.max(0, preview.index - 1))}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              {`${preview.index + 1} / ${total}`}
            </Typography>
            <IconButton
              aria-label="next"
              disabled={preview.index >= total - 1}
              onClick={() => onChange(Math.min(total - 1, preview.index + 1))}
            >
              <ChevronRightIcon />
            </IconButton>
          </Box>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
