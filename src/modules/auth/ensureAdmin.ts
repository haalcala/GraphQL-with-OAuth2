import _ from "lodash";

export const ensureAdmin = options => {
	if (typeof options == "string") {
		options = { redirectTo: options };
	}

	options = options || {};

	var url = options.redirectTo || "/login";
	var setReturnTo = options.setReturnTo === undefined ? true : options.setReturnTo;

	return function(req, res, next) {
		console.log("ensureAdmin:: req.user:", req.user);

		const user = req.user || _.at(req, "session.passport.user")[0];

		console.log("ensureAdmin:: user:", user);

		console.log("ensureAdmin:: req.isAuthenticated", req.isAuthenticated());

		if (!req.isAuthenticated || !req.isAuthenticated()) {
			if (setReturnTo && req.session) {
				req.session.returnTo = req.originalUrl || req.url;
			}
			return res.redirect(url);
		}

		console.log("ensureAdmin:: next");

		next();
	};
};
