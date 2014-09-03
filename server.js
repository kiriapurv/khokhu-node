var restify = require("restify");
var Context = require(__dirname + "/src/context.js");
var console = require("better-console");
var fs = require("fs");
var settings = require("./settings.json");

global.pluginsDir = settings.pluginsDir;


//Load plugins
if (!global.plugins) {
    global.plugins = new(require(__dirname + "/src/plugins.js"))();
    global.plugins.reload();
}

//Create blank context
var context = new Context({}, null);

function lifeCycleInit() {
    //Calling init in each lifecycle plugin
    for (var pluginKey in global.plugins.plugins.lifecycle) {
        try {
            global.plugins.plugins.lifecycle[pluginKey].init(context);
        } catch (ex) {
            console.log("Error in Lifecycle plugin : " + ex);
            console.log(ex.stack);
        }
    }
}

function lifeCycleEnd() {
    //Calling end in each lifecycle plugin
    for (var pluginKey in global.plugins.plugins.lifecycle) {
        try {
            global.plugins.plugins.lifecycle[pluginKey].end(context);
        } catch (ex) {
            console.log("Error in Lifecycle plugin : " + ex);
            console.log(ex.stack);
        }
    }
}

//Server class

var Server = function () {
    this.plugins = global.plugins.plugins.service;
};
//Start server
Server.prototype.start = function (port) {
    this.serv = restify.createServer();
    this.serv.use(restify.queryParser());
    this.serv.use(restify.authorizationParser());
    this.serv.use(restify.bodyParser());
    this.serv.pre(restify.pre.sanitizePath());
    this.serv.use(restify.gzipResponse());
    var self = this;
    this.serv.get("/", function (req, esp) {
        esp.header("Content-type", "text/html");
        esp.end(fs.readFileSync(__dirname + "/static/index.html", {
            encoding: "utf-8"
        }).replace("###", require(__dirname + "/package").version));
    });

    var serviceTable = [
        ["Service Name", "Method", "URL"]
    ];
    for (var serviceName in this.plugins) {
        var plugin = this.plugins[serviceName];
        var config = plugin.config;
        serviceTable.push([serviceName, config.method, config.url]);
        var self = this;
        var clientHandler = new ClientHandler(plugin);
        var boundHandler = clientHandler.handleClient.bind(clientHandler);
        var url = config.url;
        //Convert URL to Array if its not
        if (url.constructor !== [].constructor) {
            url = [url];
        }
        for (var i in url) {
            switch (config.method) {
            case "post":
                {
                    this.serv.post(url[i], boundHandler);
                }
                break;
            case "put":
                {
                    this.serv.put(url[i], boundHandler);
                }
                break;
            case "get":
                {
                    this.serv.get(url[i], boundHandler);
                }
                break;
            case "delete":
                {
                    this.serv.del(url[i], boundHandler);
                }
                break;
            }
        }
        //Serve static files of plugin
        if (config.static) {
            for (var file in config.static) {
                this.serv.get(new RegExp("/static/" + serviceName + file), restify.serveStatic({
                    directory: __dirname + "/" + global.pluginsDir.enabled + "/" + config.dir + "/" + config.static[file]
                }));
            }
        }
    }
    console.table(serviceTable);
    //Serve static files of packages
    if (global.plugins.plugins.static) {
        for (var file in global.plugins.plugins.static) {
            this.serv.get(new RegExp(file), restify.serveStatic({
                directory: __dirname + "/" + global.pluginsDir.enabled + "/" + global.plugins.plugins.static[file]
            }));
        }
    }
    //Adding global static paths
    this.serv.get(new RegExp("/static/.+"), restify.serveStatic({
        directory: __dirname + "/static"
    }));


    this.serv.listen(port, function () {
        console.log("Khokhu-Node server started at port : " + port);
    });

    //Calling lifecycleinit
    lifeCycleInit();

};

//Add services
Server.prototype._addServices = function (complete) {


    complete();
};
//Client handler provides handing mechanism for service plugins
var ClientHandler = function (plugin) {
    this.plugin = plugin;
    this.handleClient.plugin = this.plugin;
};
//Creates context and calls the service
ClientHandler.prototype.handleClient = function (request, response) {

    var self = this;
    var context = new Context({
        sessionId: request.params.sessionId
    });
    context.service.processRequest(self.plugin.config.serviceName, request, function (params, resp) {
        response.header("Content-type", self.plugin.config.responseType);
        response.writeHead(params.responseCode, params.headers);
        try {
            response.end(resp);
        } catch (exp) {
            response.end("Write Error : " + exp);
            console.log(exp.stack);
        }
    });
};


//Starting servers

var cluster = require("cluster");
var numCPUs = require('os').cpus().length;
var cronWorkerId = 0;
if (cluster.isMaster) {
    //Printing banner
    console.clear();
    console.log(fs.readFileSync(__dirname + "/static/banner.txt", {
        encoding: "utf-8"
    }));
    //0th worker will be handling cron jobs
    for (var i = 0; i < numCPUs; i++) {
        var worker = cluster.fork();
        if (i === 0) {
            worker.send("handleCron");
            cronWorkerId = worker.process.pid;
        }
    }

    //if any worker fails and is handling the cron jobs, this procedure makes sure to reallocate the job to other running worker
    cluster.on('exit', function (worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
        //Create new worker
        var newWorker = cluster.fork();
        if (cronWorkerId == worker.process.pid) {
            newWorker.send("handleCron");
            cronWorkerId = newWorker.process.pid;
        }
    });

} else {

    //Error handling
    process.on('uncaughtException', function (err) {
        console.log('Caught exception: ' + err);
        console.log(err.stack);
    });

    //cleanup is called when
    var cleanUp = function () {
        lifeCycleEnd();
        process.exit();
    };
    var handlingCron = false;
    //Registering to events
    var events = require("events");
    var eventEmitter = new events.EventEmitter();

    eventEmitter.on("tc_exit_event", cleanUp);

    eventEmitter.on("exit", function () {
        eventEmitter.emit("tc_exit_event");
    });
    //catches ctrl+c event
    process.on('SIGINT', function () {
        eventEmitter.emit("tc_exit_event");
    });
    //Handling messages from parent process
    process.on("message", function (message) {
        if (message == "handleCron") {
            handlingCron = true;
            //Starting cron jobs
            var cronList = [];
            console.log("Handling crons : " + process.pid);
            var blankContext = new(require(__dirname + "/src/context.js"))({}, function ready() {
                //Loading cron jobs
                var cronJob = require("cron").CronJob;

                //Starting cron jobs
                for (var cName in global.plugins.plugins.cron) {
                    try {
                        var job = new cronJob({
                            cronTime: global.plugins.plugins.cron[cName].format,
                            onTick: new(global.plugins.plugins.cron[cName].main)(this).execute,
                            start: true
                        });
                        cronList.push(job);
                        job.start();
                    } catch (ex) {
                        console.log(ex.stack);
                    }
                }
            });
        }
    });

    var mServer = new Server();
    mServer.start(9000);
}