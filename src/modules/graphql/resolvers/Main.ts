import util from "util";

import { User } from "../../../entity/User";
import { my_util } from "../../../MyUtil";
import { Resolver, Mutation, Arg, Query, Authorized, Ctx, UseMiddleware } from "type-graphql";
import { MyContext } from "MyContext";
import { OauthClient } from "../../../entity/OauthClient";
import { Admin } from "../../../entity/Admin";
import shortid = require("shortid");
import { AdminOnly } from "../../user/AdminOnly";

@Resolver()
export class Main {
	@Query(() => [User])
	@UseMiddleware(AdminOnly)
	async getUsers(): Promise<User[]> {
		const users = await User.find();

		return users;
	}

	async getUserByEmail(email: string): Promise<User> {
		return await User.findOne({ where: { email } });
	}

	async getUserById(userId: string): Promise<User> {
		return await User.findOne(userId);
	}

	@Query(() => User)
	@Authorized()
	async account(@Ctx() ctx): Promise<User> {
		const user = await this.getUserById(ctx.req.session.userId);

		return user;
	}

	@Mutation(() => User)
	async login(@Arg("email") email: string, @Arg("password") password: string, @Ctx() ctx): Promise<User> {
		const user = await this.getUserById(ctx.req.session.userId);

		if (!user) {
			return null;
		}

		ctx.req.session.userId = user.id;

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
		const admin = await Admin.findOne(ctx.req.session.userId);

		if (!admin) {
			throw new Error("Invalid session");
		}

		const oauthClient = new OauthClient();

		oauthClient.clientId = admin.adminId;
		oauthClient.salt = shortid.generate();
		oauthClient.clientSecret = await my_util.getSha256(`${oauthClient.clientId}.${oauthClient.salt}`);
		oauthClient.createdAt = oauthClient.updatedAt = new Date();
		await oauthClient.save();

		return oauthClient;
	}

	@Mutation(() => Admin)
	async loginAdmin(@Arg("username") username: string, @Arg("password") password: string, @Ctx() ctx: MyContext): Promise<Admin> {
		const admin = await Admin.findOne({ where: { adminId: username } });

		if (!admin) {
			throw new Error("Access denied");
		}

		ctx.req.session.userId = ctx.req.session.adminId = admin.id;

		return admin;
	}
}
