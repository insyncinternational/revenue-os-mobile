import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/api/invoices";
import { userMessage } from "@/api/errors";
import { t } from "@/i18n";
import { haptics } from "@/lib/haptics";
import { keys } from "@/query/keys";
import { useActiveBaseId } from "@/session/workspace";
import type { Invoice, InvoiceInput, InvoiceList, InvoiceStatus } from "@/types/invoice";
import { useCelebrate } from "@/ui/Celebrate";
import { useToast } from "@/ui/Toast";

export function useInvoiceList(status: InvoiceStatus | null, enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  return useQuery({
    queryKey: keys.invoices.list(baseId, status ?? "all"),
    queryFn: ({ signal }) => invoicesApi.list(baseId, status, signal),
    enabled: enabled && baseId > 0,
    staleTime: 30_000,
    // Switching filters keeps the summary on screen while the rows load.
    placeholderData: (prev) => prev,
  });
}

/** Invoice totals only (the More row's overdue count), without the list. */
export function useInvoiceSummary(enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  return useQuery({
    queryKey: keys.invoices.summary(baseId),
    queryFn: ({ signal }) => invoicesApi.summary(baseId, signal),
    enabled: enabled && baseId > 0,
    staleTime: 30_000,
  });
}

/** A deal's invoices (deal screen). */
export function useDealInvoices(dealId: number, enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  return useQuery({
    queryKey: [...keys.invoices.list(baseId, "deal"), dealId],
    queryFn: ({ signal }) => invoicesApi.forDeal(baseId, dealId, signal),
    enabled: enabled && baseId > 0 && dealId > 0,
    staleTime: 30_000,
  });
}

/** Whether the workspace can take payments (sending needs Stripe connected on the web). */
export function usePayments(enabled = true) {
  const baseId = useActiveBaseId() ?? 0;
  return useQuery({
    queryKey: keys.invoices.payments(baseId),
    queryFn: ({ signal }) => invoicesApi.payments(baseId, signal),
    enabled: enabled && baseId > 0,
    staleTime: 5 * 60_000,
  });
}

function cachedInvoice(qc: QueryClient, baseId: number, id: number): Invoice | undefined {
  for (const [, data] of qc.getQueriesData<InvoiceList>({ queryKey: ["invoices", baseId, "list"] })) {
    const hit = data?.invoices.find((i) => i.id === id);
    if (hit) return hit;
  }
  return undefined;
}

export function useInvoice(id: number) {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  return useQuery<{ invoice: Invoice }>({
    queryKey: keys.invoices.detail(baseId, id),
    queryFn: ({ signal }) => invoicesApi.get(baseId, id, signal),
    enabled: baseId > 0 && id > 0,
    staleTime: 30_000,
    placeholderData: (prev) => {
      if (prev?.invoice.id === id) return prev;
      const hit = cachedInvoice(qc, baseId, id);
      return hit ? { invoice: hit } : undefined;
    },
  });
}

/** After a change: the invoice, every list and summary, and (paid → deal won) the deal, board and Today. */
function refreshAfter(qc: QueryClient, baseId: number, invoice: Invoice) {
  qc.setQueryData(keys.invoices.detail(baseId, invoice.id), { invoice });
  void qc.invalidateQueries({ queryKey: ["invoices", baseId, "list"] });
  void qc.invalidateQueries({ queryKey: ["home", baseId] });
  if (invoice.deal_id) {
    void qc.invalidateQueries({ queryKey: keys.pipeline.deal(baseId, invoice.deal_id) });
    void qc.invalidateQueries({ queryKey: keys.pipeline.dealTimeline(baseId, invoice.deal_id) });
    void qc.invalidateQueries({ queryKey: ["pipeline", baseId, "board"] });
  }
  if (invoice.lead_id) void qc.invalidateQueries({ queryKey: keys.contacts.timeline(baseId, invoice.lead_id) });
}

/**
 * A new invoice from the quick form. "draft" just saves it; "link" also marks it sent so its pay link can be shared
 * at once (text-to-pay). The share sheet itself is opened by the caller.
 */
export function useCreateInvoice() {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, then }: { input: InvoiceInput; then: "draft" | "link" }) => {
      const { invoice } = await invoicesApi.create(baseId, input);
      if (then === "draft") return { invoice, sendError: null };
      // Saved either way: a failed "mark sent" (Stripe not ready) leaves a draft, not nothing.
      try {
        return { invoice: (await invoicesApi.send(baseId, invoice.id, "link")).invoice, sendError: null };
      } catch (e) {
        return { invoice, sendError: e };
      }
    },
    onSuccess: ({ invoice }) => {
      haptics.success();
      refreshAfter(qc, baseId, invoice);
    },
  });
}

type Action = { kind: "email" } | { kind: "link" } | { kind: "paid" } | { kind: "void" };

/** Send by email, mark sent for sharing, mark paid, void — reported the same way everywhere. */
export function useInvoiceAction(id: number) {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  const toast = useToast();
  const celebrate = useCelebrate();
  return useMutation({
    mutationFn: (a: Action) =>
      a.kind === "email"
        ? invoicesApi.send(baseId, id, "email")
        : a.kind === "link"
          ? invoicesApi.send(baseId, id, "link")
          : a.kind === "paid"
            ? invoicesApi.markPaid(baseId, id)
            : invoicesApi.void(baseId, id),
    onSuccess: ({ invoice }, a) => {
      haptics.success();
      refreshAfter(qc, baseId, invoice);
      // "link" is followed by the share sheet, which says enough on its own.
      if (a.kind === "email") toast.show(t("invoice.emailed", { email: invoice.customer_email ?? "" }), { kind: "success" });
      else if (a.kind === "paid") {
        celebrate();
        toast.show(t("invoice.paidToast"), { kind: "success" });
      }
      else if (a.kind === "void") toast.show(t("invoice.voidedToast"), { kind: "info" });
    },
    onError: (e) => toast.show(userMessage(e), { kind: "error" }),
  });
}

/** A draft invoice from a deal (its products, or its amount), for the deal's contact. */
export function useInvoiceFromDeal() {
  const baseId = useActiveBaseId() ?? 0;
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (dealId: number) => invoicesApi.fromDeal(baseId, dealId),
    onSuccess: ({ invoice }) => {
      haptics.success();
      refreshAfter(qc, baseId, invoice);
    },
    onError: (e) => toast.show(userMessage(e), { kind: "error" }),
  });
}
