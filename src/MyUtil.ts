import crypto from "crypto";
import { User } from "./entity/User";
import { Admin } from "./entity/Admin";
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

	validPassword = async (user: User, password: string) => {
		throw new Error("Method not implemented.");
	};

	async getNewToken<T>(_class: { new (): T }, admin: Admin): Promise<T> {
		const t: T = new _class();

		_.mergeWith(t, {
			token: await my_util.getSha256("" + crypto.randomBytes(32)),
			createdAt: new Date(),
			updatedAt: new Date(),
			userId: admin.id
		});

		return t;
	}
}

export const my_util = new MyUtil();
