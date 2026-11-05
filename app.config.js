// Extends app.json (which stays the main config). Android push needs Firebase's google-services.json:
// it is used when it sits next to this file, or when an EAS file variable GOOGLE_SERVICES_JSON points at it.
// Without it the app still builds; Android phones just can't get push notifications.
const { existsSync } = require("node:fs");
const { join } = require("node:path");

module.exports = ({ config }) => {
  const local = join(__dirname, "google-services.json");
  const file = process.env.GOOGLE_SERVICES_JSON || (existsSync(local) ? "./google-services.json" : undefined);
  if (!file) return config;
  return { ...config, android: { ...config.android, googleServicesFile: file } };
};
