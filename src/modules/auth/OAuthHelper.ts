import { OAuthUser } from "../../entity/OAuthUser";
import shortid = require("shortid");
import { my_util } from "../../../src/MyUtil";
import { OauthClient } from "../../entity/OauthClient";

const logDebug = my_util.getLogger(module, "DEBUG", true);
const logInfo = my_util.getLogger(module, "INFO", true);

class OAuthHelper {
	constructor(options) {}

	async init() {
		logInfo("Initialising OAuthHelper ...");
		// create the first admin user
		if ((await OAuthUser.count()) === 0) {
			logInfo("Creating first OAuthUser");
			await oauth_helper.createAdminUser(process.env.INITIAL_ADMIN_USERNAME, process.env.INITIAL_ADMIN_PASSWORD);
		}

		if ((await OauthClient.count()) === 0) {
			logInfo("Creating first OAuthClient ...");
			await this.createAuthClient({ clientId: process.env.INITIAL_ADMIN_USERNAME });
		}
	}

	async getOAuthUserByUserId(userId: string) {
		if (!userId) {
			throw new Error("Missing required parameter 'id' for getOAuthUserById");
		}

		const admin = await OAuthUser.findOne({ where: { userId } });

		return admin;
	}

	async createAdminUser(username: string, password: string) {
		const admin = await this.createUser(username, password, ["admin"]);
	}

	async createUser(username: string, password: string, scope: string[] = ["user"]): Promise<OAuthUser> {
		logDebug.enabled && logDebug("createUser::");

		const admin = new OAuthUser();

		admin.userId = username;
		admin.email = "";
		admin.salt = shortid.generate();
		admin.password = await my_util.getSha256(`${admin.userId}.${admin.salt}.${password}`);
		admin.createdAt = admin.updatedAt = new Date();
		admin.scope = scope;

		await admin.save();

		return admin;
	}

	async createAuthClient({ clientId }: { clientId: string }) {
		const oauthClient = new OauthClient();

		oauthClient.clientId = clientId;
		oauthClient.salt = shortid.generate();
		oauthClient.clientSecret = await my_util.getSha256(`${oauthClient.clientId}.${oauthClient.salt}`);
		oauthClient.createdAt = oauthClient.updatedAt = new Date();
		await oauthClient.save();

		return oauthClient;
	}

	async authenticateUser({ username, password }): Promise<OAuthUser> {
		logDebug("username", username, "password:", password);

		const oauthUser = await OAuthUser.findOne({ where: { userId: username } });

		logDebug("oauthUser", oauthUser);

		if (!oauthUser) {
			throw new Error("Invalid user");
		}

		if ((await my_util.getSha256(`${oauthUser.userId}.${oauthUser.salt}.${password}`)) !== oauthUser.password) throw new Error("Invalid password");

		return oauthUser;
	}
}

export const oauth_helper = new OAuthHelper({});
