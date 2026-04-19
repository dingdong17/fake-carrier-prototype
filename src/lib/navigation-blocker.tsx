"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type Blocker = {
  id: string;
  reason: string;
  onDiscard?: () => void | Promise<void>;
};

type ContextValue = {
  isBlocked: boolean;
  register: (b: Blocker) => void;
  unregister: (id: string) => void;
  requestNavigation: (href: string) => void;
};

const NavigationBlockerContext = createContext<ContextValue | null>(null);

function useBlockerContext(): ContextValue {
  const v = useContext(NavigationBlockerContext);
  if (!v) {
    throw new Error(
      "NavigationBlockerContext missing — wrap your app in <NavigationBlockerProvider>"
    );
  }
  return v;
}

export function NavigationBlockerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const blockersRef = useRef<Map<string, Blocker>>(new Map());
  const [version, setVersion] = useState(0);
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  const register = useCallback((b: Blocker) => {
    blockersRef.current.set(b.id, b);
    setVersion((v) => v + 1);
  }, []);

  const unregister = useCallback((id: string) => {
    blockersRef.current.delete(id);
    setVersion((v) => v + 1);
  }, []);

  const requestNavigation = useCallback(
    (href: string) => {
      if (blockersRef.current.size === 0) {
        router.push(href);
      } else {
        setPendingHref(href);
      }
    },
    [router]
  );

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (blockersRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const isBlocked = blockersRef.current.size > 0;

  const value = useMemo<ContextValue>(
    () => ({ isBlocked, register, unregister, requestNavigation }),
    [isBlocked, register, unregister, requestNavigation, version]
  );

  const activeBlocker: Blocker | null =
    blockersRef.current.size > 0
      ? blockersRef.current.values().next().value ?? null
      : null;

  const handleStay = () => setPendingHref(null);

  const handleKeepDraft = () => {
    const target = pendingHref;
    setPendingHref(null);
    if (target) router.push(target);
  };

  const handleDiscard = async () => {
    const b = activeBlocker;
    const target = pendingHref;
    setPendingHref(null);
    if (b?.onDiscard) {
      try {
        await b.onDiscard();
      } catch (err) {
        console.error("navigation-blocker: onDiscard failed", err);
      }
    }
    if (target) router.push(target);
  };

  return (
    <NavigationBlockerContext.Provider value={value}>
      {children}
      {pendingHref && activeBlocker && (
        <BlockerDialog
          blocker={activeBlocker}
          onStay={handleStay}
          onKeep={handleKeepDraft}
          onDiscard={handleDiscard}
        />
      )}
    </NavigationBlockerContext.Provider>
  );
}

function BlockerDialog({
  blocker,
  onStay,
  onKeep,
  onDiscard,
}: {
  blocker: Blocker;
  onStay: () => void;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  const canDiscard = !!blocker.onDiscard;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onStay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStay]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="nav-blocker-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onStay}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          id="nav-blocker-title"
          className="text-lg font-semibold text-ec-dark-blue"
        >
          Vorgang läuft noch
        </h3>
        <p className="mt-2 text-sm text-ec-grey-80">{blocker.reason}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onStay}>
            Abbrechen
          </Button>
          <Button variant="outline" onClick={onKeep}>
            Entwurf behalten
          </Button>
          {canDiscard && (
            <Button variant="danger" onClick={onDiscard}>
              Verwerfen und verlassen
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function useNavigationBlockerState() {
  const { isBlocked, requestNavigation } = useBlockerContext();
  return { isBlocked, requestNavigation };
}

export function useBlockNavigation(opts: {
  isActive: boolean;
  reason: string;
  onDiscard?: () => void | Promise<void>;
}) {
  const { register, unregister } = useBlockerContext();
  const { isActive, reason, onDiscard } = opts;

  const idRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (idRef.current) {
        unregister(idRef.current);
        idRef.current = null;
      }
      return;
    }
    const id =
      idRef.current ?? `blk-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    idRef.current = id;
    register({ id, reason, onDiscard });
    return () => {
      if (idRef.current) {
        unregister(idRef.current);
        idRef.current = null;
      }
    };
  }, [isActive, reason, onDiscard, register, unregister]);
}
