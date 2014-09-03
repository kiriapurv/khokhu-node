//Manager front page
var ManagerPage = function (context) {
    this.context = context;
    this.session = new(require("../session-helper"))(context);
};

ManagerPage.prototype.processRequest = function (request, onComplete) {
    var context = this.context;
    console.log(this.getDir());
    this.session.isLoggedIn(request, function (loggedIn) {
        if (loggedIn) {
            onComplete({
                responseCode: 302,
                headers: {
                    "Location": "/manager/api"
                }
            }, "");
        } else {
            context.libs.renderer.render("manager/src/manager-index/views/index.jade", {}, function (err, html) {
                onComplete({
                    responseCode: 200,
                    headers: {}
                }, html);
            }, {
                cache: false
            });
        }
    });
};

module.exports = ManagerPage;