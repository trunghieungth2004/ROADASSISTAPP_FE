import { useEffect, useState } from "react";
import TextField from "@mui/material/TextField";
import { formatDateDMY, parseDateDMY } from "../utils/date";

export default function DateField({
  label,
  value,
  onChange,
  size = "small",
  fullWidth = false,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  size?: "small" | "medium";
  fullWidth?: boolean;
}) {
  const [text, setText] = useState(formatDateDMY(value));
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    setText(formatDateDMY(value));
    setInvalid(false);
  }, [value]);

  function update(next: string): void {
    setText(next);
    if (next.trim() === "") {
      setInvalid(false);
      onChange("");
      return;
    }
    const iso = parseDateDMY(next);
    if (iso === null) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    onChange(iso);
  }

  function normalize(): void {
    if (text.trim() === "") return;
    const iso = parseDateDMY(text);
    setText(iso === null ? text : formatDateDMY(iso));
    setInvalid(iso === null);
  }

  return (
    <TextField
      size={size}
      fullWidth={fullWidth}
      label={label}
      value={text}
      onChange={(event) => update(event.target.value)}
      onBlur={normalize}
      error={invalid}
      helperText={invalid ? "DD/MM/YYYY" : undefined}
      placeholder="DD/MM/YYYY"
      slotProps={{ htmlInput: { inputMode: "numeric" } }}
    />
  );
}
