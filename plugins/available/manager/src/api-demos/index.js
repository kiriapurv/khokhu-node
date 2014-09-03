var APIDemos = function (context) {
    this.context = context;
    this.login = new(require("../manager-index/login"))(context);
};

APIDemos.prototype.processRequest = function (request, onComplete) {
    var options = {
        page: "api",
        service: global.plugins.plugins.service
    };
    var context = this.context;
    this.login.checkForLogin(request, onComplete, function doWork() {
        context.libs.renderer.render("manager/src/api-demos/views/index.jade", options, function (err, html) {
            if (err) console.log(err);
            onComplete({
                responseCode: ((err) ? 500 : 200),
                headers: {}
            }, ((err) ? err : html));
        });
    });
};

module.exports = APIDemos;