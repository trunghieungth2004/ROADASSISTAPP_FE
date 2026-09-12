import { useCallback, useEffect, useRef, useState } from "react";
import {
  placeKey,
  searchPlaces,
  type Place,
} from "../api/places";

export type PlaceSearch = {
  input: string;
  options: Place[];
  searching: boolean;
  handleInput: (value: string, reason: string) => void;
  pin: (value: string) => void;
  refreshSaved: () => void;
};

type UsePlaceSearchOpts = {
  onEmpty?: () => void;
  localSource?: (query: string) => Promise<Place[]>;
  saved?: () => Place[];
};

const MIN_QUERY_LEN = 3;

export function usePlaceSearch(
  lang: string,
  opts?: UsePlaceSearchOpts,
): PlaceSearch {
  const [input, setInput] = useState("");
  const [options, setOptions] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const seqRef = useRef(0);
  const timerRef = useRef(0);
  const lastRef = useRef("");
  const emptyRef = useRef(opts?.onEmpty);
  emptyRef.current = opts?.onEmpty;
  const localRef = useRef(opts?.localSource);
  localRef.current = opts?.localSource;
  const savedRef = useRef(opts?.saved);
  savedRef.current = opts?.saved;

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const savedNow = useCallback((): Place[] => {
    try {
      return savedRef.current?.() ?? [];
    } catch {
      return [];
    }
  }, []);

  const merge = useCallback(
    (base: Place[], extra: Place[][]): Place[] => {
      const seen = new Set<string>();
      const out: Place[] = [];
      for (const list of [base, ...extra]) {
        for (const p of list) {
          const key = placeKey(p);
          if (seen.has(key)) {
            continue;
          }
          seen.add(key);
          out.push(p);
        }
      }
      return out;
    },
    [],
  );

  const run = useCallback(
    (value: string) => {
      window.clearTimeout(timerRef.current);
      const base = savedNow();
      if (value.trim().length < MIN_QUERY_LEN) {
        setOptions(base);
        setSearching(false);
        return;
      }
      setSearching(true);
      seqRef.current += 1;
      const id = seqRef.current;
      timerRef.current = window.setTimeout(() => {
        const remote = searchPlaces(value, lang);
        const local = localRef.current ?
          localRef.current(value) :
          Promise.resolve([] as Place[]);
        void Promise.all([local, remote]).then(([localHits, remoteHits]) => {
          if (seqRef.current !== id) {
            return;
          }
          setOptions(merge(base, [localHits, remoteHits]));
          setSearching(false);
        });
      }, 300);
    },
    [lang, merge, savedNow],
  );

  const handleInput = useCallback(
    (value: string, reason: string) => {
      setInput(value);
      if (reason !== "input") {
        return;
      }
      lastRef.current = value;
      if (value === "") {
        window.clearTimeout(timerRef.current);
        setOptions(savedNow());
        setSearching(false);
        emptyRef.current?.();
        return;
      }
      run(value);
    },
    [run, savedNow],
  );

  const pin = useCallback(
    (value: string) => {
      window.clearTimeout(timerRef.current);
      seqRef.current += 1;
      setInput(value);
      setOptions(savedNow());
      setSearching(false);
    },
    [savedNow],
  );

  const refreshSaved = useCallback(() => {
    if (lastRef.current.trim().length >= MIN_QUERY_LEN) {
      run(lastRef.current);
      return;
    }
    setOptions(savedNow());
  }, [run, savedNow]);

  return { input, options, searching, handleInput, pin, refreshSaved };
}
