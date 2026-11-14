import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import type { Provider } from "../../api/providers";
import type { Strings } from "../../i18n";

export default function ShopSelect({
  shops,
  shopId,
  t,
  onChange,
}: {
  shops: Provider[];
  shopId: string;
  t: Strings;
  onChange: (shopId: string) => void;
}) {
  if (shops.length <= 1) return null;
  return (
    <TextField
      select
      size="small"
      fullWidth
      label={t.provider.selectShop}
      value={shopId}
      onChange={(event) => onChange(event.target.value)}
      sx={{ mt: 2 }}
    >
      {shops.map((shop) => (
        <MenuItem key={shop.id} value={shop.id}>
          {shop.name}
        </MenuItem>
      ))}
    </TextField>
  );
}
