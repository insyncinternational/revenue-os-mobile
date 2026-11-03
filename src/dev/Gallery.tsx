/* The component gallery (More → Gallery in development). Not part of release builds: see app/(app)/gallery.tsx. */
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useBrandColor } from "@/theme/brandStore";
import { money, percentChange, relativeTime } from "@/lib/format";
import { useTheme, type ThemePreference } from "@/theme/ThemeProvider";
import { makeStyles } from "@/theme/makeStyles";
import { gutter, radius, space, type Palette } from "@/theme/tokens";
import { Avatar } from "@/ui/Avatar";
import { Badge, CountBadge } from "@/ui/Badge";
import { Button } from "@/ui/Button";
import { Card } from "@/ui/Card";
import { ChannelBadge, ChannelGlyph, channelLabel, type Channel } from "@/ui/ChannelIcon";
import { FilterChips } from "@/ui/Chip";
import { Fab } from "@/ui/Fab";
import { IconButton } from "@/ui/IconButton";
import { Archive, Bell, Calendar, Inbox, Mail, MailOpen, Phone, Search as SearchIcon, Sparkles, Users } from "@/ui/icons";
import { Input } from "@/ui/Input";
import { ListRow } from "@/ui/ListRow";
import { BrandMark, Logo } from "@/ui/Logo";
import { Screen } from "@/ui/Screen";
import { SearchBar } from "@/ui/SearchBar";
import { Divider, SectionHeader } from "@/ui/Section";
import { SegmentedControl } from "@/ui/SegmentedControl";
import { SkeletonList } from "@/ui/Skeleton";
import { EmptyState, ErrorState, OfflineBanner } from "@/ui/States";
import { SwipeableRow } from "@/ui/SwipeableRow";
import { Text } from "@/ui/Text";
import { useToast } from "@/ui/Toast";

/**
 * UI gallery (development builds only, from More): every component in one place, in light, dark and agency colours, to review the design before
 * screens are built. Becomes a development-only screen once the real tabs exist.
 */

const NOW = new Date();
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

const SAMPLE_CONVERSATIONS: { name: string; channel: Channel; preview: string; at: Date; unread: boolean }[] = [
  { name: "Sara Ahmed", channel: "whatsapp", preview: "Perfect, can we do Thursday at 3pm instead?", at: minutesAgo(4), unread: true },
  { name: "James Carter", channel: "email", preview: "Re: Proposal — thanks, I've shared it with our CFO and will get back to you.", at: minutesAgo(52), unread: true },
  { name: "Layla Hassan", channel: "instagram", preview: "Do you offer packages for small clinics?", at: minutesAgo(60 * 5), unread: false },
  { name: "Omar Khalil", channel: "sms", preview: "Running 10 minutes late, sorry!", at: minutesAgo(60 * 26), unread: false },
  { name: "Northwind Ltd", channel: "website_chat", preview: "Visitor asked about pricing for 20 seats", at: minutesAgo(60 * 24 * 3), unread: false },
];

const BRANDS: { key: string; label: string; color: string | null }[] = [
  { key: "ros", label: "Revenue OS", color: null },
  { key: "teal", label: "Agency teal", color: "#0f9d8a" },
  { key: "orange", label: "Agency orange", color: "#f97316" },
  { key: "yellow", label: "Agency yellow", color: "#facc15" },
];

const SWATCHES: (keyof Palette)[] = ["background", "surface", "surfaceSecondary", "text", "textMuted", "border", "primary", "primaryFill", "primarySubtle", "success", "warning", "danger", "info"];


export default function Gallery() {
  const s = useStyles();
  const { colors, preference, setPreference } = useTheme();
  const toast = useToast();
  const preview = useBrandColor((b) => b.preview);
  const setPreview = useBrandColor((b) => b.setPreview);
  // The preview colour belongs to this screen only: leaving it restores the workspace's real colours.
  useEffect(() => () => setPreview(null), [setPreview]);
  const [filter, setFilter] = useState<"all" | "unread" | "mine" | "unassigned">("all");
  const [period, setPeriod] = useState<"7" | "30" | "90">("30");
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [rows, setRows] = useState(SAMPLE_CONVERSATIONS);

  return (
    <>
      <Screen>
        <View style={s.block}>
          <Text variant="subhead" tone="muted">
            Every component, in the app&apos;s real colours. Switch the theme and agency colour to check both.
          </Text>
          <SegmentedControl<ThemePreference>
            value={preference}
            onChange={setPreference}
            options={[
              { key: "system", label: "System" },
              { key: "light", label: "Light" },
              { key: "dark", label: "Dark" },
            ]}
          />
        </View>
        <FilterChips
          options={BRANDS.map((b) => ({ key: b.key, label: b.label }))}
          value={BRANDS.find((b) => b.color === preview)?.key ?? "ros"}
          onChange={(k) => setPreview(BRANDS.find((b) => b.key === k)?.color ?? null)}
        />

        <SectionHeader title="Logo" />
        <Card style={s.card} contentStyle={s.cardBody}>
          <Logo height={44} />
          <View style={s.row}>
            <BrandMark size={40} />
            <BrandMark size={28} />
            <BrandMark size={20} />
          </View>
        </Card>

        <SectionHeader title="Type" />
        <Card style={s.card} contentStyle={s.cardBody}>
          <Text variant="largeTitle">Today</Text>
          <Text variant="title">Sara Ahmed</Text>
          <Text variant="headline">3 replies waiting</Text>
          <Text variant="body">Perfect, can we do Thursday at 3pm instead?</Text>
          <Text variant="callout">Button and input text</Text>
          <Text variant="subhead" tone="muted">
            Head of Growth · Northwind Ltd
          </Text>
          <Text variant="footnote" tone="muted">
            Last contacted {relativeTime(minutesAgo(60 * 26))}
          </Text>
          <Text variant="caption" tone="primary">
            CAPTION · 12PT
          </Text>
        </Card>

        <SectionHeader title="Colours" />
        <View style={s.swatches}>
          {SWATCHES.map((k) => (
            <View key={k} style={s.swatch}>
              <View style={[s.swatchChip, { backgroundColor: colors[k] }]} />
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {k}
              </Text>
            </View>
          ))}
        </View>

        <SectionHeader title="Buttons" />
        <Card style={s.card} contentStyle={s.cardBody}>
          <Button label="Send reply" icon={Mail} fullWidth onPress={() => toast.show("Reply sent", { kind: "success" })} />
          <View style={s.row}>
            <Button label="Call" icon={Phone} variant="secondary" />
            <Button label="Book" icon={Calendar} variant="ghost" />
            <Button label="Lost" variant="danger" />
          </View>
          <View style={s.row}>
            <Button label="Small" size="sm" />
            <Button label="Saving" loading />
            <Button label="Disabled" disabled variant="secondary" />
          </View>
          <View style={s.row}>
            <IconButton icon={SearchIcon} label="Search" />
            <IconButton icon={Bell} label="Notifications" filled />
            <IconButton icon={Archive} label="Archive" tone="danger" />
            <IconButton icon={Sparkles} label="Rewrite with AI" tone="primary" />
          </View>
        </Card>

        <SectionHeader title="Inputs" />
        <Card style={s.card} contentStyle={s.cardBody}>
          <SearchBar value={query} onChangeText={setQuery} placeholder="Search contacts" />
          <Input label="Email" placeholder="you@company.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" icon={Mail} />
          <Input label="Company" placeholder="Northwind Ltd" hint="Shown on invoices" />
          <Input label="Phone" value="+971 50" error="Enter a full phone number" />
        </Card>

        <SectionHeader title="Filters" />
        <FilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { key: "all", label: "All" },
            { key: "unread", label: "Unread", count: 2 },
            { key: "mine", label: "Mine", count: 5 },
            { key: "unassigned", label: "Unassigned" },
          ]}
        />
        <View style={[s.block, { paddingTop: space.md }]}>
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            options={[
              { key: "7", label: "7 days" },
              { key: "30", label: "30 days" },
              { key: "90", label: "90 days" },
            ]}
          />
        </View>

        <SectionHeader title="Badges & people" />
        <Card style={s.card} contentStyle={s.cardBody}>
          <View style={s.row}>
            <Badge label="Hot" tone="danger" />
            <Badge label="Won" tone="success" />
            <Badge label="Overdue" tone="warning" />
            <Badge label="New" tone="brand" />
            <Badge label="Info" tone="info" />
            <Badge label="Draft" />
            <CountBadge count={3} />
            <CountBadge count={128} />
          </View>
          <View style={s.row}>
            <Avatar name="Sara Ahmed" />
            <Avatar name="James Carter" />
            <Avatar name="Layla Hassan" />
            <Avatar name="Omar Khalil" />
            <Avatar name="Northwind Ltd" />
            <Avatar name="Zainab" size={32} />
          </View>
          <View style={s.row}>
            {(Object.keys(channelLabel) as Channel[]).map((c) => (
              <View key={c} style={s.channel}>
                <ChannelGlyph channel={c} size={20} />
              </View>
            ))}
          </View>
        </Card>

        <SectionHeader title="Inbox rows (swipe them)" />
        <View style={s.list}>
          {rows.map((r, i) => (
            <View key={r.name}>
              <SwipeableRow
                id={r.name}
                left={{
                  label: r.unread ? "Read" : "Unread",
                  icon: r.unread ? MailOpen : Mail,
                  color: colors.primaryFill,
                  onTrigger: () => setRows((all) => all.map((x) => (x.name === r.name ? { ...x, unread: !x.unread } : x))),
                }}
                right={{
                  label: "Archive",
                  icon: Archive,
                  color: colors.textMuted,
                  onTrigger: () => {
                    setRows((all) => all.filter((x) => x.name !== r.name));
                    toast.show("Conversation archived", { action: { label: "Undo", onPress: () => setRows(SAMPLE_CONVERSATIONS) } });
                  },
                }}
              >
                <ListRow
                  title={r.name}
                  subtitle={r.preview}
                  meta={relativeTime(r.at)}
                  unread={r.unread}
                  onPress={() => toast.show(`Open ${r.name}`)}
                  leading={
                    <View>
                      <Avatar name={r.name} size={44} />
                      <View style={s.channelOnAvatar}>
                        <ChannelBadge channel={r.channel} />
                      </View>
                    </View>
                  }
                />
              </SwipeableRow>
              {i < rows.length - 1 ? <Divider inset={gutter + 44 + space.md} /> : null}
            </View>
          ))}
        </View>

        <SectionHeader title="Cards" />
        <View style={[s.block, s.kpis]}>
          {[
            { label: "New leads", value: "128", change: 12 },
            { label: "Pipeline", value: money(48250, "AED", "en-US", { compact: true }), change: -4 },
          ].map((k) => (
            <Card key={k.label} style={s.kpi} contentStyle={s.kpiBody}>
              <Text variant="footnote" tone="muted">
                {k.label}
              </Text>
              <Text variant="title" numeric>
                {k.value}
              </Text>
              <Text variant="footnote" weight="semibold" tone={k.change >= 0 ? "success" : "danger"} numeric>
                {percentChange(k.change)} vs last period
              </Text>
            </Card>
          ))}
        </View>
        <View style={[s.block, s.stack]}>
          <Card>
            <View style={s.meeting}>
              <View style={[s.meetingIcon, { backgroundColor: colors.primarySubtle }]}>
                <Calendar size={20} color={colors.primary} strokeWidth={1.75} />
              </View>
              <View style={s.flex}>
                <Text variant="headline" numberOfLines={1}>
                  Discovery call
                </Text>
                <Text variant="subhead" tone="muted" numberOfLines={1}>
                  Sara Ahmed · Today, 3:00 PM
                </Text>
              </View>
              <Button label="Join" size="sm" onPress={() => toast.show("Joining call…")} />
            </View>
          </Card>
          <Card onPress={() => toast.show("Opened deal")} accessibilityLabel="Northwind renewal, 12,500 dollars, Proposal stage">
            <View style={s.meeting}>
              <View style={s.flex}>
                <Text variant="headline" numberOfLines={1}>
                  Northwind renewal
                </Text>
                <Text variant="subhead" tone="muted" numberOfLines={1}>
                  Proposal · closes in 5 days
                </Text>
              </View>
              <Text variant="headline" numeric>
                {money(12500, "USD")}
              </Text>
            </View>
          </Card>
        </View>

        <SectionHeader title="Loading" />
        <View style={s.list}>
          <SkeletonList rows={3} />
        </View>

        <SectionHeader title="Empty, error, offline" />
        <Card padded={false} style={s.card}>
          <EmptyState icon={Inbox} title="All caught up" message="New replies from every channel will show up here." />
        </Card>
        <Card padded={false} style={s.card}>
          <EmptyState icon={Users} title="No contacts yet" message="Add your first contact, or import them on the web." actionLabel="Add contact" onAction={() => toast.show("Add contact")} />
        </Card>
        <Card padded={false} style={s.card}>
          <ErrorState onRetry={() => toast.show("Retrying…")} />
        </Card>
        <Card padded={false} style={s.card}>
          <OfflineBanner />
          <ErrorState offline onRetry={() => toast.show("Retrying…")} />
        </Card>

        <SectionHeader title="Messages" />
        <View style={[s.block, s.row]}>
          <Button label="Success" variant="secondary" onPress={() => toast.show("Deal moved to Won", { kind: "success" })} />
          <Button label="Error" variant="secondary" onPress={() => toast.show("Couldn't send. Check your connection.", { kind: "error" })} />
          <Button label="Undo" variant="secondary" onPress={() => toast.show("Task completed", { action: { label: "Undo", onPress: () => {} } })} />
        </View>
        <View style={s.fabSpace} />
      </Screen>
      <Fab label="New" onPress={() => toast.show("New contact, deal, task or meeting")} />
    </>
  );
}

const useStyles = makeStyles((c) => ({
  block: { paddingHorizontal: gutter, gap: space.md, paddingBottom: space.md },
  card: { marginHorizontal: gutter, marginBottom: space.sm },
  cardBody: { gap: space.md },
  row: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
  list: { backgroundColor: c.surface, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
  swatches: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: gutter, gap: space.md },
  swatch: { width: 76, gap: space.xs },
  swatchChip: { height: 44, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong },
  channel: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
  channelOnAvatar: { position: "absolute", right: -3, bottom: -3 },
  kpis: { flexDirection: "row" },
  kpi: { flex: 1 },
  kpiBody: { gap: space.xs },
  meeting: { flexDirection: "row", alignItems: "center", gap: space.md },
  meetingIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, minWidth: 0 },
  stack: { gap: space.sm },
  fabSpace: { height: 80 },
}));
