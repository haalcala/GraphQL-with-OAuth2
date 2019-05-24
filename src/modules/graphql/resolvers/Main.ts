import util from "util";

import { Resolver, Mutation, Arg, Query, Authorized, Ctx, UseMiddleware } from "type-graphql";
import { MyContext } from "MyContext";
import { OauthClient } from "../../../entity/OauthClient";
import { OAuthUser } from "../../../entity/OAuthUser";
import { AdminOnly } from "../../user/AdminOnly";
import { oauth_helper } from "../../../modules/auth/OAuthHelper";
import { my_util } from "../../../MyUtil";

const { logDebug, logError } = my_util.getLoggers(module, 4);

logDebug.enabled = true;

@Resolver()
export class Main {
	@Query(() => OAuthUser)
	@Authorized()
	async account(@Ctx() ctx): Promise<OAuthUser> {
		logDebug.enabled && logDebug("acount::");
		const user = await OAuthUser.findOne({ where: { userId: ctx.req.session && ctx.req.session.userId } });

		return user;
	}

	@Mutation(() => Boolean)
	@Authorized()
	async logout(@Ctx() ctx: MyContext): Promise<Boolean> {
		console.log("logout::");
		return new Promise((resolve, reject) => {
			// @ts-ignore
			ctx.req.session!.destroy(err => {
				console.log("err:", err);

				if (err) return reject(err);

				ctx.res.clearCookie(process.env.COOKIE_NAME || "jssessionid");

				return resolve(true);
			});
		});

		return true;
	}

	@Mutation(() => OauthClient)
	@UseMiddleware(AdminOnly)
	async createOAuthAccess(@Ctx() ctx: MyContext): Promise<OauthClient> {
		const admin = await OAuthUser.findOne({ where: { userId: ctx.req.session.userId } });

		if (!admin) {
			throw new Error("Invalid session");
		}

		return await oauth_helper.createAuthClient({ clientId: admin.userId });
	}

	@Mutation(() => OAuthUser)
	@UseMiddleware(AdminOnly)
	async createUserAccess(@Ctx() ctx: MyContext, @Arg("username") username: string, @Arg("password") password: string): Promise<OAuthUser> {
		const admin = await oauth_helper.createUser(username, password, ["user"]);

		if (!admin) {
			throw new Error("Invalid session");
		}

		return admin;
	}

	@Mutation(() => OAuthUser)
	async login(@Arg("username") username: string, @Arg("password") password: string, @Ctx() ctx: MyContext): Promise<OAuthUser> {
		try {
			const oauthUser = await oauth_helper.authenticateUser({ username, password });

			ctx.req.session.userId = oauthUser.userId;

			return oauthUser;
		} catch (e) {
			logError(e);

			throw new Error("Invalid user/password");
		}
	}

	@Query(() => [OAuthUser])
	@UseMiddleware(AdminOnly)
	async getUsers(): Promise<OAuthUser[]> {
		return OAuthUser.find();
	}
}
