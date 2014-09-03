var jade = require("jade");
var fs = require("fs");
//Renderer provides jade rendering mechanism
var Renderer = function (context) {
    this.context = context;
    if (!global.renderCache) {
        global.renderCache = {};
    }
};

Renderer.prototype.render = function (file, data, onComplete, options) {
    data.context = {
        includes: "src/renderer/template.jade"
    };
    data.filename = this.context.pluginsPath + "/" + file;
    if (options && options.cache == false) {
        jade.renderFile(this.context.pluginsPath + "/" + file, data, onComplete);
    } else {
        if (!global.renderCache[this.context.pluginsPath + "/" + file]) {
            global.renderCache[this.context.pluginsPath + "/" + file] = fs.readFileSync(this.context.pluginsPath + "/" + file, 'utf-8');
        }
        var renderCache = global.renderCache[this.context.pluginsPath + "/" + file];
        jade.render(renderCache, data, onComplete);
    }
};

module.exports = Renderer;