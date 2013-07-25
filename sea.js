/**
 * Sea.js 2.1.1 | seajs.org/LICENSE.md
 */
(function(global, undefined) {

// 避免多次加载
if (global.seajs) {
  return
}

// 版本号
var seajs = global.seajs = {
  version: "2.1.1"
}

// 主体存放数据对象
var data = seajs.data = {}

/**
 * util-lang.js - 最小化 language 增强
 */

// 闭包式检测类型
function isType(type) {
  return function(obj) {
    return Object.prototype.toString.call(obj) === "[object " + type + "]"
  }
}

var isObject = isType("Object")
var isString = isType("String")
var isArray = Array.isArray || isType("Array")
var isFunction = isType("Function")

// 唯一标识 累积计数
var _cid = 0
function cid() {
  return _cid++
}


/**
 * util-events.js - 最简化 events 支持
 * 短而经典的事件池处理方式 应该可以算各个库中最简短的、
 * 当然功能一般来说已经够用
 */

var events = data.events = {}

// 与其他库基本一样，将事件放置于 事件池 中
seajs.on = function(name, callback) {
  var list = events[name] || (events[name] = [])
  list.push(callback)
  return seajs
}

// 移除事件. 若 `callback` 为 undefined, 移除该行为上的所有事件
// 若 `event` and `callback` 均为 undefined 移除所有事件
// 事件池 {event1:[func1,func2],event2:[func1,func3]}
seajs.off = function(name, callback) {
  // 移除 *all* events
  if (!(name || callback)) {
    events = data.events = {}
    return seajs
  }

  var list = events[name]
  if (list) {
    if (callback) {
      for (var i = list.length - 1; i >= 0; i--) {
        if (list[i] === callback) {
          list.splice(i, 1)
        }
      }
    }
    else {
      delete events[name]
    }
  }

  return seajs
}

// 散发事件, 触发所有绑定的回调. 回调将接收相同的参数, 除事件名称。
var emit = seajs.emit = function(name, data) {
  var list = events[name], fn

  if (list) {
    // 重新复制一份提出来，防止之后对数组的修改影响 events[name]
    list = list.slice()

    // 逐一执行对应事件名中的回调
    while ((fn = list.shift())) {
      fn(data)
    }
  }

  return seajs
}


/**
 * util-path.js - 公共路径 如 id uri的
 * 对于路径这一块 一般的由于前端涉及到路径方面的比较少
 * 所有对于前端来实现路径的规范 还是需要考虑很多情况
 * seajs 赶脚用了很少的代码，规范了路径的大量情况 很值得学习参考一下
 */

var DIRNAME_RE = /[^?#]*\//

var DOT_RE = /\/\.\//g
var DOUBLE_DOT_RE = /\/[^/]+\/\.\.\//

// 提取路径目录部分
// dirname("a/b/c.js?t=123#xx/zz") ==> "a/b/"
// ref: http://jsperf.com/regex-vs-split/2
function dirname(path) {
  return path.match(DIRNAME_RE)[0]
}

// 规范化路径
// realpath("http://test.com/a//./b/../c") ==> "http://test.com/a/c"
function realpath(path) {
  // /a/b/./c/./d ==> /a/b/c/d
  path = path.replace(DOT_RE, "/")

  // a/b/c/../../d  ==>  a/b/../d  ==>  a/d
  while (path.match(DOUBLE_DOT_RE)) {
    path = path.replace(DOUBLE_DOT_RE, "/")
  }

  return path
}

// 标准化 id
// normalize("path/to/a") ==> "path/to/a.js"
// NOTICE: substring 比内置的 slice and RegExp 更快
function normalize(path) {
  var last = path.length - 1
  var lastC = path.charAt(last)

  // 如果含有，去除末位的 # 号
  if (lastC === "#") {
    return path.substring(0, last)
  }

  return (path.substring(last - 2) === ".js" ||
      path.indexOf("?") > 0 ||
      path.substring(last - 3) === ".css" ||
      lastC === "/") ? path : path + ".js"
}


var PATHS_RE = /^([^/:]+)(\/.+)$/
var VARS_RE = /{([^{]+)}/g

// 对于有模块id简写的进行规范化
function parseAlias(id) {
  var alias = data.alias
  return alias && isString(alias[id]) ? alias[id] : id
}

// 处理简写的相对路径
function parsePaths(id) {
  var paths = data.paths
  var m

  if (paths && (m = id.match(PATHS_RE)) && isString(paths[m[1]])) {
    id = paths[m[1]] + m[2]
  }

  return id
}

// 处理变量（未看懂）
function parseVars(id) {
  var vars = data.vars

  if (vars && id.indexOf("{") > -1) {
    id = id.replace(VARS_RE, function(m, key) {
      return isString(vars[key]) ? vars[key] : m
    })
  }

  return id
}

// 不是很懂这几个方法的作用和必要性
function parseMap(uri) {
  var map = data.map
  var ret = uri

  if (map) {
    for (var i = 0, len = map.length; i < len; i++) {
      var rule = map[i]

      ret = isFunction(rule) ?
          (rule(uri) || uri) :
          uri.replace(rule[0], rule[1])

      // Only apply the first matched rule
      if (ret !== uri) break
    }
  }

  return ret
}


var ABSOLUTE_RE = /^\/\/.|:\//
var ROOT_DIR_RE = /^.*?\/\/.*?\//

function addBase(id, refUri) {
  var ret
  var first = id.charAt(0)

  // 绝对
  if (ABSOLUTE_RE.test(id)) {
    ret = id
  }
  // 相对
  else if (first === ".") {
    ret = realpath((refUri ? dirname(refUri) : data.cwd) + id)
  }
  // 根
  else if (first === "/") {
    var m = data.cwd.match(ROOT_DIR_RE)
    ret = m ? m[0] + id.substring(1) : id
  }
  // Top-level
  else {
    ret = data.base + id
  }

  return ret
}

// 将模块传入的 id 转换为 uri
// 经过一些列处理，将各种不同情况变为同一种格式 文件的uri链接
function id2Uri(id, refUri) {
  if (!id) return ""

  id = parseAlias(id)
  id = parsePaths(id)
  id = parseVars(id)
  id = normalize(id)

  var uri = addBase(id, refUri)
  uri = parseMap(uri)

  return uri
}


var doc = document
var loc = location
var cwd = dirname(loc.href)
var scripts = doc.getElementsByTagName("script")

// Recommend to add `seajsnode` id for the `sea.js` script element
var loaderScript = doc.getElementById("seajsnode") ||
    scripts[scripts.length - 1]

// 在`sea.js`中, 设置 loaderDir 到当前的目录
var loaderDir = dirname(getScriptAbsoluteSrc(loaderScript) || cwd)

// 获取node的链接 src 值，额 还从来没遇到过
function getScriptAbsoluteSrc(node) { 
  return node.hasAttribute ? // 非 IE6/7
      node.src :
    // see http://msdn.microsoft.com/en-us/library/ms536429(VS.85).aspx
      node.getAttribute("src", 4)
}


/**
 * util-request.js - 请求加载 script and style 文件的公共块
 * ref: tests/research/load-js-css/test.html
 */

var head = doc.getElementsByTagName("head")[0] || doc.documentElement
var baseElement = head.getElementsByTagName("base")[0]

var IS_CSS_RE = /\.css(?:\?|$)/i
var READY_STATE_RE = /^(?:loaded|complete|undefined)$/

var currentlyAddingScript
var interactiveScript

// `onload` event is not supported in WebKit < 535.23 and Firefox < 9.0
// 更低版本中的不支持 useragent进行判断版本
// ref:
//  - https://bugs.webkit.org/show_activity.cgi?id=38995
//  - https://bugzilla.mozilla.org/show_bug.cgi?id=185236
//  - https://developer.mozilla.org/en/HTML/Element/link#Stylesheet_load_events
var isOldWebKit = (navigator.userAgent
    .replace(/.*AppleWebKit\/(\d+)\..*/, "$1")) * 1 < 536


// 使用 uri 判断js和css文件 来创建节点
function request(url, callback, charset) {
  var isCSS = IS_CSS_RE.test(url)
  var node = doc.createElement(isCSS ? "link" : "script")

  if (charset) {
    var cs = isFunction(charset) ? charset(url) : charset
    if (cs) {
      node.charset = cs
    }
  }

  // 先进行 回调绑定
  addOnload(node, callback, isCSS)

  if (isCSS) {
    node.rel = "stylesheet"
    node.href = url
  }
  else {
    node.async = true
    node.src = url
  }

  // 处理在 IE 6-8 中的缓存问题, 在插入执行结束后脚本立即执行
  // 所以使用 `currentlyAddingScript` 来处理当前 node 
  // 在 `define` 调用中衍生 url
  currentlyAddingScript = node

  // ref: #185 & http://dev.jquery.com/ticket/2709
  baseElement ?
      head.insertBefore(node, baseElement) :
      head.appendChild(node)

  currentlyAddingScript = null
}

function addOnload(node, callback, isCSS) {
  var missingOnload = isCSS && (isOldWebKit || !("onload" in node))

  // 处理老版本的 Old WebKit and Old Firefox link 无onload情况
  if (missingOnload) {
    setTimeout(function() {
      pollCss(node, callback)
    }, 1) // 无阻塞处理（但为啥子要为1 不都是0么？？？？）
    return
  }

  // 赶脚这边处理的很帅 对于兼容直接放入函数中进行处理
  node.onload = node.onerror = node.onreadystatechange = function() {
    // READY_STATE_RE = /^(?:loaded|complete|undefined)$/
    if (READY_STATE_RE.test(node.readyState)) {

      // 确保一个node只在state各个各种变化中运行一次 
      node.onload = node.onerror = node.onreadystatechange = null

      // Remove the script to reduce memory leak
      // 不明觉厉的赶脚啊
      if (!isCSS && !data.debug) {
        head.removeChild(node)
      }

      // 取消引用 防止一些内存循环引用的问题（低版本IE中）
      node = null

      callback()
    }
  }
}

// 处理对于低版本浏览器中 link 标签无 onload的情况进行处理
function pollCss(node, callback) {
  var sheet = node.sheet
  var isLoaded

  // 检测的处理 2种还有所不同额
  // for WebKit < 536
  if (isOldWebKit) {
    if (sheet) {
      isLoaded = true
    }
  }
  // for Firefox < 9.0
  else if (sheet) {
    try {
      if (sheet.cssRules) {
        isLoaded = true
      }
    } catch (ex) {
      // `ex.name` 从 "NS_ERROR_DOM_SECURITY_ERR"
      // to "SecurityError" since Firefox 13.0. But Firefox is less than 9.0
      // in here, So it is ok to just rely on "NS_ERROR_DOM_SECURITY_ERR"
      if (ex.name === "NS_ERROR_DOM_SECURITY_ERR") {
        isLoaded = true
      }
    }
  }

  // 轮训检测
  setTimeout(function() {
    if (isLoaded) {
      // Place callback here to give time for style rendering
      callback()
    }
    else {
      pollCss(node, callback)
    }
  }, 20)
}

// 未了解起作用
function getCurrentScript() {
  if (currentlyAddingScript) {
    return currentlyAddingScript
  }

  // 对于 IE6-9 ,  script的onload事件有时不能被正确的计算触发。
  //  Kris Zyp 可以使用轮询来查询脚本
  // and the one that is in "interactive" mode indicates the current script
  // ref: http://goo.gl/JHfFW
  if (interactiveScript && interactiveScript.readyState === "interactive") {
    return interactiveScript
  }

  var scripts = head.getElementsByTagName("script")

  for (var i = scripts.length - 1; i >= 0; i--) {
    var script = scripts[i]
    if (script.readyState === "interactive") {
      interactiveScript = script
      return interactiveScript
    }
  }
}


/**
 * util-deps.js - 依赖关系的解析 匹配得到代码中 使用repuire的依赖
 * ref: tests/research/parse-dependencies/test.html
 */

var REQUIRE_RE = /"(?:\\"|[^"])*"|'(?:\\'|[^'])*'|\/\*[\S\s]*?\*\/|\/(?:\\\/|[^\/\r\n])+\/(?=[^\/])|\/\/.*|\.\s*require|(?:^|[^$])\brequire\s*\(\s*(["'])(.+?)\1\s*\)/g
var SLASH_RE = /\\\\/g

function parseDependencies(code) {
  var ret = []

  code.replace(SLASH_RE, "")
      .replace(REQUIRE_RE, function(m, m1, m2) {
        if (m2) {
          ret.push(m2)
        }
      })

  return ret
}


/**
 * module.js -模块的核心加载器
 */

var cachedMods = seajs.cache = {}
var anonymousMeta

var fetchingList = {}
var fetchedList = {}
var callbackList = {}

var STATUS = Module.STATUS = {
  // 1 - The `module.uri` 已经被获取到的
  FETCHING: 1,
  // 2 - The meta data 已被保存至 cachedMods
  SAVED: 2,
  // 3 - The `module.dependencies` 已被加载
  LOADING: 3,
  // 4 - The module 准备执行
  LOADED: 4,
  // 5 - The module 已执行
  EXECUTING: 5,
  // 6 - The `module.exports` 已存在
  EXECUTED: 6
}


function Module(uri, deps) {
  this.uri = uri
  this.dependencies = deps || []
  this.exports = null
  this.status = 0

  // 哪些依赖预本model
  this._waitings = {}

  // 为加载的模块数
  this._remain = 0
}

// 解决模块依赖
Module.prototype.resolve = function() {
  var mod = this
  var ids = mod.dependencies
  var uris = []

  for (var i = 0, len = ids.length; i < len; i++) {
    uris[i] = Module.resolve(ids[i], mod.uri)
  }
  return uris
}

// 加载模块，当所有的加载完毕后触发 onload
// 使用技术来判定 是否依赖以及完全加载
Module.prototype.load = function() {
  var mod = this

  // 如果模块已被加载，等待 onload 调用
  if (mod.status >= STATUS.LOADING) {
    return
  }

  mod.status = STATUS.LOADING

  // 发射 `load` event 对插件
  var uris = mod.resolve()
  emit("load", uris)

  var len = mod._remain = uris.length
  var m

  // 初始化 模块和寄存器 waitings
  for (var i = 0; i < len; i++) {
    m = Module.get(uris[i])

    if (m.status < STATUS.LOADED) {
      // 考虑重复的情况
      m._waitings[mod.uri] = (m._waitings[mod.uri] || 0) + 1
    }
    else {
      mod._remain--
    }
  }

  if (mod._remain === 0) {
    mod.onload()
    return
  }

  // 开始并行加载
  var requestCache = {}

  for (i = 0; i < len; i++) {
    m = cachedMods[uris[i]]

    if (m.status < STATUS.FETCHING) {
      m.fetch(requestCache)
    }
    else if (m.status === STATUS.SAVED) {
      m.load()
    }
  }

  // 发送所有的请求，避免在 IE6-9 中缓存的BUG. Issues#808
  for (var requestUri in requestCache) {
    if (requestCache.hasOwnProperty(requestUri)) {
      requestCache[requestUri]()
    }
  }
}

// 所有的加载完毕后执行的方法
Module.prototype.onload = function() {
  var mod = this
  mod.status = STATUS.LOADED

  if (mod.callback) {
    mod.callback()
  }

  // 通知等待模块来触发 onload
  var waitings = mod._waitings
  var uri, m

  for (uri in waitings) {
    if (waitings.hasOwnProperty(uri)) {
      m = cachedMods[uri]
      m._remain -= waitings[uri]
      if (m._remain === 0) {
        m.onload()
      }
    }
  }

  // 减少内存占用
  delete mod._waitings
  delete mod._remain
}

// 获取模块
Module.prototype.fetch = function(requestCache) {
  var mod = this
  var uri = mod.uri

  mod.status = STATUS.FETCHING

  // Emit `fetch` event for plugins such as combo plugin
  var emitData = { uri: uri }
  emit("fetch", emitData)
  var requestUri = emitData.requestUri || uri

  // Empty uri or a non-CMD module
  if (!requestUri || fetchedList[requestUri]) {
    mod.load()
    return
  }

  if (fetchingList[requestUri]) {
    callbackList[requestUri].push(mod)
    return
  }

  fetchingList[requestUri] = true
  callbackList[requestUri] = [mod]

  // Emit `request` event for plugins such as text plugin
  emit("request", emitData = {
    uri: uri,
    requestUri: requestUri,
    onRequest: onRequest,
    charset: data.charset
  })

  if (!emitData.requested) {
    requestCache ?
        requestCache[emitData.requestUri] = sendRequest :
        sendRequest()
  }

  function sendRequest() {
    request(emitData.requestUri, emitData.onRequest, emitData.charset)
  }

  function onRequest() {
    delete fetchingList[requestUri]
    fetchedList[requestUri] = true

    // Save meta data of anonymous module
    if (anonymousMeta) {
      Module.save(uri, anonymousMeta)
      anonymousMeta = null
    }

    // Call callbacks
    var m, mods = callbackList[requestUri]
    delete callbackList[requestUri]
    while ((m = mods.shift())) m.load()
  }
}

// 执行模块
Module.prototype.exec = function () {
  var mod = this

  // When module is executed, DO NOT execute it again. When module
  // is being executed, just return `module.exports` too, for avoiding
  // circularly calling
  if (mod.status >= STATUS.EXECUTING) {
    return mod.exports
  }

  mod.status = STATUS.EXECUTING

  // Create require
  var uri = mod.uri

  function require(id) {
    return Module.get(require.resolve(id)).exec()
  }

  require.resolve = function(id) {
    return Module.resolve(id, uri)
  }

  require.async = function(ids, callback) {
    Module.use(ids, callback, uri + "_async_" + cid())
    return require
  }

  // Exec factory
  var factory = mod.factory

  var exports = isFunction(factory) ?
      factory(require, mod.exports = {}, mod) :
      factory

  if (exports === undefined) {
    exports = mod.exports
  }

  // Emit `error` event
  if (exports === null && !IS_CSS_RE.test(uri)) {
    emit("error", mod)
  }

  // Reduce memory leak
  delete mod.factory

  mod.exports = exports
  mod.status = STATUS.EXECUTED

  // Emit `exec` event
  emit("exec", mod)

  return exports
}

// 将 id 转为 uri
Module.resolve = function(id, refUri) {
  // Emit `resolve` event for plugins such as text plugin
  var emitData = { id: id, refUri: refUri }
  emit("resolve", emitData)

  return emitData.uri || id2Uri(emitData.id, refUri)
}

// 定义模块
Module.define = function (id, deps, factory) {
  var argsLen = arguments.length

  // define(factory)
  if (argsLen === 1) {
    factory = id
    id = undefined
  }
  else if (argsLen === 2) {
    factory = deps

    // define(deps, factory)
    if (isArray(id)) {
      deps = id
      id = undefined
    }
    // define(id, factory)
    else {
      deps = undefined
    }
  }

  // Parse dependencies according to the module factory code
  if (!isArray(deps) && isFunction(factory)) {
    deps = parseDependencies(factory.toString())
  }

  var meta = {
    id: id,
    uri: Module.resolve(id),
    deps: deps,
    factory: factory
  }

  // Try to derive uri in IE6-9 for anonymous modules
  if (!meta.uri && doc.attachEvent) {
    var script = getCurrentScript()

    if (script) {
      meta.uri = script.src
    }

    // NOTE: If the id-deriving methods above is failed, then falls back
    // to use onload event to get the uri
  }

  // Emit `define` event, used in nocache plugin, seajs node version etc
  emit("define", meta)

  meta.uri ? Module.save(meta.uri, meta) :
      // Save information for "saving" work in the script onload event
      anonymousMeta = meta
}

// 保存元数据到 cachedMods
Module.save = function(uri, meta) {
  var mod = Module.get(uri)

  // Do NOT override already saved modules
  if (mod.status < STATUS.SAVED) {
    mod.id = meta.id || uri
    mod.dependencies = meta.deps || []
    mod.factory = meta.factory
    mod.status = STATUS.SAVED
  }
}

// 获取一个已存在的模块 或者 创建一个
Module.get = function(uri, deps) {
  return cachedMods[uri] || (cachedMods[uri] = new Module(uri, deps))
}

// 使用函数 等同于 一个异步函数加载
Module.use = function (ids, callback, uri) {
  var mod = Module.get(uri, isArray(ids) ? ids : [ids])

  mod.callback = function() {
    var exports = []
    var uris = mod.resolve()

    for (var i = 0, len = uris.length; i < len; i++) {
      exports[i] = cachedMods[uris[i]].exec()
    }

    if (callback) {
      callback.apply(global, exports)
    }

    delete mod.callback
  }

  mod.load()
}

// 在其他模块前  预加载模块
Module.preload = function(callback) {
  var preloadMods = data.preload
  var len = preloadMods.length

  if (len) {
    Module.use(preloadMods, function() {
      // Remove the loaded preload modules
      preloadMods.splice(0, len)

      // Allow preload modules to add new preload modules
      Module.preload(callback)
    }, data.cwd + "_preload_" + cid())
  }
  else {
    callback()
  }
}


// 公共的API接口

seajs.use = function(ids, callback) {
  Module.preload(function() {
    Module.use(ids, callback, data.cwd + "_use_" + cid())
  })
  return seajs
}

Module.define.cmd = {}
global.define = Module.define


// For Developers

seajs.Module = Module
data.fetchedList = fetchedList
data.cid = cid

seajs.resolve = id2Uri
seajs.require = function(id) {
  return (cachedMods[Module.resolve(id)] || {}).exports
}


/**
 * config.js - 加载配置
 */

var BASE_RE = /^(.+?\/)(\?\?)?(seajs\/)+/

// The root path to use for id2uri parsing
// If loaderUri is `http://test.com/libs/seajs/[??][seajs/1.2.3/]sea.js`, the
// baseUri should be `http://test.com/libs/`
data.base = (loaderDir.match(BASE_RE) || ["", loaderDir])[1]

// The loader directory
data.dir = loaderDir

// The current working directory
data.cwd = cwd

// The charset for requesting files
data.charset = "utf-8"

// Modules that are needed to load before all other modules
data.preload = (function() {
  var plugins = []

  // Convert `seajs-xxx` to `seajs-xxx=1`
  // NOTE: use `seajs-xxx=1` flag in uri or cookie to preload `seajs-xxx`
  var str = loc.search.replace(/(seajs-\w+)(&|$)/g, "$1=1$2")

  // Add cookie string
  str += " " + doc.cookie

  // Exclude seajs-xxx=0
  str.replace(/(seajs-\w+)=1/g, function(m, name) {
    plugins.push(name)
  })

  return plugins
})()

// data.alias - 一个包含模块简写id的对象
// data.paths - 一个包含模块简写id的路径对象
// data.vars - 在模块中的变量声明
// data.map - 一个包含模块映射规则uri的数组
// data.debug - 调试模块. 默认为 false

seajs.config = function(configData) {

  for (var key in configData) {
    var curr = configData[key]
    var prev = data[key]

    // Merge object config such as alias, vars
    if (prev && isObject(prev)) {
      for (var k in curr) {
        prev[k] = curr[k]
      }
    }
    else {
      // Concat array config such as map, preload
      if (isArray(prev)) {
        curr = prev.concat(curr)
      }
      // Make sure that `data.base` is an absolute path
      else if (key === "base") {
        (curr.slice(-1) === "/") || (curr += "/")
        curr = addBase(curr)
      }

      // Set config
      data[key] = curr
    }
  }

  emit("config", configData)
  return seajs
}


})(this);
