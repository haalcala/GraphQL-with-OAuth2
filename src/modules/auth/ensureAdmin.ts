import _ from "lodash";

export const ensureAdmin = options => {
	if (typeof options == "string") {
		options = { redirectTo: options };
	}

	options = options || {};

	var url = options.redirectTo || "/login";
	var setReturnTo = options.setReturnTo === undefined ? true : options.setReturnTo;

	return function(req, res, next) {
		const user = _.at(req, "session.passport.user");

		console.log("ensureAdmin:: user:", user[0]);

		console.log("ensureAdmin:: req.isAuthenticated", req.isAuthenticated);

		if (!req.isAuthenticated || !req.isAuthenticated()) {
			if (setReturnTo && req.session) {
				req.session.returnTo = req.originalUrl || req.url;
			}
			return res.redirect(url);
		}
		next();
	};
};
