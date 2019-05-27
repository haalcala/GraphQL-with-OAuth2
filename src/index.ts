import { startServer } from "./server";
import { my_util } from "./MyUtil";
import { DefaultAuthHandler } from "./modules/auth/DefaultAuthHandler";

const { logDebug, logWarn, logInfo } = my_util.getLoggers(module, 4);

const auth_provider = new DefaultAuthHandler(); // replace this with your custom auth provider

startServer(auth_provider).catch(err => {
	logDebug.enabled && logDebug("index.ts:: err:", err);
});
