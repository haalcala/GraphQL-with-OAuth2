// OAuthClient for testing

var util = require("util");
var request = require("request");

var debug = require("debug")("OAuthClient");

var async = require("async");

debug.log = console.log.bind(console);
debug.enabled = true;

export default class OAuthClient {
	oauth_user: string;
	oauth_secret: string;
	oauth_pass: string;
	url: string;
	oauth_data: { token_type: string; access_token: string };
	token_type: string;
	access_token: string;

	constructor(options: {
		oauth_user: string;
		oauth_secret: string;
		oauth_pass: string;
		oauth_data: { token_type: string; access_token: string };
		token_type: string;
		access_token: string;
		oauth_base_url: string;
	}) {
		console.log("OAuthClient:: options", options);

		this.oauth_user = options.oauth_user;
		this.oauth_secret = options.oauth_secret;
		this.oauth_pass = options.oauth_pass;

		this.url = options.oauth_base_url;
	}

	init(callback) {}

	async post(end_point, params) {
		var tasks = [];

		if (!this.oauth_data) {
			tasks.push(done => {
				this.authenticate()
					.then(() => done())
					.catch(done);
			});
			// tasks.push(this.authenticate);
		}

		return util
			.promisify(async.series)(tasks)
			.then(result => {
				// if (debug.enabled) debug("err", err, "result", result);

				// debug("this", this);

				return new Promise((resolve, reject) => {
					var post_data = {
						url: this.url + "/" + end_point,
						json: {
							data: params
						},
						headers: {
							Authorization: this.oauth_data.token_type + " " + this.oauth_data.access_token
						}
					};

					debug(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>", this.url + "/" + end_point);
					debug("post_data", JSON.stringify(post_data));

					request.post(post_data, (err, result) => {
						debug("<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< err", err, "result", JSON.stringify(result.body || result));

						if (err) {
							return reject(err);
						}

						resolve(result && result.body);
					});
				});
			});
	}

	get() {}

	async authenticate() {
		return new Promise((resolve, reject) => {
			debug("authenticating .... url:", this.url);

			const request_option = {
				url: this.url + "/oauth/token",
				json: {
					grant_type: "password",
					client_id: this.oauth_user,
					client_secret: this.oauth_secret,
					username: this.oauth_user,
					password: this.oauth_pass
				},
				headers: {
					// Authorization:
					// 	"Basic " +
					// 	new Buffer(
					// 		"0000000000111111111122222222223333333333:password"
					// 	).toString("base64")
				}
			};

			console.log("request_option:", request_option);

			request.post(request_option.url, request_option, (err, result) => {
				if (debug.enabled) debug("err", err, "result", JSON.stringify(result.body || request));

				if (err) {
					return reject(err);
				}

				if (result && result.body && result.body.access_token) {
					this.oauth_data = result.body;
				}

				resolve(result);
			});
		});
	}
}
