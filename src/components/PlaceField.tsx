import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { placeKey, type Place } from "../api/places";
import type { PlaceSearch } from "../hooks/usePlaceSearch";

type PlaceFieldProps = {
  point: string;
  title: string;
  placeholder: string;
  search: PlaceSearch;
  onSelect: (place: Place | null) => void;
  searchingText: string;
  noResultsText: string;
  emptyHint: string;
  pickActive: boolean;
  pickLabel: string;
  onPickMap: () => void;
  savedHeader: string;
  directoryHeader: string;
  mapHeader: string;
  savedCoords: Set<string>;
  saveTitle: string;
  onToggleSave?: (place: Place) => void;
  canSavePin: boolean;
  onSavePin?: () => void;
};

export default function PlaceField({
  point,
  title,
  placeholder,
  search,
  onSelect,
  searchingText,
  noResultsText,
  emptyHint,
  pickActive,
  pickLabel,
  onPickMap,
  savedHeader,
  directoryHeader,
  mapHeader,
  savedCoords,
  saveTitle,
  onToggleSave,
  canSavePin,
  onSavePin,
}: PlaceFieldProps) {
  return (
    <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
      <Autocomplete
        fullWidth
        size="small"
        options={search.options}
        getOptionLabel={(o) => o.label}
        filterOptions={(x) => x}
        inputValue={search.input}
        onInputChange={(_e, v, r) => search.handleInput(v, r)}
        onChange={(_e, v) => onSelect(v)}
        loading={search.searching}
        loadingText={searchingText}
        noOptionsText={
          search.input.trim().length >= 3 ? noResultsText : emptyHint
        }
        isOptionEqualToValue={(o, v) =>
          o.label === v.label && o.lat === v.lat && o.lng === v.lng
        }
        groupBy={(o) =>
          o.source === "saved"
            ? savedHeader
            : o.source === "directory"
              ? directoryHeader
              : mapHeader
        }
        renderOption={(props, o) => {
          const { key, ...optionProps } = props;
          const saved =
            o.source === "saved" || savedCoords.has(placeKey(o));
          return (
            <li key={key} {...optionProps}>
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                {o.label}
              </Typography>
              {onToggleSave && (
                <IconButton
                  size="small"
                  edge="end"
                  title={saveTitle}
                  aria-label={saveTitle}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSave(o);
                  }}
                >
                  {saved ? (
                    <BookmarkIcon fontSize="small" color="primary" />
                  ) : (
                    <BookmarkBorderIcon fontSize="small" />
                  )}
                </IconButton>
              )}
            </li>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={`${point} · ${title}`}
            placeholder={placeholder}
          />
        )}
        sx={{ flexGrow: 1 }}
      />
      {onSavePin && (
        <IconButton
          title={saveTitle}
          aria-label={saveTitle}
          disabled={!canSavePin}
          onClick={onSavePin}
        >
          <BookmarkBorderIcon />
        </IconButton>
      )}
      <IconButton
        aria-label={pickLabel}
        color={pickActive ? "primary" : "default"}
        onClick={onPickMap}
      >
        <MyLocationIcon />
      </IconButton>
    </Box>
  );
}
