var Storage = require("nedb");

var NeDB = function (context) {
    this.context = context;
}

//Returns database for given file name, MAKE SURE TO CLOSE DB AT END
NeDB.prototype.getDB = function (name) {
    return new this.DB(name);
};

//DB Class, provides abstract methods to store and retreive data
NeDB.prototype.DB = function (name) {
    this.name = name;
    this.db = this.getDatabase();
};

NeDB.prototype.DB.prototype.store = function (insertData, callBack) {
    this.db.insert(insertData, callBack);
};

NeDB.prototype.DB.prototype.get = function (whereData, callBack) {
    this.db.findOne(whereData, callBack);
};

NeDB.prototype.DB.prototype.getAll = function (whereData, callBack) {
    this.db.find(whereData, callBack);
};

NeDB.prototype.DB.prototype.delete = function (whereData, callBack) {
    this.db.remove(whereData, {
        multi: true
    }, callBack);
};

NeDB.prototype.DB.prototype.getDatabase = function () {
    return new Storage({
        filename: __dirname + "/../dbs/" + this.name + ".db",
        autoload: true
    });
};


module.exports = NeDB;