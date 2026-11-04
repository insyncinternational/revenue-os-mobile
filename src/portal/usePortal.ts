/**
 * Customer portal data. Keys start with ["portal", slug], so switching business never shows another business's
 * appointments or messages. The web portal polls (no live updates for customers); the app refetches on focus and
 * every minute on the messages screen, and gets a push when the business replies.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { portalApi } from "@/api/portal";
import { userMessage } from "@/api/errors";
import { haptics } from "@/lib/haptics";
import { useToast } from "@/ui/Toast";
import { portalToken, useActivePortal } from "./portalSession";

export const portalKeys = {
  all: (slug: string) => ["portal", slug] as const,
  meetings: (slug: string) => ["portal", slug, "meetings"] as const,
  slots: (slug: string) => ["portal", slug, "slots"] as const,
  messages: (slug: string) => ["portal", slug, "messages"] as const,
  invoices: (slug: string) => ["portal", slug, "invoices"] as const,
  documents: (slug: string) => ["portal", slug, "documents"] as const,
};

function useSlug(): string {
  return useActivePortal()?.slug ?? "";
}

export function usePortalMeetings() {
  const slug = useSlug();
  return useQuery({ queryKey: portalKeys.meetings(slug), queryFn: ({ signal }) => portalApi.meetings(portalToken(), signal), enabled: Boolean(slug), staleTime: 30_000 });
}

export function usePortalSlots(enabled = true) {
  const slug = useSlug();
  return useQuery({ queryKey: portalKeys.slots(slug), queryFn: ({ signal }) => portalApi.slots(portalToken(), signal), enabled: enabled && Boolean(slug), staleTime: 30_000 });
}

export function usePortalMessages(poll = false) {
  const slug = useSlug();
  return useQuery({
    queryKey: portalKeys.messages(slug),
    queryFn: ({ signal }) => portalApi.messages(portalToken(), signal),
    enabled: Boolean(slug),
    staleTime: 15_000,
    refetchInterval: poll ? 60_000 : false,
  });
}

export function usePortalInvoices() {
  const slug = useSlug();
  return useQuery({ queryKey: portalKeys.invoices(slug), queryFn: ({ signal }) => portalApi.invoices(portalToken(), signal), enabled: Boolean(slug), staleTime: 60_000 });
}

export function usePortalDocuments() {
  const slug = useSlug();
  return useQuery({ queryKey: portalKeys.documents(slug), queryFn: ({ signal }) => portalApi.documents(portalToken(), signal), enabled: Boolean(slug), staleTime: 60_000 });
}

/** A customer action: runs it with the active token, says how it went, and refreshes this business's data. */
export function usePortalAction<V, R>(fn: (token: string, vars: V) => Promise<R>, opts: { success?: string | ((r: R, v: V) => string | null); onDone?: (r: R, v: V) => void } = {}) {
  const slug = useSlug();
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (vars: V) => fn(portalToken(), vars),
    onSuccess: (r, v) => {
      haptics.success();
      const text = typeof opts.success === "function" ? opts.success(r, v) : opts.success;
      if (text) toast.show(text, { kind: "success" });
      void qc.invalidateQueries({ queryKey: portalKeys.all(slug) });
      opts.onDone?.(r, v);
    },
    onError: (e) => {
      haptics.warning();
      toast.show(userMessage(e), { kind: "error" });
    },
  });
}
