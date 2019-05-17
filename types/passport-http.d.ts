export class BasicStrategy {
	constructor(options: any, verify?: any);
	name: any;
	authenticate(req: any): any;
}
export class DigestStrategy {
	constructor(options: any, secret: any, validate: any);
	name: any;
	authenticate(req: any): any;
}
