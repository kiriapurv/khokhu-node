//Currently plugin manager shows list of plugins of each type
var PluginManager = function (context) {
    this.context = context;
    this.login = new(require("../manager-index/login"))(context);
};

PluginManager.prototype.processRequest = function (request, onComplete) {
    this.onComplete = onComplete;
    var options = {
        plugins: global.plugins.plugins,
        page: "plugins"
    };
    var context = this.context;
    this.login.checkForLogin(request, onComplete, function doWork() {
        context.libs.renderer.render("manager/src/plugins-manager/views/index.jade", options, function (err, html) {
            if (err) console.log(err);
            onComplete({
                responseCode: ((err) ? 500 : 200),
                headers: {}
            }, ((err) ? err : html));
        }, {
            cache: false
        });
    });
};

module.exports = PluginManager;