import { IAUTH_PROVIDER } from "./OAuthHelper";
import { OauthClient } from "../../entity/OauthClient";
import { OAuthUser } from "../../entity/OAuthUser";
import { AccessToken } from "../../entity/AccessToken";
import { my_util } from "../../MyUtil";
import { RefreshToken } from "../../entity/RefreshToken";

const { logDebug, logError } = my_util.getLoggers(module, 4);

logDebug.enabled = true;

export class DefaultAuthHandler implements IAUTH_PROVIDER {
	TokenExpiry = process.env.OAUTH_TOKEN_EXPIRY || 3600;

	async createCode(client: OauthClient, user: OAuthUser): Promise<AccessToken> {
		const accessToken = await my_util.getNewToken<AccessToken>(AccessToken, client, user);

		accessToken.grant_type = "code";

		accessToken.save();

		return accessToken;
	}

	async getClient(client_id: string): Promise<OauthClient> {
		const client = await OauthClient.findOne({ where: { clientId: client_id } });

		if (!client) {
			throw new Error("Invalid client_id");
		}

		return client;
	}

	async getRefreshToken(token: string, remove_if_found: boolean): Promise<RefreshToken> {
		const refreshToken = await RefreshToken.findOne({ where: { token } });

		if (!refreshToken) {
			throw new Error("Token now found");
		}

		if (remove_if_found) {
			await refreshToken.remove();
		}

		return refreshToken;
	}

	async getNewTokens(client: OauthClient, user: OAuthUser): Promise<{ accessToken: AccessToken; refreshToken: import("../../entity/RefreshToken").RefreshToken }> {
		const accessToken = await my_util.getNewToken<AccessToken>(AccessToken, client, user);
		const refreshToken = await my_util.getNewToken<RefreshToken>(RefreshToken, client, user);

		accessToken.save();
		refreshToken.save();

		return { accessToken, refreshToken };
	}

	async verifyUser(username: string, password: string): Promise<OAuthUser> {
		logDebug.enabled && logDebug("verifyUser:: username:", username, "password:", password);

		const user = await OAuthUser.findOne({
			where: { userId: username }
		});

		logDebug.enabled && logDebug("verifyUser:: user:", user);

		if (!user || user.password != (await my_util.getSha256(`${user.userId}.${user.salt}.${password}`))) {
			if (logError.enabled) logError("Invalid username/password");
			const err = new Error("Invalid username/password");
			throw err;
		}

		return user;
	}

	async verifyAccessToken(accessToken: string, type?: string): Promise<OAuthUser> {
		logDebug.enabled && logDebug("verifyAccessToken:: accessToken:", accessToken, "type:", type);

		const token = await AccessToken.findOne({
			where: { token: accessToken }
		});

		logDebug.enabled && logDebug("verifyAccessToken:: token:", token);

		if (!token) {
			logError.enabled && logError("Token Not Found: " + accessToken);
			throw new Error("Token Not Found: " + accessToken);
		}

		if (Math.round((Date.now() - token.createdAt.getTime()) / 1000) > this.TokenExpiry) {
			await token.remove();

			if (logDebug.enabled) logDebug.enabled && logDebug("verifyAccessToken:: Token Expired: " + accessToken);

			throw new Error("Token Expired: " + accessToken);
		}

		const user = await OAuthUser.findOne({ where: { userId: token.userId } });

		if (!user) {
			logError.enabled && logError("Unknown user: " + token.userId);

			throw new Error("Unknown user: " + token.userId);
		}

		return user;
	}

	async getUser(userId: string): Promise<OAuthUser> {
		const user = await OAuthUser.findOne({ where: { userId } });

		if (!user) {
			throw new Error("Invalid userId");
		}

		return user;
	}

	async verifyClient(clientId, clientSecret): Promise<OauthClient> {
		const client = await OauthClient.findOne({
			where: { clientId: clientId }
		});

		if (!client || client.clientSecret !== clientSecret) {
			throw new Error("Invalid client");
		}

		return client;
	}
}
