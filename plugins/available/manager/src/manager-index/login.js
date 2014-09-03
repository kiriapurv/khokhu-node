//Authenticates user and provides login access
var Login = function (context) {
    this.context = context;
    this.users = require("../../config").users;
    this.sessionHelper = new(require("../session-helper"))(context);
};
//Extracts session_id stored in cookie header
function getSession(cookieHeader) {
    if (cookieHeader) {
        var data = cookieHeader.toString().split(";");
        for (var i in data) {
            var cookie = data[i].split("=");
            if (cookie[0] == "session")
                return cookie[1];
        }
    }
    return null;
};
//Check if user is logged in or not, if no then redirect to manager login
Login.prototype.checkForLogin = function (request, redirect, onComplete) {

    this.sessionHelper.isLoggedIn(request, function (loggedIn) {
        if (loggedIn) {
            onComplete();
        } else {
            redirect({
                responseCode: 302,
                headers: {
                    Location: "/manager"
                }
            }, "");
        }
    });
};

Login.prototype.processRequest = function (request, onComplete) {
    this.onComplete = onComplete;
    var self = this;
    var userName = request.params.username;
    var password = request.params.password;
    //get client's ip address
    var ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;
    //Get session's id stored in cookie
    var existingSession = getSession(request.header("Cookie"));
    if (request.params.logout) {
        this.sessionHelper.logout(existingSession, onComplete);
    } else if (existingSession) {
        this.sessionHelper.isLoggedIn(request, function (loggedIn) {
            if (loggedIn) {
                onComplete({
                    responseCode: 302,
                    headers: {
                        Location: "/manager/api"
                    }
                }, "LOGGED IN");
            } else {
                self.login({
                    userName: userName,
                    password: password,
                    ip: ip
                });
            }
        });

    } else {
        this.login({
            userName: userName,
            password: password,
            ip: ip
        });
    }
};
//Login new authenticated user
Login.prototype.login = function (params) {
    var onComplete = this.onComplete;
    if (this.users[params.userName] && this.users[params.userName].password === params.password) {
        var role = this.users[params.userName].role;
        var sessionId = this.context.getHash();
        var timestamp = new Date().getTime();
        var expireTime = new Date();
        expireTime.setTime(timestamp + 1000 * 3600);
        //Store in database    
        this.sessionHelper.logSession({
            sessionId: sessionId,
            timestamp: timestamp,
            role: role,
            ipAddress: params.ip
        }, function afterStoring(err, resp) {
            onComplete({
                responseCode: 302,
                headers: {
                    "Set-Cookie": "session=" + sessionId + "; expires=" + expireTime + "; path=/manager",
                    "Location": "/manager/api"
                }
            }, JSON.stringify(resp));
        });
    } else {
        onComplete({
            responseCode: 302,
            headers: {
                "Location": "/manager"
            }
        }, "Error" + params.userName + params.password);
    }
};

module.exports = Login;