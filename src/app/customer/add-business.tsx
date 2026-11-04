import { router } from "expo-router";
import { CustomerSignInForm } from "@/portal/CustomerSignInForm";

/** Sign in to another business's portal (customers of several businesses keep one session each). */
export default function AddBusiness() {
  return <CustomerSignInForm onSignedIn={() => router.back()} />;
}
