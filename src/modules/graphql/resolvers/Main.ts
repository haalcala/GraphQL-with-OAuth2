import util from "util";

import { Resolver, Mutation, Arg, Query, Authorized, Ctx, UseMiddleware } from "type-graphql";
import { MyContext } from "MyContext";
import { OauthClient } from "../../../entity/OauthClient";
import { OAuthUser } from "../../../entity/OAuthUser";
import { AdminOnly } from "../../user/AdminOnly";
import { oauth_helper } from "../../../../src/modules/auth/OAuthHelper";
import { my_util } from "../../../../src/MyUtil";

const logDebug = my_util.getLogger(module, "DEBUG", true);
const logError = my_util.getLogger(module, "ERROR", true);

@Resolver()
export class Main {
	@Query(() => OAuthUser)
	@Authorized()
	async account(@Ctx() ctx): Promise<OAuthUser> {
		const user = await OAuthUser.findOne(ctx.req.session.userId);

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

				ctx.res.clearCookie("oaw");

				return resolve(true);
			});
		});

		return true;
	}

	@Mutation(() => OauthClient)
	@UseMiddleware(AdminOnly)
	async createOAuthAccess(@Ctx() ctx: MyContext): Promise<OauthClient> {
		const admin = await OAuthUser.findOne(ctx.req.session.userId);

		if (!admin) {
			throw new Error("Invalid session");
		}

		return await oauth_helper.createAuthClient({ clientId: admin.adminId });
	}

	@Mutation(() => OAuthUser)
	async login(@Arg("username") username: string, @Arg("password") password: string, @Ctx() ctx: MyContext): Promise<OAuthUser> {
		try {
			const oauthUser = await oauth_helper.authenticateUser({ username, password });

			ctx.req.session.userId = ctx.req.session.adminId = oauthUser.id;

			return oauthUser;
		} catch (e) {
			logError(e);

			throw new Error("Invalid user/password");
		}
	}
}
