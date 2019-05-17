import { MiddlewareFn } from "type-graphql";
import { MyContext } from "MyContext";
import { Admin } from "../../../src/entity/Admin";
import _ from "lodash";

export const AdminOnly: MiddlewareFn<MyContext> = async ({ context: { req } }, next) => {
	console.log("req.session:", req.session);

	console.log("req.user:", req.user);

	// @ts-ignore
	const adminId = _.at(req, "user.userId")[0] || req.session.adminId;

	console.log("adminId", adminId);

	if (!adminId) {
		throw new Error("Insufficient privileges");
	}

	const admin = await Admin.findOne(adminId);

	console.log("AdminOnly:: admin:", admin);

	if (!admin) {
		throw new Error("Insufficient privileges");
	}

	await next();
};
