import { eveChannel } from "eve/channels/eve";
import { httpBasic, localDev, placeholderAuth, vercelOidc } from "eve/channels/auth";

// Set DEMO_PASSWORD on the Vercel project to open the deployed agent to a
// browser or curl with HTTP Basic auth (username: demo). Without it, the
// scaffold placeholder keeps production routes closed, which is the safe default.
const demoPassword = process.env.DEMO_PASSWORD;

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    demoPassword
      ? httpBasic({ username: "demo", password: demoPassword }, { realm: "launchpad" })
      : placeholderAuth(),
  ],
});
