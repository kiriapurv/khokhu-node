//Session helper provides mechanism to create, delete, update and store information in session
//Session is stored in NeDB database rather than Redis to reduce dependencies
var SessionHelper = function (context) {
    this.context = context;
};

SessionHelper.prototype.logSession = function (params, onComplete) {
    var db = this.context.db.nedb.getDB("Sessions");
    db.store({
        session_id: params.sessionId,
        timestamp: params.timestamp,
        role: params.role,
        ip_address: params.ipAddress
    }, onComplete);
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

//Tells if provided sessionId+ip is loggedin or not
SessionHelper.prototype.isLoggedIn = function (request, onComplete) {

    var existingSession = getSession(request.header("Cookie"));
    //Get client's ip address
    var ip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;

    if (!existingSession) {
        onComplete(false);
    } else {
        this.getSession({
            sessionId: existingSession,
            ipAddress: ip
        }, function afterGettingSession(err, rows) {
            if (err || !rows) {
                onComplete(false);
            } else {
                if (rows.session_id) {

                    if (rows.timestamp < ((new Date().getTime()) - 1000 * 3600)) {
                        onComplete(false);
                    } else {
                        onComplete(true);
                    }

                } else {
                    onComplete(false);
                }
            }
        });
    }
};

//Removes from db and logouts user
SessionHelper.prototype.logout = function (sessionId, onComplete) {
    var db = this.context.db.nedb.getDB("Sessions");
    db.delete({
        session_id: sessionId
    }, function (err, resp) {
        onComplete({
            responseCode: 302,
            headers: {
                Location: "/manager"
            }
        }, "");
    });
};

//Retrieves information about session
SessionHelper.prototype.getSession = function (params, onComplete) {
    var db = this.context.db.nedb.getDB("Sessions");
    db.get({
        session_id: params.sessionId,
        ip_address: params.ipAddress
    }, onComplete);
};
//Lifecycle init, create database here
//Database name is Sessions.db
//Table name is sessions
//Table fields 
// session_id : primary key : no auto increament & manually set
// timestamp : timestamp
// user_type : admin, developer etc
// client_ip : ip address of the client
SessionHelper.prototype.init = function (context) {

};
//Called at end of lifecycle
SessionHelper.prototype.end = function (context) {

};

module.exports = SessionHelper;