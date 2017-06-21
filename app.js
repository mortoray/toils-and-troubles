//this setup is an ugly hack to avoid passing `router` as a dependency everywhere
exports.router = undefined
exports.setRouter = function( nrouter ) {
	exports.router = nrouter
}

