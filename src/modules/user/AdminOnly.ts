import { MiddlewareFn } from "type-graphql";
import { MyContext } from "MyContext";
import { OAuthUser } from "../../entity/OAuthUser";
import _ from "lodash";
import { my_util } from "../../../src/MyUtil";

const logDebug = my_util.getLogger(module, "DEBUG", true);
const logError = my_util.getLogger(module, "ERROR", true);

export const AdminOnly: MiddlewareFn<MyContext> = async ({ context: { req } }, next) => {
	logDebug.enabled && logDebug("AdminOnly:: req.session:", req.session);

	logDebug.enabled && logDebug("AdminOnly:: req.user:", req.user);

	// @ts-ignore
	let userId;

	if (req.user && req.user.scope && req.user.scope.indexOf("admin") >= 0) {
		userId = req.user.userId;
	}

	logDebug.enabled && logDebug("AdminOnly:: userId", userId);

	if (!userId) {
		throw new Error("Insufficient privileges");
	}

	const user = await OAuthUser.findOne({ where: { userId } });

	logDebug.enabled && logDebug("AdminOnly:: user:", user);

	if (!user) {
		throw new Error("Insufficient privileges");
	}

	await next();
};
