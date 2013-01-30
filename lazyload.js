/**
LazyLoad 更容易的无阻塞延时加载一个或多个JavaScript 或 CSS 文件 在需求期间或之后呈现的web页面。

支撑 Firefox 2+, IE6+, Safari 3+ (包括移动Safari), Google Chrome, and Opera 9+. 
其他浏览器为官方不标注支持。

关注 https://github.com/rgrove/lazyload/

Copyright (c) 2011 Ryan Grove <ryan@wonko.com>
*/

LazyLoad = (function (doc) {
  // -- 私有变量 ------------------------------------------------------

  // 用户代理和功能测试信息
  var env,

  // 指向 <head> 元素 用来延迟填充.
  head,

  // 任何目前在进行的请求
  pending = {},

  // 使用次数来判断样式表是否已经加载 数值太高可能停滞。
  pollCount = 0,

  // 请求队列
  queue = {css: [], js: []},

  // 指向 文档的样式表列表
  styleSheets = doc.styleSheets;



  // -- 私有方法 --------------------------------------------------------

  /**
  创建并返回一个制定名和属性的 HTML 元素

  @method createNode
  @param {String} name element name
  @param {Object} attrs name/value mapping of element attributes
  @return {HTMLElement}
  @private
  */
  function createNode(name, attrs) {
    var node = doc.createElement(name), attr;

    for (attr in attrs) {
      if (attrs.hasOwnProperty(attr)) {
        node.setAttribute(attr, attrs[attr]);
      }
    }

    return node;
  }



  /**
  当当前指定类型的资源完成加载时调用。执行回调并加载下一个队列中的资源（如果有）
  @method finish
  @param {String} type resource type ('css' or 'js')
  @private
  */
  function finish(type) {
    var p = pending[type],
        callback,
        urls;
    
	// 判断是否有当前类型的资源加载
    if (p) {
      callback = p.callback;
      urls     = p.urls;

      urls.shift();
      pollCount = 0;

	  // 如果为最后一个待加载的URL 执行回调并且开始下一个队列中的请求（如果有）
      if (!urls.length) {
        callback && callback.call(p.context, p.obj);// 若有回调 以panding[type]中属性来执行
        pending[type] = null;
        queue[type].length && load(type);// 队列中如还有当前类型的资源 加载该类型资源
      }
    }
  }

  /**
  当前代码 the <code>env</code> 环境变量和用户代理和功能测试信息。

  @method getEnv
  @private
  */
  function getEnv() {
    var ua = navigator.userAgent;

    env = {
      // 如果这个浏览器支持禁用异步模式动态创建脚本节点
      // http://wiki.whatwg.org/wiki/Dynamic_Script_Execution_Order
      async: doc.createElement('script').async === true
    };

    (env.webkit = /AppleWebKit\//.test(ua))
      || (env.ie = /MSIE/.test(ua))
      || (env.opera = /Opera/.test(ua))
      || (env.gecko = /Gecko\//.test(ua))
      || (env.unknown = true);
  }

  /**
  加载指定的资源，或者在队列中如果没有指定的资源加载下一个指定类型资源。
  如果一个指定类型资源已经被加载,新的请求将被排队,直到第一个请求完成。

  当数组指定的资源urls,这些url将被载入并行如果它可行,同时保留执行顺序。所有
  浏览器支持并行加载CSS,但只有Firefox和Opera支持并行加载的脚本。在其他浏览器,脚本将
  排队并且在一个时间片段加载一次,以确保正确的执行顺序。

  @method load
  @param {String} type 资源类型 ('css' or 'js')
  @param {String|Array} urls (可选) 需加载的URL或者URLs数组
  @param {Function} callback (可选) 当资源加载完毕后
  @param {Object} obj (可选) 传递给回调函数的对象参数
  @param {Object} context (可选) 如果提供, 回调函数将被执行在这个对象的上下文参数中
  @private
  */
  function load(type, urls, callback, obj, context) {
    var _finish = function () { finish(type); },
        isCSS   = type === 'css',
        nodes   = [],
        i, len, node, p, pendingUrls, url;

    env || getEnv();

    if (urls) { // 有urls参数
      // 当 urls 为 string 类型，处理为单元素数组  
	  // urls.concat()为复制数组（深度复制）使处理其不影响方法调用时的参数（对象在参数传递时是传址传递） 
      urls = typeof urls === 'string' ? [urls] : urls.concat();

	  // 为每个URL创建一个请求对象，如果指定为多个url，则当所有url加载完毕后执行回调
      //
      // 可惜,Firefox和Opera浏览器是唯一能够并行加载并且同时保留执行顺序的浏览器。
      // 在其他浏览器 脚本必须被逐一加载来保证顺序
      //
      // 所有浏览器对于 CSS 样式表的话 并行加载无先后顺序影响 都是简单的下载
      if (isCSS || env.async || env.gecko || env.opera) {
        // 并行加载 当为CSS样式表 异步加载 Firefox和Opera 时 直接扔进队列中并行加载。
        queue[type].push({
          urls    : urls,
          callback: callback,
          obj     : obj,
          context : context
        });
      } else {
        // 否则 逐一加载保证顺序。
        for (i = 0, len = urls.length; i < len; ++i) {
          queue[type].push({
            urls    : [urls[i]],
            callback: i === len - 1 ? callback : null, // 只在最后一个时放入回调函数
            obj     : obj,
            context : context
          });
        }
      }
    }
	// 处理完urls参数进行队列处理

	// 如果之前加载的要求这种类型目前还在进行中,将等待。否则,抓住队列中的下一项。
    if (pending[type] || !(p = pending[type] = queue[type].shift())) {
      return;
    }

    head || (head = doc.head || doc.getElementsByTagName('head')[0]);
    pendingUrls = p.urls;
    
	//  循环建立请求
    for (i = 0, len = pendingUrls.length; i < len; ++i) {
      url = pendingUrls[i];
      
      // 火狐下不支持link节点的onload事件 以创建 style 标签 @import 引用来实现调用回调
      if (isCSS) {
          node = env.gecko ? createNode('style') : createNode('link', {
            href: url,
            rel : 'stylesheet'
          });
      } else {
        node = createNode('script', {src: url});
        node.async = false;// 设为同步加载 保证顺序
      }

      node.className = 'lazyload';
      node.setAttribute('charset', 'utf-8');

      if (env.ie && !isCSS) {// IE的 script 加载完毕触发回调条件
        node.onreadystatechange = function () {
          if (/loaded|complete/.test(node.readyState)) {
            node.onreadystatechange = null;
            _finish();
          }
        };
      } else if (isCSS && (env.gecko || env.webkit)) {
		// Gecko和WebKit不支持link节点的onload事件。
        if (env.webkit) {
          // 在WebKit,我们可以轮询修改文档。样式表找出当样式表已经加载。
          p.urls[i] = node.href; // 解决相对url(或轮询不会工作)
          pollWebKit();
        } else {
		  // 在Gecko,我们可以导入请求的URL到<style>节点和轮询node.sheet.cssRules的存在。
          node.innerHTML = '@import "' + url + '";';
          pollGecko(node);
        }
      } else {
        node.onload = node.onerror = _finish;
      }

      nodes.push(node);
    }

    for (i = 0, len = nodes.length; i < len; ++i) {
      head.appendChild(nodes[i]);
    }
  }

  /**
  当样式表在Gecko中加载的时候 开始轮询来判断是否完成加载。在所有样式表完成加载 或者10S之后停止轮询防止无限循环

  
  在此使用基于@import的跨域技术,和一个同域的实现 
  http://www.zachleat.com/web/2010/07/29/load-css-dynamically/

  @method pollGecko
  @param {HTMLElement} node Style node to poll.
  @private
  */
  function pollGecko(node) {
    var hasRules;

    try {
      // We don't really need to store this value or ever refer to it again, but if we don't store it, Closure Compiler assumes the code is useless and removes it.
	  // 无需存储或者在此引用该值 但是如果不引用 编辑器就认为是无用的并且移除它。
      hasRules = !!node.sheet.cssRules;
    } catch (ex) {
      // An exception means the stylesheet is still loading.
	  // 一个例外意味着样式表仍然是在加载。
      pollCount += 1;

      if (pollCount < 200) { // 循环次数限制 共10s
        setTimeout(function () { pollGecko(node); }, 50);
      } else {
        // 轮询10秒后,还是没有结果发生。那么停止轮询和完成未决请求进一步判断 避免阻塞请求。
        hasRules && finish('css');
      }

      return;
    }

	// 如果执行到此,则样式表加载。
    finish('css');
  }

  /**
  在WebKit中 开始轮询来判断当等待样式表已经完成加载，在所有样式表完成加载 或者10S之后停止轮询防止无限循环
  @method pollWebKit
  @private
  */
  function pollWebKit() {
    var css = pending.css, i;

    if (css) {
      i = styleSheets.length;

	  // 匹配styleSheet中的href 来判断是否加载完毕
      while (--i >= 0) {
        if (styleSheets[i].href === css.urls[0]) {
          finish('css');
          break;
        }
      }

      pollCount += 1;

      if (css) {
        if (pollCount < 200) {
          setTimeout(pollWebKit, 50);
        } else {
          // 轮询10秒,但是什么也没有发生,这可能表明,样式表中已删除文件之前就有机会负载。停止轮询和完成等待请求以防止阻塞进一步的请求。
          finish('css');
        }
      }
    }
  }

  return {

    /**
	模块模式来暴露接口

	请求指定CSS URL或URLs，当他们完成加载执行指定的回调函数(如果有的话)。
	如果指定的是一个一个数组的urls,样式表将被并行加载在和所有的样式表加载完毕后执行回调。

    @method css
    @param {String|Array} urls 需要加载的单个或者数组形式的url
    @param {Function} callback (可选)加载完毕所需要执行的回调函数
    @param {Object} obj (可选) 回调函数需要传递的参数
    @param {Object} context (可选) 提供回调函数的执行上下文
    @static
    */
    css: function (urls, callback, obj, context) {
      load('css', urls, callback, obj, context);
    },

    /**
	请求指定的JavaScriptURL或URLs并当他们完成加载执行指定的回调函数(如果有的话)。
	如果是指定一个url的数组和当浏览器支持,脚本将被并行载入，当完成所有的脚本加载后执行回调。

	目前,只有Firefox和Opera支持并行加载脚本并且保存执行顺序。
	在其他浏览器,脚本将排队和逐一加载一次,以确保正确的执行顺序。

    @method js
    @param {String|Array} urls 需要加载的单个或者数组形式的url
    @param {Function} callback (可选) callback 加载完毕所需要执行的回调函数
    @param {Object} obj (可选) 回调函数需要传递的参数
    @param {Object} context (可选) 提供回调函数的执行上下文
    @static
    */
    js: function (urls, callback, obj, context) {
      load('js', urls, callback, obj, context);
    }

  };
})(this.document);