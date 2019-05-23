import crypto from "crypto";
import { OAuthUser } from "./entity/OAuthUser";
import _ from "lodash";
import debug from "debug";

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

	getLogger(module, level: "INFO" | "DEBUG" | "WARN" | "ERROR", enabled?: boolean): debug {
		const logger = require("debug")(module && module.filename && module.filename.split("/").pop() + ":" + level);

		if (level !== "ERROR") {
			logger.log = console.log.bind(console);
			logger.enabled = enabled;
		}

		return logger;
	}

	getLoggers(module, level: number): { logDebug?: debug; logWarn?: debug; logError?: debug; logInfo?: debug } {
		const levels = ["ERROR", "WARN", "INFO", "DEBUG"];

		const ret = {} as { logDebug?: debug; logWarn?: debug; logError?: debug; logInfo?: debug };

		levels.slice(0, level + 1).map(level => {
			// @ts-ignore
			ret["log" + _.upperFirst(level.toLowerCase())] = this.getLogger(module, level, level !== "DEBUG");
		});

		return ret;
	}
}

export const my_util = new MyUtil();
