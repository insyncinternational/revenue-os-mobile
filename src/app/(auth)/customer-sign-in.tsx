import { useLocalSearchParams } from "expo-router";
import { CustomerSignInForm } from "@/portal/CustomerSignInForm";

/** "I'm a customer" from the sign-in screen (or a link with ?business=code). */
export default function CustomerSignIn() {
  const { business } = useLocalSearchParams<{ business?: string }>();
  return <CustomerSignInForm initialBusiness={business} />;
}
