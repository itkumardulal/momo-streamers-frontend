"use client";

import { useEffect, useRef } from "react";
import { Provider } from "react-redux";
import { rehydrate } from "@/features/auth/authSlice";
import { initializeStoreListeners, makeStore, type AppStore } from "./store";
import { useAppDispatch } from "./hooks";

function AuthRehydrate({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(rehydrate());
  }, [dispatch]);
  return <>{children}</>;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    initializeStoreListeners(storeRef.current);
  }

  return (
    <Provider store={storeRef.current}>
      <AuthRehydrate>{children}</AuthRehydrate>
    </Provider>
  );
}
