// plugin.js is executed once at server lifecycle initialization, it gathers all the plugins and their config in one place.
// It caches all plugin from config/plugins-enabled directory and initializes singleton plugins at server initialization, other normal plugins are initialized at every context initialization
//

// ####Places where plugins can be plugged
// - session    //Only one plugin can exist at a time
// - database   //Only one plugin can exist at a time 
// - service
// - apiProcessor
// - gateway
// - response
// - cron
// - static

// ####Plugin config sample json
//  ```` 
// {
//      "name" : "nameOfPlugin", //Do not use spaces or special characters, treat as variable name
//      "description" : "Description of plugin",
//      "type" : "local",
//      "plugs" : [ "apiProcessor", "gateway" ],
//      "init" : "context", //or "singleton"
//      "main" : "src/plugin_main.js",
//      "depends" : [ "plugin_name", "plugin_name2" ]
//  } ````

//Initialize plugin with directory name of plugin and config of plugin.
var Plugin = function (dirName, config) {
    this.config = config;
    this.config.dir = dirName;
    this.dir = __dirname + "/../" + global.pluginsDir.enabled + "/" + dirName + "/";
    //console.log("Loading plugin : ../config/plugins-enabled/" + dirName + "/" + config.main);
    this.pluginClass = require(this.dir + config.main);
    this.instance = null;
};
//Returns instance of current current plugin.
//If plugin type is context then creates new instance, else returns from global variables
Plugin.prototype.getInstance = function (context) {
    var plugin = new this.pluginClass(context);
    var dir = this.dir;
    var getContextInject = function () {
        return this.context;
    };
    var getDirInject = function () {
        return dir;
    };
    plugin.getContext = getContextInject.bind(plugin);
    plugin.getDir = getDirInject.bind(plugin);
    return plugin;
};
//Returns plugin configs.
Plugin.prototype.getConfig = function () {
    return this.config;
};

//Initialization
var Plugins = function () {
    this.plugins = {
        session: {},
        database: {},
        service: {},
        apiProcessor: {},
        gateway: {},
        response: {},
        static: {},
        cron: {},
        libs: {},
        lifecycle: {}
    };
};

//Loads all plugins from directory plugins-enabled
Plugins.prototype.reload = function () {
    var fs = require("fs");
    var self = this;
    var dirs = fs.readdirSync(__dirname + "/../" + global.pluginsDir.enabled);
    dirs.forEach(function (name) {
        try {
            var conf = require(__dirname + "/../" + global.pluginsDir.enabled + "/" + name + "/config");

            if (conf.session) {
                for (var pN in conf.session) {
                    var plug = new Plugin(name, conf.session[pN]);
                    self.plugins.session[pN] = plug;
                }
            }
            if (conf.database) {
                for (var pN in conf.database) {
                    var plug = new Plugin(name, conf.database[pN]);
                    self.plugins.database[pN] = plug;
                }
            }
            if (conf.service) {
                for (var pN in conf.service) {
                    var plug = new Plugin(name, conf.service[pN]);
                    plug.config.serviceName = pN;
                    self.plugins.service[pN] = plug;
                }
            }
            if (conf.apiProcessor) {
                for (var pN in conf.apiProcessor) {
                    var plug = new Plugin(name, conf.apiProcessor[pN]);
                    self.plugins.apiProcessor[pN] = plug;
                }
            }
            if (conf.gateway) {
                for (var pN in conf.gateway) {
                    var plug = new Plugin(name, conf.gateway[pN]);
                    self.plugins.gateway[pN] = plug;
                }
            }
            if (conf.response) {
                for (var pN in conf.response) {
                    var plug = new Plugin(name, conf.response[pN]);
                    self.plugins.response[pN] = plug;
                }
            }
            if (conf.static) {
                for (var pN in conf.static) {
                    if (!self.plugins.static["/static/" + conf.name + pN])
                        self.plugins.static["/static/" + conf.name + pN] = conf.name + "/" + conf.static[pN];
                }
            }
            if (conf.libs) {
                for (var pN in conf.libs) {
                    var plug = new Plugin(name, conf.libs[pN]);
                    self.plugins.libs[pN] = plug;
                }
            }
            if (conf.lifecycle) {
                for (var pN in conf.lifecycle) {
                    var plug = new Plugin(name, conf.lifecycle[pN]);
                    //Lifecycle plugin's instance is created only once in service startup
                    //It will be directly called by server
                    self.plugins.lifecycle[pN] = plug.getInstance(null);
                }
            }
            if (conf.cron) {
                for (var pN in conf.cron) {
                    if (!self.plugins.cron[conf.cron[pN]])
                        self.plugins.cron[pN] = {
                            format: conf.cron[pN].cronFormat,
                            main: require(__dirname + "/../" + global.pluginsPath.enabled + "/" + name + "/" + conf.cron[pN].main)
                        };
                }
            }

        } catch (err) {
            console.log(err);
        }
    });
};

Plugins.prototype.getPlugins = function (context) {
    var retPlugins = {
        session: {},
        database: {},
        service: {},
        apiProcessor: [],
        gateway: [],
        response: {},
        libs: {}
    };

    var current = null;
    var config = null;
    //Initialize session plugin
    for (var key in this.plugins.session) {
        config = this.plugins.session[key].getConfig();
        current = this.plugins.session[key];
    }
    if (current)
        retPlugins.session = current.getInstance(context);

    //Initialize database plugins
    for (var key in this.plugins.database) {
        config = this.plugins.database[key].getConfig();
        retPlugins.database[key] = this.plugins.database[key].getInstance(context);
    }

    current = null;
    //Initialize services pluginss
    for (var key in this.plugins.service) {
        config = this.plugins.service[key].getConfig();
        retPlugins.service[config.serviceName] = this.plugins.service[key].getInstance(context);
    }

    //Initialize ApiPreprocessor plugins
    for (var key in this.plugins.apiProcessor) {
        config = this.plugins.apiProcessor[key].getConfig();
        retPlugins.apiProcessor[retPlugins.apiProcessor.length] = this.plugins.apiProcessor[key].getInstance(context);
    }

    //Initiating libraries
    for (var key in this.plugins.libs) {
        config = this.plugins.libs[key].getConfig();
        retPlugins.libs[key] = this.plugins.libs[key].getInstance(context);
    }

    for (var key in this.plugins.gateway) {
        config = this.plugins.gateway[key].getConfig();
        retPlugins.gateway[retPlugins.gateway.length] = this.plugins.gateway[key].getInstance(context);
    }

    for (var key in this.plugins.response) {
        config = this.plugins.response[key].getConfig();
        retPlugins.response[retPlugins.response.length] = this.plugins.response[key].getInstance(context);
    }

    return retPlugins;

};

module.exports = Plugins;