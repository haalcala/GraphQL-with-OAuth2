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
		logDebug.enabled && logDebug.enabled && logDebug("createUser::");

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
		logDebug.enabled && logDebug("username", username, "password:", password);

		const { user } = await this.auth_handler.verifyUser(username, password);

		return user;
	}
}

export const oauth_helper = new OAuthHelper();
