import { MiddlewareFn } from "type-graphql";
import { MyContext } from "MyContext";
import { OAuthUser } from "../../entity/OAuthUser";
import _ from "lodash";
import { my_util } from "../../MyUtil";

const { logDebug, logError } = my_util.getLoggers(module, 4);

export const UserOnly: MiddlewareFn<MyContext> = async ({ context: { req } }, next) => {
	logDebug.enabled && logDebug("UserOnly:: req.session:", req.session);

	logDebug.enabled && logDebug("UserOnly:: req.user:", req.user);

	// @ts-ignore
	let userId;

	if (req.user && req.user.scope && req.user.scope.indexOf("user") >= 0) {
		userId = req.user.userId;
	}

	logDebug.enabled && logDebug("UserOnly:: userId", userId);

	if (!userId) {
		throw new Error("Insufficient privileges");
	}

	const user = await OAuthUser.findOne({ where: { userId } });

	logDebug.enabled && logDebug("UserOnly:: user:", user);

	if (!user) {
		throw new Error("Insufficient privileges");
	}

	await next();
};
