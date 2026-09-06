"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_LOOK, persistLook, type Look } from "./look";
import { blendThemeChange } from "./theme";

/*
 * The current look, seeded by the server from the cookie so the first render
 * already matches, and changed on the client by the theme switcher.
 */
type LookContextValue = {
  look: Look;
  setLook: (look: Look) => void;
};

const LookContext = createContext<LookContextValue>({
  look: DEFAULT_LOOK,
  setLook: () => {},
});

export function LookProvider({ initial, children }: { initial: Look; children: ReactNode }) {
  const [look, setLookState] = useState<Look>(initial);
  const setLook = useCallback((next: Look) => {
    blendThemeChange();
    persistLook(next);
    setLookState(next);
  }, []);
  const value = useMemo(() => ({ look, setLook }), [look, setLook]);
  return <LookContext.Provider value={value}>{children}</LookContext.Provider>;
}

export function useLook(): Look {
  return useContext(LookContext).look;
}

export function useSetLook(): (look: Look) => void {
  return useContext(LookContext).setLook;
}
