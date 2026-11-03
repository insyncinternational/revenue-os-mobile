import { Redirect } from "expo-router";

/**
 * Developer-only: the component gallery. `__DEV__` is false in release builds, so the bundler drops this
 * branch and with it the gallery and its sample data; a deep link here goes back to Today.
 */
export default function GalleryRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- required only in development builds
  const Gallery = (require("@/dev/Gallery") as typeof import("@/dev/Gallery")).default;
  return <Gallery />;
}
