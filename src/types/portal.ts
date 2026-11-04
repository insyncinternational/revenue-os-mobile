/** Customer portal DTOs (backend routes/portal.ts, routes/mobilePortal.ts; same shapes as the web's lib/portalState.ts). */

export type PortalBranding = {
  business_name: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
  slug: string | null;
};

export type PortalCustomer = { name: string; email: string };

/** A signed-in customer session, as the mobile sign-in endpoints return it. */
export type PortalSignedIn = { token: string; expires_at: string | null; customer: PortalCustomer; branding: PortalBranding | null };

export type PortalMeeting = {
  id: number;
  title: string;
  starts_at: string | null;
  status: "pending" | "completed" | "cancelled";
  join_url: string | null;
};

export type PortalMessage = {
  id: string;
  channel: "email" | "chat" | "portal";
  from: "customer" | "business";
  subject: string | null;
  body: string;
  created_at: string | null;
};

export type PortalInvoice = {
  id: number;
  number: string;
  status: string;
  currency: string;
  total_cents: number;
  amount_paid_cents: number;
  due_date: string | null;
  paid_at: string | null;
  pay_url: string | null;
  view_url?: string | null;
};

export type PortalDocument = { id: number; file_name: string; file_size: number; mime_type: string; created_at: string | null };
