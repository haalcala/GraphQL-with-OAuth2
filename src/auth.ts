import passport from "passport";
import { BasicStrategy } from "passport-http";
import { Strategy as ClientPasswordStrategy } from "passport-oauth2-client-password";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { my_util } from "./MyUtil";
import { OauthClient } from "./entity/OauthClient";
import { AccessToken } from "./entity/AccessToken";
import { RefreshToken } from "./entity/RefreshToken";
import bcrypt from "bcryptjs";

const LocalStrategy = require("passport-local");

import _ from "lodash";
import { ApiKey } from "./entity/ApiKey";

import oauth2orize from "oauth2orize";
import crypto from "crypto";
import { OAuthUser } from "./entity/OAuthUser";
import { ensureAdmin } from "./modules/auth/ensureAdmin";

const logDebug = require("debug")(
	module.filename
		.split("/")
		.pop()
		.split(".")[0] + ":DEBUG"
);
const logError = require("debug")(
	module.filename
		.split("/")
		.pop()
		.split(".")[0] + ":ERROR"
);

logDebug.log = console.log.bind(console);

logError.enabled = true;
logDebug.enabled = true;

export const _passport = passport;

export const configure = async express_app => {
	/************************************************************************************************/
	/*						PASSPORT IMPLEMENTATION 												*/
	/************************************************************************************************/

	var TokenExpiry = process.env.OAUTH_TOKEN_EXPIRY || 3600;

	express_app.use(passport.initialize());
	express_app.use(passport.session());

	passport.serializeUser((user: { userId: string }, done) => {
		// The user object in the arguments is the result of your authentication process
		// (see step 9)

		logDebug.enabled && logDebug("---------------------- passport.serializeUser:: user:", user);

		done(null, user);

		// If your user object is large or has transient state,
		// you may want to only store the user id in the session instead:

		// done(null, user.user_id)
	});

	passport.deserializeUser(async (user: { userId: string }, done) => {
		// The user object in the arguments is what you have stored in the session

		// If you stored the entire user object when you serialized it to session,
		// you can skip re-quering your user store on every request

		logDebug.enabled && logDebug("---------------------- passport.deserializeUser:: user:", user);

		// @ts-ignore
		user = await Admin.findOne(user.userId);

		done(null, user);
	});

	passport.use(
		new LocalStrategy(
			{
				usernameField: "user[email]",
				passwordField: "user[password]"
			},
			async (email, password, done) => {
				logDebug.enabled && logDebug("LocalStrategy:: email:", email, "password:", password);

				const user = await OAuthUser.findOne({ where: { email } });

				if (!user || !user.password) {
					return done(null, false, {
						errors: { "email or password": "is invalid" }
					});
				}

				return done(null, user);
			}
		)
	);

	passport.use(
		new BasicStrategy(async (username, password, done) => {
			logDebug.enabled && logDebug("BasicStrategy!!!!!! username:", username, "password:", password);

			if (password === "password" && /[a-zA-z0-9]{40}/.test(username)) {
				logDebug.enabled && logDebug("It looks like an APIKEY");

				const apikey = await ApiKey.findOne({
					where: { apiKey: username }
				});

				if (apikey) {
					logDebug.enabled && logDebug("It is an API KEY!");

					let client = await OauthClient.findOne({
						where: { clientId: apikey.clientId }
					});

					return done(null, {
						loggedIn: true,
						roles: client && client.scope
					});
				}
			}

			let client = await OauthClient.findOne({
				where: { clientId: username }
			});

			logDebug.enabled && logDebug("client", client);

			if (!client) {
				return done(null, client);
			}

			const valid = await bcrypt.compare(password, client.clientSecret);

			if (valid) {
				return done(null, client);
			}

			return done(null, client);
		})
	);

	passport.use(
		new ClientPasswordStrategy(async (clientId, clientSecret, done) => {
			logDebug.enabled && logDebug("ClientPasswordStrategy!!!!!!, clientId", clientId, "clientSecret", clientSecret);

			const client = await OauthClient.findOne({
				where: { clientId: clientId }
			});

			logDebug.enabled && logDebug("ClientPasswordStrategy!!!!!!, client", client);

			if (!client) {
				const err = new Error("Client ID not found " + "invalid_client");
				if (logError.enabled) logError("Client ID not found: invalid_client");
				return done(err);
			}

			if (client.clientSecret !== clientSecret) {
				const err = new Error("Client Password Invalid " + "invalid_client");
				if (logError.enabled) logError("Client Password Invalid: invalid_client");
				return done(err);
			}

			return done(null, client);
		})
	);

	passport.use(
		new BearerStrategy(async (accessToken, done) => {
			logDebug.enabled && logDebug("BearerStrategy!!!!!!, accessToken", accessToken);

			const token = await AccessToken.findOne({
				where: { token: accessToken }
			});

			if (!token) {
				if (logError.enabled) logError("Token Not Found: " + accessToken);
				return done(null, false);
			}

			if (!token) {
				return done(null, false);
			}

			if (Math.round((Date.now() - token.createdAt.getTime()) / 1000) > TokenExpiry) {
				await token.remove();

				if (logDebug.enabled) logDebug.enabled && logDebug("Token Expired: " + accessToken);

				return done(null, false);
			}

			const user = await OAuthUser.findOne(token.userId);

			if (!user) {
				if (logError.enabled) logError("Unknown user: " + token.userId);

				return done(null, false);
			}

			done(null, { userId: user.id, harold_serialised_user: 1 });
		})
	);

	/************************************************************************************************/

	/************************************************************************************************/
	/*						OAUTH SERVER 															*/
	/************************************************************************************************/

	// create OAuth 2.0 server
	var oauth_server = oauth2orize.createServer();

	// oauth_server.grant(
	// 	oauth2orize.grant.code(function(client, redirectURI, user, ares, done) {
	// 		logDebug.enabled && logDebug("------------------------ oauth2orize.grant.code:: ");

	// 		var code = utils.uid(16);

	// 		// var ac = new AuthorizationCode(code, client.id, redirectURI, user.id, ares.scope);
	// 		// ac.save(function(err) {
	// 		// 	if (err) {
	// 		// 		return done(err);
	// 		// 	}
	// 		return done(null, code);
	// 		// });
	// 	})
	// );

	// Exchange username & password for access token.
	oauth_server.exchange(
		oauth2orize.exchange.password(async (client, username, password, scope, done) => {
			logDebug.enabled && logDebug("11111 oauth2orize.exchange.password(async (client, username, password, scope, done) => {", client, username, password, scope);

			const user = await OAuthUser.findOne({
				where: { adminId: username }
			});

			// logDebug.enabled && logDebug("user.password:", user.password);
			// logDebug.enabled && logDebug(
			// 	"await my_util.getSha256(`${user.adminId}.${user.salt}.${password}`:",
			// 	await my_util.getSha256(`${user.adminId}.${user.salt}.${password}`)
			// );

			if (!user || user.password != (await my_util.getSha256(`${user.adminId}.${user.salt}.${password}`))) {
				if (logError.enabled) logError("Invalid username/password: invalid_client");
				const err = new Error("Invalid username/password " + "invalid_client");
				return done(err);
			}

			var refreshTokenValue = crypto.randomBytes(32).toString("base64");

			var tokenValue = crypto.randomBytes(32).toString("base64");

			let accesstoken = await AccessToken.findOne({
				where: {
					userId: user.adminId,
					clientId: client.clientId
				}
			});

			if (accesstoken) {
				var expired = Math.round((Date.now() - accesstoken.createdAt.getTime()) / 1000) > TokenExpiry;
				if (!expired) {
					tokenValue = accesstoken.token;
					if (logDebug.enabled) logDebug.enabled && logDebug("tokenValue using existing...");
				}
			} else {
				accesstoken = new AccessToken();
				accesstoken.createdAt = accesstoken.updatedAt = new Date();
			}

			let refreshtoken = await RefreshToken.findOne({
				where: {
					userId: user.adminId,
					clientId: client.clientId
				}
			});

			if (refreshtoken) {
				var expired = Math.round((Date.now() - refreshtoken.createdAt.getTime()) / 1000) > TokenExpiry;

				if (!expired) {
					refreshTokenValue = refreshtoken.token;
					if (logDebug.enabled) logDebug.enabled && logDebug("refreshTokenValue using existing...");
				} else {
					await refreshtoken.remove();

					refreshtoken = null;
				}
			}

			if (!refreshtoken) {
				refreshtoken = new RefreshToken();
				refreshtoken.createdAt = refreshtoken.updatedAt = new Date();
			}

			// RefreshToken.remove({ userId: user.userId, clientId: client.clientId }, function (err) {
			// 	if (err) {
			// 		if (logError.enabled) logError(JSON.stringify(err));
			// 		return done(err);
			// 	}
			//
			// 	RefreshToken.save({ token: refreshTokenValue, clientId: client.clientId, userId: user.userId, created: Date.now() }, function (err) {
			// 		if (err) { return done(err); }
			// 	});
			// });

			_.mergeWith(refreshtoken, {
				token: refreshTokenValue,
				clientId: client.clientId,
				userId: user.adminId,
				updatedAt: Date.now()
			});

			await refreshtoken.save();

			_.mergeWith(accesstoken, {
				token: tokenValue,
				clientId: client.clientId,
				userId: user.adminId,
				updatedAt: Date.now()
			});

			await accesstoken.save();

			done(null, tokenValue, refreshTokenValue, {
				expires_in: TokenExpiry
			});
		})
	);

	// Exchange refreshToken for access token.
	oauth_server.exchange(
		oauth2orize.exchange.code(async (client: any, code: string, redirectURI: string, done) => {
			logDebug.enabled && logDebug("2222 oauth2orize.exchange.code(async (client, code, redirectURI, done) => {", client, code, redirectURI);

			logDebug.enabled && logDebug("Trying to confirm code:", code);
			const accessToken = await AccessToken.findOne({ where: { token: code } });

			logDebug.enabled && logDebug("accessToken:", accessToken);

			try {
				if (!accessToken || accessToken.grant_type !== "code" || client.clientId != accessToken.userId) {
					return done(null, false);
				}
			} finally {
				if (accessToken) {
					logDebug.enabled && logDebug("Removing accessToken:", accessToken);
					await accessToken.remove();
				}
			}

			const admin = await OAuthUser.findOne(client.adminId);

			const new_accessToken = await my_util.getNewToken<AccessToken>(AccessToken, admin);
			const refreshToken = await my_util.getNewToken<RefreshToken>(RefreshToken, admin);

			await new_accessToken.save();
			await refreshToken.save();

			done(null, new_accessToken.token, refreshToken.token, {
				expires_in: TokenExpiry
			});
		})
	);

	// Exchange refreshToken for access token.
	oauth_server.exchange(
		oauth2orize.exchange.refreshToken(async (client, refreshToken, scope, done) => {
			logDebug.enabled && logDebug("2222 oauth2orize.exchange.refreshToken(async (client, refreshToken, scope, done) => {", client, refreshToken, scope);

			let token = await RefreshToken.findOne({
				where: { token: refreshToken }
			});

			if (token) {
				await token.remove();
			}

			const user = await OAuthUser.findOne({ where: { adminId: client.clientId } });

			if (!user) {
				if (logError.enabled) logError("User Not Found!");
				return done(null, false);
			}

			token = await my_util.getNewToken<RefreshToken>(RefreshToken, user);

			await token.save();

			const accessToken = await my_util.getNewToken<AccessToken>(AccessToken, user);

			await accessToken.save();

			logDebug.enabled && logDebug("accessToken:", accessToken, "token:", token);

			done(null, accessToken.token, token.token, {
				expires_in: TokenExpiry
			});
		})
	);

	// token endpoint
	const oauth2token = [
		(req, res, next) => {
			// logDebug.enabled && logDebug("req:", req);
			// logDebug.enabled && logDebug("req.body:", req.body);
			logDebug.enabled && logDebug("12084720874280194720472047210934872834782394071203471029487");

			next();
		},

		passport.authenticate(["basic", "oauth2-client-password", "oauth2"], {
			session: false
		}),

		oauth_server.token(),
		oauth_server.errorHandler()
	];

	/************************************************************************************************/

	express_app.post("/oauth/token", oauth2token);

	express_app.post("/oauth/authorize", async (req, res) => {
		logDebug.enabled && logDebug("/oauth/authorize:: req:", req);

		const { username, password, redirect_uri, grant_type, client_id } = req.body;

		const fields = ["username", "password", "redirect_uri", "grant_type", "client_id"];

		for (let fieldi in fields) {
			if (!req.body[fields[fieldi]]) {
				return res.send(503, `Missing required parameter '${fields[fieldi]}'`);
			}
		}

		if (grant_type != "code") {
			return res.send(503, "Missing or invalid 'grant_type'");
		}

		const oauthClient = await OauthClient.findOne({ where: { clientId: client_id } });

		if (!oauthClient) {
			return res.send(503, "Invalid 'client_id'");
		}

		const admin = await OAuthUser.findOne({ where: { adminId: username } });

		logDebug.enabled && logDebug("/oauth/authorize:: admin:", admin);

		if (!admin) {
			return res.send(401, "Access denied");
		}

		if (!admin || admin.password != (await my_util.getSha256(`${admin.adminId}.${admin.salt}.${password}`))) {
			if (logError.enabled) logError("Invalid username/password: invalid_client");
			const err = new Error("Invalid username/password " + "invalid_client");
			return res.send(401, "Access denied");
		}

		const accessToken = new AccessToken();

		accessToken.token = await my_util.getSha256("" + crypto.randomBytes(32));
		accessToken.createdAt = accessToken.updatedAt = new Date();
		accessToken.userId = admin.adminId;
		accessToken.grant_type = grant_type;

		await accessToken.save();

		const redirect_to = redirect_uri + (redirect_uri.indexOf("?") > 0 ? "&" : "?") + grant_type + "=" + accessToken.token;

		logDebug.enabled && logDebug("redirect_to:", redirect_to);

		res.redirect(redirect_to);
	});

	// express_app.get(
	// 	"/login",
	// 	passport.authenticate("oauth2", {
	// 		session: true,
	// 		successReturnToOrRedirect: "/"
	// 	})
	// );

	var middleware = function(req, res, next) {
		logDebug.enabled && logDebug("--------------------- middleware!!!");
		logDebug.enabled && logDebug("--------------------- middleware!!!");
		logDebug.enabled && logDebug("--------------------- middleware!!! req.headers", req.headers);

		if (req.headers.authorization && req.headers.authorization.indexOf("Bearer ") === 0) {
			passport.authenticate("bearer", function(err, user, info) {
				logDebug.enabled && logDebug("middleware:: arguments", arguments);

				req.user = user;

				next();
			})(req, res, next);
		} else {
			next();
		}
	};

	// express_app.post("/graphql", passport.authenticate("bearer", { session: false }));
	express_app.post("/graphql", middleware);

	express_app.get("/oauth/account", passport.authenticate("bearer", { session: false }), ensureAdmin("/login"), async (req, resp, next) => {
		logDebug.enabled && logDebug("/oauth/account:: req:", req);

		if (req.user) {
			const user = await OAuthUser.findOne(req.user.userId);

			logDebug.enabled && logDebug("user:", user);

			if (!user) {
				next();
			}

			return resp.send(_.pick(user, ["adminId", "createdAt", "updatedAt", "email"]));
		}

		next();
	});
};
