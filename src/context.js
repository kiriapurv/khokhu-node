//Context in initialized for each request
//Context class
var Context = function (config) {

    var self = this;

    this.config = config;

    //Session id available
    this.sessionId = config.sessionId;

    //Get plugins listing
    this.plugins = global.plugins.getPlugins(this);

    //Initialize database plugin
    this.db = this.plugins.database;

    //Initialize plugins support for each type
    this.session = new this.Session(this);
    this.service = new this.Service(this);
    this.apiprocessor = new this.ApiProcessor(this);
    this.gateway = new this.Gateway(this);

    //Service stack is list of services which has been called, top of the stack is last called service in this context
    this.serviceStack = [];

    //Temporary data storage
    this.datastore = {};

    this.pluginsPath = __dirname + "/../" + global.pluginsDir.enabled;

    //Libs
    this.libs = this.plugins.libs;
};

Context.prototype.createContext = function (config) {
    new Context(config);
};

//Temporary data storage, (non persistent storage, for faster data access)
Context.prototype.storeData = function (key, data) {
    this.datastore[key] = data;
};
//Returns non persitent storage value
Context.prototype.getData = function (key) {
    return this.datastore[key];
};
//@return last used service name
Context.prototype.getRecentService = function () {
    return this.serviceStack[this.serviceStack.length - 1];
};

//#####Session class
//----------------
//Each session plugin has to implement following methods
Context.prototype.Session = function (context) {
    this.context = context;
    this.plugin = context.plugins.session;
};

//Initiate session
Context.prototype.Session.prototype.init = function (sessionId) {
    this.plugin.init(sessionId);
};
//Store key,value pair in session
Context.prototype.Session.prototype.store = function (key, data) {
    this.plugin.store(key, data);
};
//Get data for given key from session
Context.prototype.Session.prototype.get = function (key, response) {
    this.plugin.get(key, response);
};
//Get all key value pairs in session
Context.prototype.Session.prototype.getAll = function (response) {
    this.plugin.getAll(response);
};

//#####Service class
Context.prototype.Service = function (context) {
    this.plugins = context.plugins.service;
    this.context = context;
};

//Process Request
Context.prototype.Service.prototype.processRequest = function (name, request, onComplete) {
    if (name && name != "null") {
        this.context.serviceStack.push(name);
        this.plugins[name].processRequest(request, onComplete);
    }
};

//#####APIProcessor class
Context.prototype.ApiProcessor = function (context) {
    this.context = context;
    this.plugins = context.plugins.apiProcessor;
};
//API Processor can only modify the data which is passed to it
//Process Request
Context.prototype.ApiProcessor.prototype.processRequest = function (request) {
    this.plugins.forEach(function (plugin) {
        plugin.processRequest(request);
    });
};
//Process Response
Context.prototype.ApiProcessor.prototype.processResponse = function (response) {
    this.plugins.forEach(function (plugin) {
        plugin.processResponse(response);
    });
};

//#####Gateway class
Context.prototype.Gateway = function (context) {
    this.context = context;
    this.plugins = context.plugins.gateway;
};
//Gateway can only modify the data which is passed to it
//Process Request
Context.prototype.Gateway.prototype.processRequest = function (request) {
    this.plugins.forEach(function (plugin) {
        plugin.processRequest(request);
    });
};
//Process Response
Context.prototype.Gateway.prototype.processResponse = function (response) {
    this.plugins.forEach(function (plugin) {
        plugin.processResponse(response);
    });
};

//Nodejs's crypto package is required for generating unique sha1 hash
var crypto = require("crypto");
//Provides unique hash for current timestamp
Context.prototype.getHash = function () {
    var shasum = crypto.createHash("sha1");
    shasum.update("" + new Date().getTime());
    return shasum.digest("hex");
};

module.exports = Context;