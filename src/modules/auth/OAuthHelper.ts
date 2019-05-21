import { OAuthUser } from "../../entity/OAuthUser";
import shortid = require("shortid");
import { my_util } from "../../../src/MyUtil";
import { OauthClient } from "../../entity/OauthClient";

const logDebug = my_util.getLogger(module, "DEBUG", true);

class OAuthHelper {
	constructor(options) {}

	async createAdminUser(username: string, password: string) {
		const admin = await this.createUser(username, password, ["admin"]);
	}

	async createUser(username: string, password: string, scope: string[] = ["user"]) {
		const admin = new OAuthUser();

		admin.adminId = username;
		admin.email = "";
		admin.salt = shortid.generate();
		admin.password = await my_util.getSha256(`${admin.adminId}.${admin.salt}.${password}`);
		admin.createdAt = admin.updatedAt = new Date();
		admin.scope = scope;

		await admin.save();

		return admin;
	}

	async createAuthClient({ clientId }) {
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

		const oauthUser = await OAuthUser.findOne({ adminId: username });

		logDebug("oauthUser", oauthUser);

		if (!oauthUser) {
			throw new Error("Invalid user");
		}

		if ((await my_util.getSha256(`${oauthUser.adminId}.${oauthUser.salt}.${password}`)) !== oauthUser.password) throw new Error("Invalid password");

		return oauthUser;
	}
}

export const oauth_helper = new OAuthHelper({});
