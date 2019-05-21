import { Request } from "express";
import { OAuthUser } from "../src/entity/OAuthUser";

export interface RequestSession extends Request {
	admin?: OAuthUser;
	session?: any;
	user?: OAuthUser;
}
