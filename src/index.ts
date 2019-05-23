import "reflect-metadata";

import "dotenv/config";

import { createConnection } from "typeorm";

import path from "path";
import express from "express";

import session from "express-session";

// uncomment the follow to enable session via redis
// import connect_redis from "connect-redis";

import { ApolloServer, ApolloServerExpressConfig } from "apollo-server-express";
import { configure, _passport } from "./auth";
import _ = require("lodash");
import { buildSchema } from "type-graphql";
import cors = require("cors");
import bodyParser from "body-parser";
import { oauth_helper } from "./modules/auth/OAuthHelper";
import { OAuthUser } from "./entity/OAuthUser";
import { my_util } from "./MyUtil";

const { logDebug, logWarn, logInfo } = my_util.getLoggers(module, 4);

const startServer = async () => {
	logInfo("Starting server ...");
	if (!process.env.INITIAL_ADMIN_USERNAME) {
		throw new Error("Missing required configuration INITIAL_ADMIN_USERNAME");
	}
	if (!process.env.INITIAL_ADMIN_PASSWORD) {
		throw new Error("Missing required configuration INITIAL_ADMIN_PASSWORD");
	}
	if (!process.env.EXPRESS_SESSION_SECRET) {
		throw new Error("Missing required configuration EXPRESS_SESSION_SECRET");
	}

	const schema = await buildSchema({
		resolvers: [__dirname + "/entity/**/*.ts", __dirname + "/modules/graphql/resolvers/**/*.ts"],
		authChecker: ({ root, args, context: { req }, info }, roles) => {
			logDebug.enabled && logDebug("authChecker::");
			return !!req.session.userId;
		}
	});

	// logDebug.enabled&& logDebug("schema:", schema);

	const apollo_server_opts = {
		schema,
		context: ({ req, res }) => ({ req, res })
	} as ApolloServerExpressConfig;

	if (process.env.ENABLE_GRAPHQL_PLAYGROUND) {
		apollo_server_opts.playground = apollo_server_opts.introspection = !!process.env.ENABLE_GRAPHQL_PLAYGROUND;
	}

	const server = new ApolloServer(apollo_server_opts);

	await createConnection({
		type: "mongodb",
		host: process.env.MONGODB_HOST || "localhost",
		port: (process.env.MONGODB_PORT && parseInt(process.env.MONGODB_PORT)) || 27017,
		username: process.env.MONGODB_USER || "",
		password: process.env.MONGODB_PASS || "",
		database: process.env.MONGODB_DB || "GraphQLWithOAuth2",
		synchronize: true,
		logging: true,
		entities: ["src/entity/**/*.ts"],
		migrations: ["src/migration/**/*.ts"],
		subscribers: ["src/subscriber/**/*.ts"],
		cli: {
			entitiesDir: "src/entity",
			migrationsDir: "src/migration",
			subscribersDir: "src/subscriber"
		}
	});

	await oauth_helper.init();

	const app = express();

	app.use(require("morgan")("dev"));

	app.use((req, res, next) => {
		logDebug.enabled && logDebug("1111 ------------------------------------------------------------------------------------------");
		logDebug.enabled && logDebug("1111 ------------------------------------------------------------------------------------------");
		logDebug.enabled && logDebug("1111 ------------------------------------------------------------------------------------------");
		// logDebug.enabled&& logDebug("req", req);
		logDebug.enabled && logDebug("1111 req.headers", req.headers);
		logDebug.enabled && logDebug("1111 req.body", req.body);
		logDebug.enabled && logDebug("1111 req.session", req.session);
		logDebug.enabled && logDebug("1111 req.user", req.user);
		next();
	});

	app.use(bodyParser.urlencoded({ extended: false }));
	app.use(bodyParser.json());
	app.use(express.static(path.join(__dirname, "../../public")));

	const whitelist = ["http://localhost:4003", "http://localhost:4002"];

	app.use(
		cors({
			// origin: (origin, cb) => {
			// 	logDebug.enabled && logDebug("--------------------------------------------- CORS check!");
			// 	if (whitelist.indexOf(origin) !== -1) {
			// 		cb(null, true);
			// 	} else {
			// 		logWarn("Not allowed by CORS origin: " + origin);
			// 		cb(new Error("Not allowed by CORS origin: " + origin));
			// 	}
			// },
			credentials: true
		})
	);

	configure(app);

	// uncomment the following to enable session via redis
	// const RedisStore = connect_redis(session);

	app.use(
		session({
			// @ts-ignore
			// uncomment the following to enable session via redis
			// store: new RedisStore({ client: redisClient }),
			saveUninitialized: false,
			resave: false,
			name: process.env.COOKIE_NAME || "jssessionid",
			secret: process.env.EXPRESS_SESSION_SECRET,
			cookie: {
				domain: process.env.WEBSITE_DOMAIN || undefined,
				httpOnly: false,
				secure: process.env.NODE_ENV === "production",
				maxAge: 600000,
				path: "/"
			}
		})
	);

	app.use(async (req, res, next) => {
		if (!req.user && req.session && req.session.userId) {
			req.user = await oauth_helper.getOAuthUserByUserId(req.session.userId);
		}

		next();
	});

	app.use((req, res, next) => {
		logDebug.enabled && logDebug("2222 ------------------------------------------------------------------------------------------");
		logDebug.enabled && logDebug("2222 ------------------------------------------------------------------------------------------");
		logDebug.enabled && logDebug("2222 ------------------------------------------------------------------------------------------");
		// logDebug.enabled&& logDebug("req", req);
		logDebug.enabled && logDebug("2222 req.headers", req.headers);
		logDebug.enabled && logDebug("2222 req.body", req.body);
		logDebug.enabled && logDebug("2222 req.session", req.session);
		logDebug.enabled && logDebug("2222 req.user", req.user);
		next();
	});

	app.use(express.static(__dirname + "../../public"));

	server.applyMiddleware({
		app
	});

	const port = (process.env.PORT && parseInt(process.env.PORT)) || 4003;

	app.listen({ port }, () => logDebug.enabled && logDebug(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`));
};

startServer().catch(err => {
	logDebug.enabled && logDebug("index.ts:: err:", err);
});
