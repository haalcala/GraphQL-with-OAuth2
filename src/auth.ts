import passport from "passport";
import { BasicStrategy } from "passport-http";
import { Strategy as ClientPasswordStrategy } from "passport-oauth2-client-password";
import { Strategy as BearerStrategy } from "passport-http-bearer";
import { my_util } from "./MyUtil";

import _ from "lodash";

import oauth2orize from "oauth2orize";
import { OAuthUser } from "./entity/OAuthUser";
import { ensureAdmin } from "./modules/auth/ensureAdmin";
import { IAUTH_PROVIDER } from "./modules/auth/OAuthHelper";

const LocalStrategy = require("passport-local");

const { logDebug, logError } = my_util.getLoggers(module, 4);

logDebug.enabled = true;

export const _passport = passport;

export const configure = async (express_app, auth_provider: IAUTH_PROVIDER) => {
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

		try {
			const _user = await auth_provider.getUser(user.userId);

			done(null, { userId: _user.userId, scope: _user.scope, harold_serialised_user: 2222 });
		} catch (error) {
			done(error);
		}
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

			// if (password === "password" && /[a-zA-z0-9]{40}/.test(username)) {
			// 	logDebug.enabled && logDebug("It looks like an APIKEY");

			// 	const apikey = await ApiKey.findOne({
			// 		where: { apiKey: username }
			// 	});

			// 	if (apikey) {
			// 		logDebug.enabled && logDebug("It is an API KEY!");

			// 		let client = await OauthClient.findOne({
			// 			where: { clientId: apikey.userId }
			// 		});

			// 		return done(null, {
			// 			loggedIn: true,
			// 			roles: client && client.scope
			// 		});
			// 	}
			// }

			// let client = await OauthClient.findOne({
			// 	where: { clientId: username }
			// });

			// logDebug.enabled && logDebug("client", client);

			// if (!client) {
			// 	return done(null, client);
			// }

			// const valid = await bcrypt.compare(password, client.clientSecret);

			// if (valid) {
			// 	return done(null, client);
			// }

			// return done(null, client);

			done(new Error("not implemented"));
		})
	);

	passport.use(
		new ClientPasswordStrategy(async (clientId, clientSecret, done) => {
			logDebug.enabled && logDebug("ClientPasswordStrategy!!!!!!, clientId", clientId, "clientSecret", clientSecret);

			try {
				const client = await auth_provider.verifyClient(clientId, clientSecret);

				logDebug.enabled && logDebug("ClientPasswordStrategy!!!!!!, client", client);

				return done(null, client);
			} catch (err) {
				done(err);
			}
		})
	);

	passport.use(
		new BearerStrategy(async (accessToken, done) => {
			logDebug.enabled && logDebug("BearerStrategy!!!!!!, accessToken", accessToken);

			try {
				const token = await auth_provider.verifyAccessToken(accessToken);

				const user = await auth_provider.getUser(token.userId);

				const ret = { userId: user.userId, scope: user.scope, harold_serialised_user: 1 };

				logDebug.enabled && logDebug("Returning user:", ret);

				done(null, ret);
			} catch (err) {
				logError(err);
				done(err);
			}
		})
	);

	/************************************************************************************************/

	/************************************************************************************************/
	/*						OAUTH SERVER 															*/
	/************************************************************************************************/

	// create OAuth 2.0 server
	var oauth_server = oauth2orize.createServer();

	// Exchange username & password for access token.
	oauth_server.exchange(
		oauth2orize.exchange.password(async (client, username, password, scope, done) => {
			logDebug.enabled && logDebug("11111 oauth2orize.exchange.password(async (client, username, password, scope, done) => {", client, username, password, scope);

			try {
				const { user, sessionId } = await auth_provider.verifyUser(username, password);

				const { accessToken, refreshToken } = await auth_provider.getNewTokens(client, user, sessionId);

				done(null, accessToken.token, refreshToken.token, {
					expires_in: TokenExpiry
				});
			} catch (err) {
				done(err);
			}
		})
	);

	// Exchange code for access token.
	oauth_server.exchange(
		oauth2orize.exchange.code(async (client: any, code: string, redirectURI: string, done) => {
			try {
				logDebug.enabled && logDebug("2222 oauth2orize.exchange.code(async (client, code, redirectURI, done) => {", client, code, redirectURI);

				logDebug.enabled && logDebug("Trying to confirm code:", code);

				const codeToken = await auth_provider.verifyAccessToken(code, "code");

				logDebug.enabled && logDebug("codeToken:", codeToken);

				console.log("Generating new token");

				const user = await auth_provider.getUser(codeToken.userId);

				logDebug.enabled && logDebug("user:", user);

				const { accessToken, refreshToken } = await auth_provider.getNewTokens(client, user, codeToken.sessionId);

				logDebug.enabled && logDebug("accessToken:", accessToken);
				logDebug.enabled && logDebug("refreshToken:", refreshToken);

				done(null, accessToken.token, refreshToken.token, {
					expires_in: TokenExpiry
				});
			} catch (e) {
				logError(e);
				done(e);
			}
		})
	);

	// Exchange refreshToken for access token.
	oauth_server.exchange(
		oauth2orize.exchange.refreshToken(async (client, token, scope, done) => {
			logDebug.enabled && logDebug("2222 oauth2orize.exchange.refreshToken(async (client, token, scope, done) => {", client, token, scope);

			const _refreshToken = await auth_provider.getRefreshToken(token, true);

			const user = await auth_provider.getUser(_refreshToken.userId);

			if (!user) {
				if (logError.enabled) logError("User Not Found!");
				return done(null, false);
			}

			const { accessToken, refreshToken } = await auth_provider.getNewTokens(client, user);

			logDebug.enabled && logDebug("accessToken:", accessToken, "refreshToken:", refreshToken);

			done(null, accessToken.token, refreshToken.token, {
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
		// logDebug.enabled && logDebug("/oauth/authorize:: req:", req);
		logDebug.enabled && logDebug("/oauth/authorize:: req.headers:", req.headers);
		logDebug.enabled && logDebug("/oauth/authorize:: req.body:", req.body);

		try {
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

			const client = await auth_provider.getClient(client_id);

			if (!client) {
				return res.send(503, "Invalid 'client_id'");
			}

			const { user, sessionId } = await auth_provider.verifyUser(username, password);

			const accessToken = await auth_provider.createCode(client, user, sessionId);

			const redirect_to = redirect_uri + (redirect_uri.indexOf("?") > 0 ? "&" : "?") + grant_type + "=" + accessToken.token;

			logDebug.enabled && logDebug("redirect_to:", redirect_to);

			res.redirect(redirect_to);
		} catch (err) {
			logError(err);
			return res.send(503, err.toString());
		}
	});

	var middleware = function(req, res, next) {
		logDebug.enabled && logDebug("--------------------- middleware!!!");
		logDebug.enabled && logDebug("--------------------- middleware!!!");
		logDebug.enabled && logDebug("--------------------- middleware!!! req.headers", req.headers);

		if (req.headers.authorization && req.headers.authorization.indexOf("Bearer ") === 0) {
			passport.authenticate("bearer", function(err, user, info) {
				logDebug.enabled && logDebug("middleware:: arguments", arguments);

				req.user = user;

				if (err) {
					return res.send(401, err.toString());
				}

				next();
			})(req, res, next);
		} else {
			next();
		}
	};

	express_app.post("/graphql", middleware);

	express_app.get("/oauth/account", passport.authenticate("bearer", { session: false }), ensureAdmin("/login"), async (req, resp, next) => {
		// logDebug.enabled && logDebug("/oauth/account:: req:", req);

		if (req.user) {
			const user = await auth_provider.getUser(req.user.userId);

			logDebug.enabled && logDebug("user:", user);

			if (!user) {
				next();
			}

			return resp.send(_.pick(user, ["userId", "createdAt", "updatedAt", "email"]));
		}

		next();
	});
};
