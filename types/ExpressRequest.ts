import { Request } from "express";
import { User } from "../src/entity/User";
import { Admin } from "../src/entity/Admin";

export interface RequestSession extends Request {
	admin?: Admin;
	session?: any;
	user?: User;
}
