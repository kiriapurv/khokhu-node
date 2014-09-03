var restify = require("restify");

/**
 * Restify server plugin
 */
var RestifyServer = function(context) {
    this.context = context;
    this.server = restify.createServer();
    this.server.use(restify.queryParser());
    this.server.use(restify.authorizationParser());
    this.server.use(restify.bodyParser());
    this.server.pre(restify.pre.sanitizePath());
    this.server.use(restify.gzipResponse());
}

/**
 * Required methods
 */
// Get Method
RestifyServer.prototype.get = function(url,callback) {
    this.server.get(url, callback);
};
// Post Method
RestifyServer.prototype.post = function(url, callback) {
    this.server.post(url, callback);
};
// Put Method
RestifyServer.prototype.put = function(url, callback) {
    this.server.put(url, callback);
};
// Delete method
RestifyServer.prototype.delete = function(url, callback) {
    this.server.del(url, callback);
};
//Static files
RestifyServer.prototype.static = function(url, directory) {
    this.server.get(url, restify.serveStatic({
        directory : directory
    }));
};
// Start server
RestifyServer.prototype.start = function(port) {
    this.server.listen(port, function() {
        
    });
};
// Returns server in case of using server specific features
RestifyServer.prototype.getServer = function() {
    return this.server;
};

module.exports = RestifyServer;