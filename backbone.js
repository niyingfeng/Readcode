//     Backbone.js 1.0.0

//     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

    // 初始化设置
    // -------------

    // 在局部作用域保存一个指向全局对象的引用 在频繁的使用时可以稍微优化性能
    //(浏览器端为`window` , 服务器端为 `exports`).
    var root = this;

    // 保存变量 'BackBone'的原始值，以便在使用 'noConflict'时重新取出来使用
    var previousBackbone = root.Backbone;

    // 用局部变量保存我们将会使用的数组的方法
    var array = [];
    var push = array.push;
    var slice = array.slice;
    var splice = array.splice;

  // 顶级命名空间. 所有 Backbone 公共类和模块都在该命名空间之下. 将被浏览器或者服务器使用.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // 当前库的版本. `package.json`.
  Backbone.VERSION = '1.0.0';

  // 需要强调, 如果我们是在服务器上，那么 _ 是不存在的. _依赖于 underscroe.js
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // 为实现 Backbone', 保存 jQuery, Zepto, Ender, 
  // 或者 kidding 的 $ 来拓展实现功能（没有也没关系）.
  Backbone.$ = root.jQuery || root.Zepto || root.ender || root.$;

  // 在 无冲突 模式下运行Backbone 
  // 用一个引用指向先前 Backbone 的对象，返回变量 `Backbone`
  
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // 开启 `emulateHTTP`（模拟HTTP） 以支持传统的 HTTP 服务. 
  // 通过设置 '_method' 参数和设置 'X-Http-Method-Override' 头的这个参数可以伪造 'PUT'和'DELETE' 请求
  Backbone.emulateHTTP = false;

  // 开启 `emulateJSON`（模拟JSON） 以支持传统服务器无法直接处理的问题
  // `application/json` 请求 ... 将自身编码为application/x-www-form-urlencoded`发送模型， 而不是直接'model'的表单参数。 
  Backbone.emulateJSON = false;

  // Backbone.Events  Backbone事件
  // ---------------

  // 一个可以被 mix 到任意对象的模块，保证任意对象都可以绑定触发自定义事件
  // 可以使用 `on` 来绑定 和 `off` 解绑一个事件的回调函数
  // `trigger` 触发所有继承了的回调。
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // 对一个事件绑定回调函数. 传递 "all" 则将绑定回调在所有事件触发时调用 
    on: function(name, callback, context) {

      // API 检测 
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;

      //相当于 this._events = this._events || {} 下面语法更容易用来赋值 如下下句
      //在绑定时间的对象中 建立事件池 来进行事件管理
      this._events || (this._events = {}); 

      // name 事件在事件池中的形式（数组形式） 存放当前对象绑定在name的所有事件
      var events = this._events[name] || (this._events[name] = []);
      // 将当前需要绑定的事件 push到事件池中的具体事件名称中
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },
    // 绑定一个只触发一次的事件. 当回调被触发后即便被解绑删除
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;

      // 自定义一个 once 事件
      var once = _.once(function() {

        // 解绑当前对象上 name 上的once事件再进行触发
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // 解绑一个或者多个回调.
    // 如果 `context` 是 null, 移除所有有该函数的回调.
    // 如果 `callback` 是 null, 移除该事件下的所有回调. 
    // 如果 `name` 是 null, 移除所有帮定的回调函数
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;

      // obj.off() 移除所有事件
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      // 使用 underscore 的 获取对象键值方法
      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        // 移除某一事件下的回调
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // 触发一个或多个事件, 触发所有绑定的回调.
    // 除了事件名称，回调函数会被传递'trigger'相同的参数。 
    // (如果你监听了 'all', 会让你的回调函数将事件名称作为第一个参数).
    // obj.trigger("change",function(){});
    // obj.trigger("all",function(eventName){ alert(eventName) });
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // 使这个对象或者所有监听特定事件的对象停止监听该特定的事件
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // 分割事件字符串.
  var eventSplitter = /\s+/;

  // 实现多样式化的事件功能的API 
  //比如现有API中的多名称的"change blur"` 和jquery风格的事件映射 `{change: action}`
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // 处理事件映射
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // 处理空间分割的事件名称.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, 在触发事件时优化内部调用. 尽可能快速到达最有可能的情况
  // (核心的3个 Backbone 事件参数).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // 反转 `on` and `once` 控制版本. 将 *this* 对象监听另外一个对象中的事件
  // 保持对监听的跟踪
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // 向后兼容的名称.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // 允许 `Backbone` 对象 作为全局事件的总线, 为一些边临方便使用.
  _.extend(Backbone, Events);

  // Backbone.Model  模型
  // --------------

  // Backbone **Models** 在框架中是基础的数据对象 --
  // 常常代表你服务器数据库表中的一行.
  // 一个离散的数据块，和一堆对这些数据进行计算转换的有用的相关的方法

  // 使用指定的属性创建一个新的模型. 
  // 会自动生成并分配一个用户id (`cid`)
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    _.extend(this, _.pick(options, modelOptions));
    if (options.parse) attrs = this.parse(attrs, options) || {};
    if (defaults = _.result(this, 'defaults')) {
      attrs = _.defaults({}, attrs, defaults);
    }
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // 如果提供选项列表则直接连接到模型中.
  var modelOptions = ['url', 'urlRoot', 'collection'];

  // 将所有可继承的方法添加到 模型 的原型中.
  _.extend(Model.prototype, Events, {

    // 当前与之前值有变化的  属性散列（哈希）.
    changed: null,

    // 最后一次验证失败的返回值.
    validationError: null,

    // JSON 默认名称 `id` 属性名为 `"id"`. MongoDB 和
    // CouchDB 用户偏向于 `"_id"`.
    idAttribute: 'id',

    // 默认初始化空函数. 
    // 用自己的逻辑初始化重写函数.
    initialize: function(){},

    // 返回一个模型的属性对象的拷贝.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // 默认使用 `Backbone.sync` 代理 
    // 如果需要可以自定义从写
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // 获取属性值
    get: function(attr) {
      return this.attributes[attr];
    },

    // 获取属性的 HTML-escaped 值.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // 若属性值不为 null 或者 undefined 则返回  `true`
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // 在对象上建立模型的属性哈希, 触发 `"change"`. 
    // 这是 模型 的核心操作, 更新数据, 通知那些需要知道 模型 状态变化的对象 
    // backbone 野兽的心脏.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // 处理 `"key", value` 和 `{key: value}` 2种参数形式的情况.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // 执行验证.
      if (!this._validate(attrs, options)) return false;

      // 提取 属性 和 可选项.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // 检测 `id` 变化.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // 设置每一个属性, 更新或者删除当前值.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // 触发所用相应的属性改变.
      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // while 循环 修改将被递归嵌套在'events'事件中
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // 从模型中移除一个属性, 触发 `"change"`. 
    // `unset` 如果属性不存在设置为空
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // 清楚模型中的所有属性，触发 `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // 确保 模型 在上一次更改后再一次更改 `"change"` event.
    // 如果指定了属性名称, 确定属性已经改变.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // 返回一个包含所有改变的属性的对象, 当没有属性被更改，就返回 false.
    // 常用来判断视图块是否需要更新或者那些属性需要保存到后端
    // 未设置的 属性将设置为 undefined.
    // 你也可以针对模型传递一个属性对象来改变,决定是否 *would be* 改变.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // 获取一个属性之前，在最后一次 'change' 事件触发时候的值
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // 获取上一次 `"change"` 事件时所有属性的值.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // 从服务器端获取 模型 . 
    // 如果服务器端的显示的模型与当前属性有区别，那么覆盖并且触发事件"change"`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // 设置属性的哈希, 同步模型到服务器.
    // 如果服务器返回一个有区别的属性散列，那么模型的状态要重新设置
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // 处理 `"key", value` and `{key: value}` 2种参数情况.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // 如果并不在等待队列中并且属性不存在, 保存行为以 `set(attr).save(null, opts)`格式.
      if (attrs && (!options || !options.wait) && !this.set(attrs, options)) return false;

      options = _.extend({validate: true}, options);

      // 舍弃无效的模型 .
      if (!this._validate(attrs, options)) return false;

      // 如果 `{wait: true}` 设置临时属性.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // 在服务器端保存成功后, 客户端可以与服务器端一起更新（可选）
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // 确保属性在同步保存的时候可恢复.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // 恢复属性.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // 去除以及存在在服务器端的模型.
    // 如果集合中原有一个模型，那么去掉就好.
    // 如果 `wait: true` 传递过来, 在移除之前等待服务器响应.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // 模型在服务器端表示的默认的URL -- if you're
    // 如果你在使用 Backbone's 静态方法, 重写此方法来改变将被调用的端点.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** 响应转换成模型上的哈希
    // 默认只是实现通过响应.
    parse: function(resp, options) {
      return resp;
    },

    // 创建一个新的 和当前模型有一样属性的模型.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // 如果一个模型还没有存到服务器，那么他就是新的, 没有id.
    isNew: function() {
      return this.id == null;
    },

    // 检查模型当前是不是有效状态.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // 对下一个完全设置了模型属性的进行验证 
    // 返回'true'. 否则触发 `"invalid"` 事件.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
      return false;
    }

  });

  // 将在模型中使用的 Underscore 方法.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // 代理方式   混入 Underscore 方法  `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection  backbone 集合
  // -------------------

  // 如果模型代表的是单一的数据行, 一个 Backbone 集合 更类似于整一个数据表
  // ... 或者表的某一块。, 或者是有共同关系的多行的集合
  // --所有的信息都在特定的 folder 中, 所有的文件都属于特殊的用户等
  // 为了查找id 集合维护这他们模型的索引

  // 创建一个新的 **Collection**, 可能包含一个具体类型的 `model`.
  // 如果 `comparator` 是被指定, 集合就要保持他们添加删除时候的顺序。.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.url) this.url = options.url;
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // 默认的设置 `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, merge: false, remove: false};

  // 集合默认继承的方法.
  _.extend(Collection.prototype, Events, {

    // 集合默认的模型是 **Backbone.Model**.
    // 常常会被覆盖重写.
    model: Model,

    // 默认初始化空函数. O使用自己的初始化逻辑重写.
    initialize: function(){},

    // 集合的 JSON 展示 是模型属性的数组
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // 默认使用 `Backbone.sync` 代理.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // 添加设置一个或者一系列模型.
    add: function(models, options) {
      return this.set(models, _.defaults(options || {}, addOptions));
    },

    // 移除一个或者一系列模型.
    remove: function(models, options) {
      models = _.isArray(models) ? models.slice() : [models];
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // 更新几个通过  `set`-ing 一系列新模型, 有必要的时候添加新模型,
    // 移除不再存在的模型, 合并已经存在在集合中的模型,
    //  类似于**Model#set**, 通过集合来更新包含数据的核心操作.
    set: function(models, options) {
      options = _.defaults(options || {}, setOptions);
      if (options.parse) models = this.parse(models, options);
      if (!_.isArray(models)) models = models ? [models] : [];
      var i, l, model, attrs, existing, sort;
      var at = options.at;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};

      // 将模型引用空的对象，保证不添加无效模型
      for (i = 0, l = models.length; i < l; i++) {
        if (!(model = this._prepareModel(models[i], options))) continue;

        // 如果有赋值的, 小心防止被添加或者合并到当前的模型.
        if (existing = this.get(model)) {
          if (options.remove) modelMap[existing.cid] = true;
          if (options.merge) {
            existing.set(model.attributes, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }

        // 新的模型, push 进入 `toAdd` list.
        } else if (options.add) {
          toAdd.push(model);

          // 监听 added models' 事件, 
          // 通过 `id` 或者  `cid` 来进行索引模型.
          model.on('all', this._onModelEvent, this);
          this._byId[model.cid] = model;
          if (model.id != null) this._byId[model.id] = model;
        }
      }

      // 适当的时候移除不存在的模型.
      if (options.remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // 在新模型中 如果排序是有必要的话, 更新 `length` 和 splice .
      if (toAdd.length) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          splice.apply(this.models, [at, 0].concat(toAdd));
        } else {
          push.apply(this.models, toAdd);
        }
      }

      // 若适用，适用默认排序.
      if (sort) this.sort({silent: true});

      if (options.silent) return this;

      // 触发 `add` events.
      for (i = 0, l = toAdd.length; i < l; i++) {
        (model = toAdd[i]).trigger('add', model, this, options);
      }

      // 如果集合排序 触发 `sort` events .
      if (sort) this.trigger('sort', this, options);
      return this;
    },

    // 当你想添加或者删除个别的远远多于你所想的时候,
    // 你可以重置整个模型的队列,不触发任何`add` or `remove` 事件
    // 当完成的时候触发 `reset`.
    // 常用于批量操作和性能优化.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // 在集合末尾加入模型.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // 移除集合末尾的模型.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // 在集合头部加入模型.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // 移除集合头部的模型.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // 将集合切割为子 的模型数组.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // 通过id获取模型.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj.cid || obj];
    },

    // 根据给定的索引获取模型.
    at: function(index) {
      return this.models[index];
    },

    // 返回匹配到属性的模型. 用于简单的 `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // 返回匹配属性成功的模型. 常用于简单的 `find` 操作.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // 强制集合 重新排序. 
    // 一般情况下无需调用它, 维持item被加进来时候的次序
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // 基于 `comparator` 的类型来运行.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // 为了维持顺序，索引值最小的应该被插入模型
    sortedIndex: function(model, value, context) {
      value || (value = this.comparator);
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _.sortedIndex(this.models, model, iterator, context);
    },

    // 从集合中每一个模型中取出 一个属性
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // 对这个集合获取默认设置的模型, 获取到后重置集合.
    // 如果传递了 `reset: true` , 响应的数据会通过 `reset` 而不是 `set` 方法.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // 在该集合中创建一个新的模型. Add the model to the
    // 立即向集合中加入模型, 除非参数 `wait: true` 需要等待服务器通过
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** 转换响应到一个将要被添加到集合的响应列表中.
    // 默认实现只是通过.
    parse: function(resp, options) {
      return resp;
    },

    // 创建一个和该集合模型一致的列表.
    clone: function() {
      return new this.constructor(this.models);
    },

    // 重置内部状态的私有方法. 在集合第一次初始化或者重置的时候调用
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // 预备一个属性哈希或者模型添加到集合中。
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) {
        this.trigger('invalid', this, attrs, options);
        return false;
      }
      return model;
    },

    // 内部的服务器模型与集合联系的方法 .
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // 每次模型事件触发时调用的内部方法.
    // 当模型改变他们的 id 时需要更新他们的索引. All other
    // 所有其他事件简单的代理. 在其他事件的"add" and "remove" 事件忽略.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // 在集合中我们将要实现的 Underscore 方法.
  // 事实上 90% Backbone Collections的核心实用方法在这里实现
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'];

  // 使用`Collection#models`做代理混合 Underscore 的所有方法.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore 方法 使用属性名称作为参数.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // 使用 属性 而不是 特性.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View  backbone视图
  // -------------

  // Backbone Views 常常比他们真正所编写的代码更常规. A View
  // 一个 视图 是一个简单的在Dom代理 UI逻辑块的JavaScript对象
  // 它可能是一个简单的项目, 一个完整的列表, 一个侧栏或者面板, 甚至是包含你所用应用的环境框架
  // 定义一块 UI 来作为一个 **View** 就允许你用声明方式定义DOM事件, 
  // 无需担心渲染顺序 ... 并且能很容易让视图对你模型状态变化时做出反应。

  // 创建一个DOM以外初始化的 Backbone.View 元素,
  // 如果现有环境不提供...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // 缓存分割的正则 `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // 视图参数列表作为特性合并.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // 设置所有 **Backbone.View** 可继承的特性和方法.
  _.extend(View.prototype, Events, {

    // 默认 视图 的标签名称为 `"div"`.
    tagName: 'div',

    // 在当前视图内，DOM元素范围内jQuery的查询元素, 
    // 可能的情况下，全局查询应当优先考虑.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // 默认初始化空的function.
    // 以你自己逻辑重写
    initialize: function(){},

    // **render** 是你所需要重写的核心方法, 
    // 用以适当的HTML来填充元素. 
    // 一般 **render** 常返回 `this`.
    render: function() {
      return this;
    },

    // 一般通过移除DOM中的元素来移除视图, 
    // 移除所用应用的 Backbone.Events 的监听.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // 改变视图的元素 (`this.el` 特性), 包括事件重新代理.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // 设置回调, `this.events` 是一个如下的散列
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // 回调函数以正确的 this 值来被绑定到视图.
    // 使用时间代理来提升效率.
    // 省略选择器绑定事件到`this.el`.
    // 一下只适用于代理事件: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` 在IE.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // 清除之前以 `delegateEvents` 绑定在视图上的事件.
    // 一般不会用，但可以会在同个DOM元素绑定多个视图的时候用到.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // 通过设置参数 options 来执行视图的初始化配置.
    // 特殊含义的 键 *(e.g. 模型, 集合, id, className)* 直接连接视图.
    // 请见 `viewOptions` 详细清单
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // 确保视图有一个 DOM 元素渲染对象.
    // 如果 `this.el` 为字符串, 通过 `$()`获取第一个匹配元素并重写到 `el`. 
    // 否则以 `id`, `className` and `tagName` 特性创建元素.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync  同步
  // -------------

  // 重载这个方法来改变 Backbone 持久模型在服务器中的方式、
  // 通过请求类型和问题中的模型
  // 默认情况发送 RESTful Ajax 请求到模型中的`url()`.
  // 一些可行的自定义为:
  //
  // * 使用 `setTimeout` 在一个请求中批量的触发更新.
  // * 发送 XML 而不是 JSON.
  // * 坚持模型通过 WebSockets 而不是 Ajax.
  //
  // 开启 `Backbone.emulateHTTP` 为像 `POST` 一样发送 `PUT` 和 `DELETE` 请求
  // `_method` 参数中包含真正的 HTTP 方法,
  // 以及主体的所有请求 as `application/x-www-form-urlencoded`
  // 替换为 `application/json`参数名为 `model`的模块.
  // 当接口为服务器端语言，如**PHP**时很有用， 使得主体的'PUT'请求难以读取
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // 默认设置, 除非指定.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // 默认 JSON-request 设置.
    var params = {type: type, dataType: 'json'};

    // 确保有一个 URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // 确保我们有正确的请求数据.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // 对于老的服务器, 模拟JSON以HTML形式的.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // 对于老的服务器, 模拟 HTTP 通过用 `_method` 方法仿造 HTTP  
    // 和一个 `X-HTTP-Method-Override` 头.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // 在 non-GET 请求中不传递数据.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // 如果我们发送 `PATCH` 请求, 
    // 我们在一个老版本ActiveX默认启动的情况下，使用XHR来取代jQuery方法。
    // 删除它当IE8支持  `PATCH` 的时候.
    if (params.type === 'PATCH' && window.ActiveXObject &&
          !(window.external && window.external.msActiveXFilteringEnabled)) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    //提出请求, 允许用户自定义Ajax选项.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // 映射 CRUD 到 HTTP 为了默认的 `Backbone.sync` 执行.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // 通过 `$` 代理来设置 `Backbone.ajax` 的默认执行.
  // 如果想要使用另一个库那么重载它.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };
 
  // Backbone.Router  路由
  // ---------------

  // 路由映射 faux-URLs 到 actions, 当路由匹配后触发事件
  // 如果还没有静态的设置，创建一个新的 `router` 哈希.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // 缓存匹配名称参数和路由字符串分割的正则表达式
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // 设置所有 **Backbone.Router** 可继承的特性和方法.
  _.extend(Router.prototype, Events, {

    // 默认初始化为空的函数，以自己的逻辑重载它
    initialize: function(){},

    // 手动绑定回调函数到单个路由名称. 例如:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // 将`Backbone.history`作为代理来保存片段到 history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // 绑定所有定义了的路由到 `Backbone.history`. 
    // 在此我们需要调转路由的顺序来支持普通路由在路由映射底部定义的情况
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // 将路由字符串转换到适合匹配当前 location hash的正则表达式
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional){
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // 给一个 路由, 当URL的片段匹配后, 返回匹配到的解码后的参数数组.
    // 空或者不匹配的参数会被作为 null 来对待保证跨浏览器兼容
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // 处理 跨浏览器箭筒 history 管理, 基于
  // [pushState](http://diveintohtml5.info/history.html) 和完整的URLs, 或者
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // 和URL片段. 如果浏览器都不支持，回到轮训处理
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // 保证 `History` 可以在浏览器之外使用.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // 缓存 剥离 前部的哈希/斜线和尾部的空格 的正则.
  var routeStripper = /^[#\/]|\s+$/g;

  // 缓存剥离前部和尾部的斜线的正则.
  var rootStripper = /^\/+|\/+$/g;

  // 缓存检测 MSIE 的正则.
  var isExplorer = /msie [\w.]+/;

  // 缓存移除尾部斜线的正则.
  var trailingSlash = /\/$/;

  // history 的处理是否已经开始?
  History.started = false;

  // 设置所有 **Backbone.History** 可继承的特性和方法.
  _.extend(History.prototype, Events, {

    // 默认的检测hash变化的的间隔, 如果有必要则1秒检测20次.
    interval: 50,

    // 获取真正的hash值. 
    // 由于Firefox中location.hash总是被解码所以不直接使用 location.hash
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // 无论是从 URL,hash或者重写的，跨浏览器规范化URL片段
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // 开始 hash 变更处理, 如果和当前路由匹配上，返回`true` 否则返回`false`
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // 指出初始配置. 是否需要iframe?
      // 使用所需的pushState ... 是否被提供?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // 规范化root中含有头和尾的斜杠.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // 根据是否我们使用了pushState 或 hashes, 是否支持'onhashchange'
      // 决定我们如何检查URL状态.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // 决定是否我们需要为了一个被不支持 pushState 浏览器打开的 pushState 链接改变base url
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // 如果我们已经开始一个 `pushState`支持的浏览器的路由,
      // 但是我们当前的浏览器不支持...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // 当浏览器重定向到新的URL时立即返回
        return true;

      // 或者我们开始了一个 hash-based 路由, 
      // 但是我们当前的浏览器支持`pushState`，而不是基于。。。
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // 关闭 Backbone.history, 可能暂时性.
    // 在真实应用中无用，但是在单元测试中有用.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // 当一个框架改变的时候添加一个测试路由. 
    // 路由添加后可能会重写之前的路由.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // 检测当前的URL是否有改变, 
    // 如果有，调用 `loadUrl`, 规范隐藏的iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // 尝试加载当前的URL片段. 如果路由匹配成功则返回`true`.
    // 定义的路由不能匹配片段时返回 `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // 保存片段至 hash history, 
    // 或者，如果'replace' 参数传递了就替换URL的状态. 
    // 你需要确保提前进行URL编码.
    //
    // 对象的选项包括 `trigger: true` 如果你希望有路由的回调函数被触发（不理想）
    // `replace: true`, 如果你希望修改当前的URL但是不添加到 history
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // 如果支持 pushState , 使用片段作为 a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // 如果hash更改没有被明确的禁用, 更新 hash 片段，存入 history
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // 在IE7 和更早的版本中用打开关闭iframe是推入history来实现hash-tag变化
          // 我们不希望它真正替换
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // 如果你明确的不希望 基于hashchange history来进行回退
      // 那么 `navigate` 成为一个刷新的页面.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // 更新location的 hash, 取代当前的 entry, 或者向浏览器history添加一个新的.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // 创建默认的 Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper 函数 为子类正确的设置原型链.
  // 与`goog.inherits`类似, 但是使用原型属性和类属性的hash形式进行拓展
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // 由你定义的构造函数或者简单的有我们的父类构造函数创建新子类
    // ( "constructor" 的属性是有你来扩展定义的)
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // 如果提供，给构造函数添加静态属性.
    _.extend(child, parent, staticProps);

    // 设置原型链用 `parent`的原型,不调用`parent`的构造函数
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // 如果提供了，给子类添加原型属性 (替代 属性)
    if (protoProps) _.extend(child.prototype, protoProps);

    // 设置一个方便的属性来处理之后父类的原型在之后可能被引用的情况
    child.__super__ = parent.prototype;

    return child;
  };

  // 设置model, collection, router, view and history的扩展.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // 当URL是必须的但是未提供的时候爆出错误.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // 包装一个设置的错误回调函数来作为后备错误事件。
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

}).call(this);
