import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import type { Strings } from "../../i18n";
import { emptyLine, type LineDraft } from "./lineDrafts";

export type { LineDraft } from "./lineDrafts";
export { draftsFromItems, draftsToItems, draftsTotal } from "./lineDrafts";

export default function LineItemsEditor({
  t,
  lines,
  onChange,
}: {
  t: Strings;
  lines: LineDraft[];
  onChange: (lines: LineDraft[]) => void;
}) {
  const update = (index: number, patch: Partial<LineDraft>): void => {
    onChange(lines.map((line, current) =>
      current === index ? { ...line, ...patch } : line));
  };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {lines.map((line, index) => (
        <Box
          key={index}
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr) 60px 88px 32px",
              sm: "minmax(0, 1fr) 74px 116px 40px",
            },
            gap: { xs: 0.75, sm: 1 },
            alignItems: "center",
          }}
        >
          <TextField
            size="small"
            label={t.provider.lineName}
            value={line.name}
            onChange={(event) => update(index, { name: event.target.value })}
          />
          <TextField
            size="small"
            type="number"
            label={t.provider.lineQty}
            value={line.qty}
            onChange={(event) => update(index, { qty: event.target.value })}
          />
          <TextField
            size="small"
            type="number"
            label={t.provider.linePrice}
            value={line.unitPrice}
            onChange={(event) => update(index, { unitPrice: event.target.value })}
          />
          <IconButton
            aria-label={t.provider.removeLine}
            disabled={lines.length === 1}
            onClick={() => onChange(lines.filter((_, current) => current !== index))}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={() => onChange([...lines, emptyLine()])}
        sx={{ alignSelf: "flex-start" }}
      >
        {t.provider.addLine}
      </Button>
    </Box>
  );
}
