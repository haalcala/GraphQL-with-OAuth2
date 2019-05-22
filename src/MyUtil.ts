import crypto from "crypto";
import { OAuthUser } from "./entity/OAuthUser";
import _ from "lodash";

class MyUtil {
	getSha256(string: string, key?: string): string {
		if (key) {
			return crypto
				.createHmac("sha256", key)
				.update(string)
				.digest("hex");
		}

		return crypto
			.createHash("sha256")
			.update(string)
			.digest("hex");
	}

	getSha1 = (string: string) => {
		const shasum = crypto.createHash("sha1");

		shasum.update(string);

		return shasum.digest("hex");
	};

	async getNewToken<T>(_class: { new (): T }, admin: OAuthUser): Promise<T> {
		const t: T = new _class();

		_.mergeWith(t, {
			token: await my_util.getSha256("" + crypto.randomBytes(32)),
			createdAt: new Date(),
			updatedAt: new Date(),
			userId: admin.userId
		});

		return t;
	}

	getLogger(module, level: "INFO" | "DEBUG" | "WARN" | "ERROR", enabled?: boolean) {
		const logger = require("debug")(
			module &&
				module.filename &&
				module.filename
					.split("/")
					.pop()
					.split(".")[0] +
					":" +
					level
		);

		if (level !== "ERROR") {
			logger.log = console.log.bind(console);
			logger.enabled = enabled;
		}

		return logger;
	}
}

export const my_util = new MyUtil();
