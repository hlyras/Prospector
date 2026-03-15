const API = {
	verifyResponse(res) {
		if (res.unauthorized) {
			alert(res.unauthorized);
			if (res.path) {
				return window.location.href = res.path;
			}
			return window.location.href = '/login';
		};

		if (res.msg) {
			lib.message(res.msg);
			return true;
		};

		return false;
	},
	response: async (func, param, element) => {
		let response = null;

		if (element == "none") {
			response = await func(param);
		}

		else {
			lib.loader.init(element);
			response = await func(param);
			lib.loader.stop(element);
		}

		if (!response) { return false; }
		return response;
	}
};