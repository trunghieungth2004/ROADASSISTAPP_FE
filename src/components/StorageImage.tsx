import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import type { SxProps, Theme } from "@mui/material/styles";
import { resolvePhotoUrl } from "../storage/photoUrls";

export default function StorageImage({
  path,
  alt = "",
  onClick,
  sx,
}: {
  path: string;
  alt?: string;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setUrl(null);
    void resolvePhotoUrl(path).then((next) => {
      if (alive) setUrl(next);
    });
    return () => {
      alive = false;
    };
  }, [path]);

  if (url === null) {
    return <Skeleton variant="rounded" sx={sx} />;
  }

  return (
    <Box
      component="img"
      src={url}
      alt={alt}
      onClick={onClick}
      sx={{ display: "block", objectFit: "cover", ...sx, cursor: onClick ? "zoom-in" : "default" }}
    />
  );
}
