var sqlitedb = require('sqlite3').verbose();
/*
    SQLite database plugin
*/
var SQLite = function (context) {
    this.context = context;
};

//Returns database for given file name, MAKE SURE TO CLOSE DB AT END
SQLite.prototype.getDB = function (name) {
    return new this.DB(name);
};

//DB Class, provides abstract methods to store and retreive data
SQLite.prototype.DB = function (name) {
    this.name = name;
};

//Creates table in give database
//Porivde JSON object for columns as  { columnName : dataType, columnName : dataType  }
SQLite.prototype.DB.prototype.createTable = function (tableName, columns) {
    var queryProto = "create table if not exists " + tableName + "(#);";
    var cols = [];
    for (var column in columns) {
        cols.push(column + " " + columns[column])
    }
    var query = queryProto.replace("#", cols.join());
    var db = this.getDatabase();
    db.run(query);
    db.close();
};

SQLite.prototype.DB.prototype.store = function (tableName, columnData, callBack) {

    var queryProto = "insert into " + tableName + " (#1) values (#2);";
    var cols = [];
    var vals = [];
    for (var column in columnData) {
        cols.push(column);
        vals.push("'" + columnData[column] + "'");
    }
    var query = queryProto.replace("#1", cols.join()).replace("#2", vals.join());
    var db = this.getDatabase();
    db.run(query, callBack);
    db.close();
};

SQLite.prototype.DB.prototype.get = function (tableName, whereData, callBack) {

    var queryProto = "select * from " + tableName + " where #;"
    var cols = [];
    for (var column in whereData) {
        cols.push(column + whereData[column]);
    }
    var query = queryProto.replace("#", cols.join(" AND "));
    var db = this.getDatabase();
    db.get(query, callBack);
    db.close();
};

SQLite.prototype.DB.prototype.delete = function (tableName, whereData, callBack) {

    var queryProto = "delete from " + tableName + " where #";
    var cols = [];
    for (var column in whereData) {
        cols.push(column + whereData[column]);
    }
    var query = queryProto.replace("#", cols.join(" AND "));
    var db = this.getDatabase();
    db.run(query, callBack);
    db.close();

};

SQLite.prototype.DB.prototype.getDatabase = function () {
    return new sqlitedb.Database(__dirname + "/../dbs/" + this.name + ".db");
};

module.exports = SQLite;