import { useEffect, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { Redirect, router } from "expo-router";
import { AGENCY_HOME } from "@/features/agency/navigate";
import { useMyAgencies } from "@/features/agency/useAgency";
import { t } from "@/i18n";
import { Button } from "@/ui/Button";
import { Building, LogOut } from "@/ui/icons";
import { Screen } from "@/ui/Screen";
import { AgencyHomeSkeleton } from "@/features/agency/AgencyHomeSkeleton";
import { TodaySkeleton } from "@/features/today/TodaySkeleton";
import { EmptyState } from "@/ui/States";
import { initialMode, pickAgency } from "@/features/agency/agency";
import { useAppMode } from "./mode";
import { useSession } from "./sessionStore";
import { useWorkspaceBootstrap } from "./workspace";

/**
 * In front of the workspace tabs. Agency members land in their agency's area (unless they chose a client's
 * workspace); everyone else sees the tabs once a workspace is selected, or "no workspace yet".
 */
export function TabsGate({ children }: { children: ReactNode }) {
  const { noWorkspace, loading } = useWorkspaceBootstrap();
  const signOut = useSession((s) => s.signOut);
  const mode = useAppMode((s) => s.mode);
  const remembered = useAppMode((s) => s.agencyId);
  const agencies = useMyAgencies();
  const list = agencies.data?.agencies;
  const agencyId = list ? pickAgency(remembered, list) : null;

  // First time on this phone: agency members start in their agency. A person no longer in any agency goes
  // back to their workspace.
  useEffect(() => {
    if (!list) return;
    const { enterAgency, enterWorkspace } = useAppMode.getState();
    if (mode == null) {
      if (initialMode(list.length) === "agency" && agencyId) enterAgency(agencyId);
      else enterWorkspace();
    } else if (mode === "agency" && !agencyId) enterWorkspace();
  }, [list, mode, agencyId]);

  if (mode === "agency" && agencyId) return <Redirect href={AGENCY_HOME} />;

  // The same placeholder as the screen that comes next, so a sign-in shows one loader, not two: Today for a
  // workspace, the agency home otherwise (agency staff are the ones who wait here for their agencies).
  if (loading || (mode == null && agencies.isPending)) {
    return mode === "workspace" ? (
      <Screen fixed>
        <TodaySkeleton />
      </Screen>
    ) : (
      <AgencyHomeSkeleton />
    );
  }
  if (noWorkspace) {
    // No workspace of their own (an agency member before opening a client, or an invite not accepted yet).
    const agencyStaff = (list?.length ?? 0) > 0;
    return (
      <Screen fixed>
        <View style={styles.center}>
          <EmptyState
            icon={Building}
            title={agencyStaff ? t("workspace.pickClientTitle") : t("workspace.noWorkspaceTitle")}
            message={agencyStaff ? t("workspace.pickClientMessage") : t("workspace.noWorkspaceMessage")}
            actionLabel={agencyStaff ? t("agency.backToAgency") : t("workspace.title")}
            onAction={() => {
              if (agencyStaff && agencyId) useAppMode.getState().enterAgency(agencyId);
              else router.push("/switcher");
            }}
          />
          <Button label={t("more.signOut")} variant="ghost" icon={LogOut} onPress={() => void signOut()} style={styles.signOut} />
        </View>
      </Screen>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center" },
  signOut: { alignSelf: "center" },
});
