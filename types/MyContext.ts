import { Response } from "express";
import { RequestSession } from "ExpressRequest";

export interface MyContext {
	req: RequestSession;
	res: Response;
}
