import { MiddlewareFn } from "type-graphql";
import { MyContext } from "MyContext";
import { OAuthUser } from "../../entity/OAuthUser";
import _ from "lodash";
import { my_util } from "../../../src/MyUtil";

const logDebug = my_util.getLogger(module, "DEBUG", true);
const logError = my_util.getLogger(module, "ERROR", true);

export const AdminOnly: MiddlewareFn<MyContext> = async ({ context: { req } }, next) => {
	logDebug.enabled && logDebug("req.session:", req.session);

	logDebug.enabled && logDebug("req.user:", req.user);

	// @ts-ignore
	let adminId = req.session.userId;

	if (req.user && req.user.scope && req.user.scope.indexOf("admin") >= 0) adminId = req.user.adminId;

	logDebug.enabled && logDebug("adminId", adminId);

	if (!adminId) {
		throw new Error("Insufficient privileges");
	}

	const admin = await OAuthUser.findOne(adminId);

	logDebug.enabled && logDebug("AdminOnly:: admin:", admin);

	if (!admin) {
		throw new Error("Insufficient privileges");
	}

	await next();
};
