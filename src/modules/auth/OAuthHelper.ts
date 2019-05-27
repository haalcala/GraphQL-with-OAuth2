import { OAuthUser } from "../../entity/OAuthUser";
import shortid = require("shortid");
import { my_util } from "../../../src/MyUtil";
import { OauthClient } from "../../entity/OauthClient";
import { AccessToken } from "../../entity/AccessToken";
import { RefreshToken } from "../../entity/RefreshToken";

const { logDebug, logInfo } = my_util.getLoggers(module, 4);

logDebug.enabled = true;

export interface IAUTH_PROVIDER {
	createCode(client: OauthClient, user: OAuthUser, sessionId?: string): Promise<AccessToken>;
	getClient(client_id: string): Promise<OauthClient>;
	getRefreshToken(token: string, remove_if_found: boolean): Promise<RefreshToken>;
	getNewTokens(client: OauthClient, user: OAuthUser, sessionId?: string): PromiseLike<{ accessToken: AccessToken; refreshToken: RefreshToken }>;
	verifyUser(username: string, password: string): Promise<{ user: OAuthUser; sessionId?: string }>;
	verifyAccessToken(accessToken: string, type?: "code"): Promise<AccessToken>;
	getUser(userId: string): Promise<OAuthUser>;
	verifyClient?(clientId: string, clientSecret: string): Promise<OauthClient>;
	createUser(username: string, password: string, scope: string[]): Promise<OAuthUser>;
	createAuthClient({ clientId, title }: { clientId: string; title: string });
}

interface IOAUTHHELPER_OPTIONS {
	auth_handler: IAUTH_PROVIDER;
}

class OAuthHelper {
	auth_handler: IAUTH_PROVIDER;

	constructor() {}

	async init() {
		logInfo("Initialising OAuthHelper ...");
		// create the first admin user
		if ((await OAuthUser.count()) === 0) {
			logInfo("Creating first OAuthUser");
			await oauth_helper.createAdminUser(process.env.INITIAL_ADMIN_USERNAME, process.env.INITIAL_ADMIN_PASSWORD);
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
		const admin = await this.auth_handler.createUser(username, password, ["admin"]);

		return admin;
	}

	async createAuthClient({ clientId, title }: { clientId: string; title: string }) {
		const oauthClient = await this.auth_handler.createAuthClient({ clientId, title });

		return oauthClient;
	}

	async authenticateUser({ username, password }): Promise<OAuthUser> {
		logDebug.enabled && logDebug("username", username, "password:", password);

		const { user } = await this.auth_handler.verifyUser(username, password);

		return user;
	}
}

export const oauth_helper = new OAuthHelper();
