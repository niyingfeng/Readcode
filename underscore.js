//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2011 Jeremy Ashkenas, DocumentCloud Inc.
//     (c) 2011-2013 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore 可在 MIT 许可下自由布置.

(function() {

  // 设置基线
  // --------------

  // 创建 root 对象, 浏览器中为`window` , 服务器端为 `global` .
  var root = this;

  // 保存之前的 `_` 变量值.
  var previousUnderscore = root._;

  // 创建用来获取跳出循环迭代的返回值的对象.
  var breaker = {};

  // 保存字节更小的文本 (但是不在 gzipped) :
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // 创建对核心原型快速访问的变量引用 .
  var
    push             = ArrayProto.push,
    slice            = ArrayProto.slice,
    concat           = ArrayProto.concat,
    toString         = ObjProto.toString,
    hasOwnProperty   = ObjProto.hasOwnProperty;

  // 在此放置所有我们将会使用到的 **ECMAScript 5** 中的内置方法 .
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // 使用以下代码，使我们创建一个安全的 Underscore 对象 .
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    // 保存原先的对象
    this._wrapped = obj;
  };

  // 为 **Node.js** 扩展 Underscore 对象, 
  // 向后兼容 老的 `require()` API. If we're in
  // 如果是在浏览器中, 通过向全局对象中添加 '_' 作为标示符
  // 来封装一些高级模式 .
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // 当前版本.
  _.VERSION = '1.4.4';

  // 函数集合
  // --------------------

  /**
   * 基石, 对于 `each` 的实现, 即 `forEach`.
   * 通过内置的 `forEach`, arrays, and 原生 objects 处理对象.
   * 如果可以，使用 **ECMAScript 5**内置的 `forEach` .
   *
   * @param {object} obj 处理对象或者数组
   * @param {function} iterator 迭代函数
   * @param {object} context [可选] 上下文选项
   *
   * _each({one : 1, two : 2},function(num , key){ alert(num) });
   * => alert each number in turn
   */ 
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  /**
  * 返回各个元素运行迭代器后的结果数组.
  * 尽可能使用 **ECMAScript 5** 内置的 `map` .
  *
  * @param {object} obj 处理对象或者数组
  * @param {function} iterator 迭代函数
  * @param {object} context [可选] 上下文选项
  * @return {object} obj 返回经过迭代函数处理过的结果对象或者数组
  *
  * _map([1,2,3],function(num , key){ return num * 3; } .
  * => [3 , 6 , 9]
  */
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results.push(iterator.call(context, value, index, list));
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  /**
  * **Reduce** 将列表中的元素通过初始值与迭代函数归为一个单值, 即 `inject`,
  * 或者 `foldl`. 尽可能使用 **ECMAScript 5** 内置的 `reduce` .
  *
  * @param {object} obj 处理对象或者数组
  * @param {function} iterator 迭代函数
  * @param {any} memo 为reduce函数的初始值好贵
  * @param {object} context [可选] 上下文选项
  * @return {any} 返回迭代函数归为一个单值
  *
  * _reduce([1, 2, 3], function(memo , num){ return memo + num}, 0);
  * => 6
  */
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  /**
  * reduce 的从右网左的版本, 又名 `foldr`.
  * 尽可能使用 **ECMAScript 5** 内置的 `reduceRight` .
  *
  * @param {object} obj 处理对象或者数组
  * @param {function} iterator 迭代函数
  * @param {any} memo 为reduce函数的初始值
  * @param {object} context [可选] 上下文选项
  * @return {any} 返回迭代函数归为一个单值
  *
  * _.reduceRight([2, 3, 4],function(memo, num){ memo.push(num); return memo;}, [])
  * => [4, 3, 2]
  */
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  /**
  * 返回第一个通过 test 的元素. 即 `detect`.
  *
  * @param {object} obj 处理对象或者数组
  * @param {function} iterator 匹配函数
  * @param {object} context [可选] 上下文选项
  * @return {any} 第一个通过 test 的元素
  *
  * _.find([3, 4, 5, 6],function(value,index){ return index === 2 });
  * =>5
  */
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  /**
  * 返回所有匹配成功的值的集合.
  * 优先使用 **ECMAScript 5** 原生的 `filter` .
  * 又称`select`.
  *
  * @param {object} obj 处理对象或者数组
  * @param {function} iterator 匹配函数
  * @param {object} context [可选] 上下文选项
  * @return {array} 通过匹配的元素数组
  *
  * _.filter([1, 2, 3, 4, 5, 6, 7], function(value){ return value%2 === 0});
  * =>[2, 4, 6]
  */
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results.push(value);
    });
    return results;
  };

  /**
  * 返回测试失败的所有元素.
  *
  * @param {object} obj 处理对象或者数组
  * @param {function} iterator 匹配函数
  * @param {object} context [可选] 上下文选项
  * @return {array} 未通过匹配的元素数组
  *
  * _.reject([1, 2, 3, 4, 5, 6, 7], function(value){ return value%2 === 0});
  * =>[1, 3, 5, 7]
  */
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // 判断是否所有的元素都通过匹配.
  // 尽可能使用  **ECMAScript 5** 原声方法 `every`.
  // 又名`all`.
  // _.every([3,4,5], function(num){return num > 2;});
  // => true
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // 判断是否有至少一个通过匹配.
  // 尽可能使用 **ECMAScript 5** 的原生方法 `some` .
  // 又名 `any`.
  // _.any([3,4,5], function(num){return num > 5;});
  // => false
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // 判断对象或者数组中包含给定的值 (使用 `===` 比较).
  // 又名 `include`.

  // _.contains({a : "abc"}, "abc");
  // false
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // 在集合的每一个元素上调用方法(with arguments).
  // _.invoke([[1,2,3],[4,5,6],[7,8,9]], "sort");
  // => [[3,2,1],[6,5,4],[9,8,7]]
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // 通过 `map` 方便的用例模板模型，获取对象数组中各个对象属性的值，返回数组.
  // _.pluck([{name : "aa", age : 14}, {name : "bb", age : 24}], "name");
  // => ["aa", "bb"]
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // 常使用 `filter` 的方便版本: 选择包含 `key:value` 的对象.
  // _.where([{age:14, name:15}, {age:16, name:17}, {age:18, name:19}],{age:18})
  // =>{age:18, name:19}
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? void 0 : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // 常使用 `find` 形式的方便版本: 获取第一个对象包含 `key:value` .
  // _.findWhere([{age:14, name:15}, {age:18, name:17}, {age:18, name:19}],{age:18})
  // =>{age:18, name:17}
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // 返回最大的元素 或者( 基于元素计算 ).
  // 数组不能多于 65,535 个元素.
  // 请见 [WebKit Bug 80797](https://bugs.webkit.org/show_bug.cgi?id=80797)
  // _.max([1,2,3,4,5,6]);
  // => 6
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // 返回最小的元素 或者( 基于元素计算 ).
  //  _.min([1,2,3,4,5,6]);
  // => 1
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // 对数组进行随机洗牌.
  // _.shuffle([1,2,3,4,5,6]);
  // => [6,3,1,2,5,4]
  _.shuffle  = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // 一个内部函数实现的迭代查找器.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // 以迭代函数的标准来排列对象的值.
  // _.sortBy([1, 2, 3, 4, 5, 6], function(num){ return Math.sin(num); });
  // => [5, 4, 6, 3, 1, 2]
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // 一个用来合并 "group by" 参数的内部方法.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value == null ? _.identity : value);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // 将对象值以标准进行分类. 
  // 传递一个用以分组的字符串属性，或者返回标准的函数.

  // _.groupBy([1.3, 2.1, 2.4], function(num){ return Math.floor(num); });
  // => {1: [1.3], 2: [2.1, 2.4]}

  // _.groupBy(['one', 'two', 'three'], 'length');
  // => {3: ["one", "two"], 5: ["three"]}
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // 按照标准组的对象计数.
  // 传递一个用以分组的字符串属性，或者返回标准的函数.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // 使用比较函数来计算出一个对象应该被插入的顺序的位置序号.使用二分法查找.
  // _.sortedIndex([10, 20, 30, 40, 50], 35);
  // => 3
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // 将任何可迭代的对象安全的创建为数组.
  // (function(){ return _.toArray(arguments).slice(0); })(1, 2, 3);
  // => [1, 2, 3]
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // 返回对象中的元素数量.
  // _.size({one : 1, two : 2, three : 3});
  // => 3
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // 获取数组的第一个元素. 传递 **n** 将从第一个元素开始返回数组中的n个元素.
  // 别名 `head` and `take`.  **guard** 参数检测是否可以和 `_.map` 一起使用.
  // _.first([5, 4, 3, 2, 1]);
  // => 5
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // 返回除最后一个元素的所有元素. 对arguments对象很有用.
  // 传递 **n** 将返回除最后n个的所有元素.
  // **guard** 参数检测是否可以和 `_.map` 一起使用.
  // _.initial([5, 4, 3, 2, 1]);
  // => [5, 4, 3, 2]
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // 获取数组中的最有一个元素. 传递 **n** 返回数组中的后n个元素.
  // **guard** 参数检测是否可以和 `_.map` 一起使用.
  // _.last([5, 4, 3, 2, 1]);
  // => 1
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // 返回除第一个元素外的所有元素. 别名 `tail` and `drop`.
  // arguments 对象中特别有用. 传递 **n** 返回除前n个元素外的所有元素.
  // **guard** 参数检测是否可以和 `_.map` 一起使用.
  // _.rest([5, 4, 3, 2, 1],2);
  // =>[3, 2, 1]
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // 删除数组中的所有false的元素.
  // _.compact([0, 1, false, 2, '', 3]);
  // => [1, 2, 3]
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // `flatten` 内部实现递归功能的函数.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value) || _.isArguments(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // 返回一个单嵌套的数组.
  // _.flatten([1, [2], [3, [[[4]]]]]);
  // => [1, 2, 3, 4];
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // 返回一个不含有指定值的数组.
  // _.without([1, 2, 1, 0, 3, 1, 4], 0, 1);
  // => [2, 3, 4]
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // 产生一个无重复的数组版本.
  // 如果数组已经被排序，那么可以选着更快的算法，传递true给isSorted.
  // 又名 `unique`.
  // _.uniq([1, 2, 1, 3, 1, 4]);
  // => [1, 2, 3, 4]
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // 产生一个唯一数组: 来自所有参数数组中的不同元素.
  // _.union([1, 2, 3], [101, 2, 1, 10], [2, 1]);
  // => [1, 2, 3, 101, 10]
  _.union = function() {
    return _.uniq(_.flatten(arguments, true));
  };

  // 产生一个数组包含每个传入数组的交集。
  // _.intersection([1, 2, 3], [101, 2, 1, 10], [2, 1]);
  // => [1, 2]
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // 取出第一个array中不同于其他数组的元素.
  // _.difference([1, 2, 3, 4, 5], [5, 2, 10],[2,3,4]);
  // =>[1]
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip 将多个数组重置 -- 索引相同的各个数组中的元素全部取出合并为一个数组.
  // _.zip(['moe', 'larry', 'curly'], [30, 40, 50], [true, false, false]);
  // => [["moe", 30, true], ["larry", 40, false], ["curly", 50, false]]
  _.zip = function() {
    return _.unzip(slice.call(arguments));
  };

  // 对于 `_.zip` 的逆操作. 
  // _.zip([['a',1],['b',2],['c',3]]); 
  // =>[['a','b','c'],[1,2,3]].
  _.unzip = function(list) {
    var length = _.max(_.pluck(list, "length").concat(0));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(list, '' + i);
    }
    return results;
  };

  // 将列表转换成对象. 传入数组格式 `[key, value]`
  // 或者2个相同length的数组，一组为key一组为value.
  // _.object([["aa","bb"],["cc","dd"]]);
  // => {aa:"bb",cc:"dd"}
  //_.object(["aa","bb"],["cc","dd"]);
  // => {aa:"cc",bb:"dd"}
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // 如果浏览器不支持 indexOf ( **MSIE**),
  // 将会使用该方法. 如果匹配到则返回索引值，否则返回 -1
  // 优先使用 **ECMAScript 5** 内置的 `indexOf`.
  // 如果数组较大，并且已经排序, 对参数 **isSorted** 传递 true 来使用高效查询.
  // _.indexOf([1, 2, 3], 2);
  // => 1
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // 优先使用 **ECMAScript 5** 原生的 `lastIndexOf` .
  // _.lastIndexOf([1, 2, 3, 1, 2, 3], 2);
  // => 4
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // 产生一个有步长的数组. 如Python `range()`接口方法 .
  // _.range(10);
  // => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  // _.range(1, 11);
  // => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  // _.range(0, 30, 5);
  // => [0, 5, 10, 15, 20, 25]
  // _.range(0, -10, -1);
  // => [0, -1, -2, -3, -4, -5, -6, -7, -8, -9]
  // _.range(0);
  // => []
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // 可重复使用的构造函数原型设定.
  var ctor = function(){};

  // 创建对象绑定方法 (重置 `this`, 和 arguments, 可选项)
  // 优先使用 **ECMAScript 5**原生`Function.bind`.
  // var func = function(greeting){ return greeting + ': ' + this.name };
  // func = _.bind(func, {name : 'moe'}, 'hi');
  // func();
  // => 'hi: moe'
  _.bind = function(func, context) {
    var args, bound;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      ctor.prototype = null;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // 创建一个已经预填参数的版本来应用部分功能，不改变他动态的 this 上下文。
  
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // 绑定一个对象的方法到所有对象 确保所有的定义在一个对象上的回调方法属于它.
  // 把methodNames参数指定的方法绑定到对象上，这些方法就会在对象的上下文环境中执行。
  // 绑定函数用作事件处理函数时非常便利，否则函数被调用时this一点用也没有。
  // 如果不设置methodNames参数，对象上的所有方法都会被绑定
  // var buttonView = {
  //  label   : 'underscore',
  //  onClick : function(){ alert('clicked: ' + this.label); },
  //  onHover : function(){ console.log('hovering: ' + this.label); }
  // };
  // _.bindAll(buttonView);
  // jQuery('#underscore_button').bind('click', buttonView.onClick);
  // => When the button is clicked, this.label will have the correct value...
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) throw new Error("bindAll must be passed function names");
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // 缓存计算结果，节省CPU开销.
  // 如果传递了hashFunction参数，就用hashFunction的返回值作为key存储函数的计算结果。
  // hashFunction默认使用function的第一个参数作为key
  // var fibonacci = _.memoize(function(n) {
  //  return n < 2 ? n : fibonacci(n - 1) + fibonacci(n - 2);
})// });
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // 毫秒单位延迟执行, 然后使用传入的参数执行.
  // var log = _.bind(console.log, console);
  // _.delay(log, 1000, 'logged later');
  // => 'logged later' // Appears after one second.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // 延迟调用function直到当前调用栈清空，类似使用延时为0的setTimeout方法。
  // 有助于执行开销大的计算和无阻塞UI线程的HTML渲染。
  // _.defer(function(){ alert('deferred'); });
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // 返回一个像节流阀一样的函数，当重复调用函数的时候，最多每隔wait毫秒调用一次该函数。
  // 对于想控制一些触发频率较高的事件有帮助。
  // var throttled = _.throttle(updatePosition, 100);
  // $(window).scroll(throttled);
  _.throttle = function(func, wait, immediate) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      if (!previous && immediate === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // 重复调用一个防反跳的方法，每隔wait毫秒执行一次。
  // 所谓防反跳就是setTimeout前先clearTimeout，防止新定时器开始后还执行上次的定时任务。
  // 对于必须在一些输入（多是一些用户操作）停止到达后执行的行为有帮助。
  // 例如：渲染一个减价评论的预览，window resized后计算布局。 
  // var lazyLayout = _.debounce(calculateLayout, 300);
  // $(window).resize(lazyLayout);
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // 返回只运行一次的函数, 不管调用几次. 常用在惰性初始化的时候.
  // var initialize = _.once(createApplication);
  // initialize();
  // initialize();
  // Application is only created once.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // 把function包装进wrapper方法，function作为第一个参数。
  // 允许wrapper在function运行前后执行代码，并且有条件的执行。
  // var hello = function(name) { return "hello: " + name; };
  // hello = _.wrap(hello, function(func) {
  //   return "before, " + func("moe") + ", after";
  // });
  // hello();
  // => 'before, hello: moe, after'
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // 返回一个functions列表的组合物，其中每个函数消费其后跟随函数的返回值。
  // 在数学关系上，f(), g(), 和 h() 函数的组合产生f(g(h())).
  // var greet    = function(name){ return "hi: " + name; };
  // var exclaim  = function(statement){ return statement + "!"; };
  // var welcome = _.compose(exclaim, greet);
  // welcome('moe');
  // => 'hi: moe!'
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // 创建一个某生命体（函数或方法）被调用count次后才可执行的函数。
  // 当你想在一组异步请求都返回后执行一段程序时after方法非常有帮助。

  // var renderNotes = _.after(notes.length, render);
  // _.each(notes, function(note) {
  //   note.asyncSave({success: renderNotes});
  // });
  // renderNotes is run once, after all notes have saved.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // 检索出对象的属性名称.
  // 优先使用 **ECMAScript 5** 原生的 `Object.keys`
  // _.keys({one : 1, two : 2, three : 3});
  // => ["one", "two", "three"]
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys.push(key);
    return keys;
  };

  // 检索出对象的各个属性值.
  // _.keys({one : 1, two : 2, three : 3});
  // => [1, 2, 3]
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // 将对象转化成 `[key, value]` 形式对的数组.
  // _.pairs({one: 1, two: 2, three: 3});
  // => [["one", 1], ["two", 2], ["three", 3]]
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // 返回键值对换的对象，必须都为字符串.
  // _.invert({Moe: "Moses", Larry: "Louis", Curly: "Jerome"});
  // => {Moses: "Moe", Louis: "Larry", Jerome: "Curly"};
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // 返回对象中每个方法名称的列表.
  // 又名 `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // 将所有传递的属性扩展到给定对象中.
  // _.extend({name : 'moe'}, {age : 50});
  // => {name : 'moe', age : 50}
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // 返回一个包含有给定属性的对象副本.
  // _.pick({name : 'moe', age: 50, userid : 'moe1'}, 'name', 'age');
  // => {name : 'moe', age : 50}
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

  // 返回一个过滤掉给定属性的对象副本.
  // _.omit({name : 'moe', age : 50, userid : 'moe1'}, 'userid');
  // => {name : 'moe', age : 50}
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // 给定的对象中加入缺失的默认属性.
  // var iceCream = {flavor : "chocolate"};
  // _.defaults(iceCream, {flavor : "vanilla", sprinkles : "lots"});
  // => {flavor : "chocolate", sprinkles : "lots"}
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] === void 0) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // 创建一个浅复制的拷贝对象.任何嵌套的对象或数组都通过引用拷贝，不会复制。
  // _.clone({name : 'moe'});
  // => {name : 'moe'};
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // 在obj下调用，然后返回obj.
  // 为了实现 "tap into" 方法链, 对中间结果链内操作。
  // _.chain([1,2,3,200])
  //   .filter(function(num) { return num % 2 == 0; })
  //   .tap(alert)
  //   .map(function(num) { return num * num })
  //   .value();
  // => // [2, 200] (alerted)
  // => [4, 40000]
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // 内部递归的比较方法 for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // 相同的对象相等. `0 === -0`, b但是他们不相同.
    // 查看 [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // 由于 `null == undefined` 所以需要严格的比较.
    if (a == null || b == null) return a === b;
    // 打开所有 wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // 对比  `[[Class]]` 名称.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // 字符串, 数字, 日期, 和布尔值 对比 值.
      case '[object String]':
        // 原语和他们的包装对象等同; 从而, `"5"` 等同 `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN` 不等同  
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // 强制日期与布尔值使用原始值进行比较. 
        // 日期会用毫秒数进行比较. 
        // 注意吴无效的日期 与 NaN 是不等价的.
        return +a == +b;
      // 对于正则，对比元模式和标识.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // A假设环状的等同.检测环状结构算法.
    var length = aStack.length;
    while (length--) {
      // 线性搜索. 性能与嵌套的层数成反比.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // 添加第一个对象到遍历对象的栈中.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // 对对象和数组进行递归比较.
    if (className == '[object Array]') {
      // 有数组长度来决定是否有必要进行深度递归比较.
      size = a.length;
      result = size == b.length;
      if (result) {
        // 深度对比内容，忽略非数字属性.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // 不同构造函数的对象不相等, 但是不同frames下的Object也是不同的.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // 深度对比对象.
      for (var key in a) {
        if (_.has(a, key)) {
          // 对象属性计数.
          size++;
          // 深入对比每个成员.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // 确保2个对象均含有属性.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // 移除遍历对象栈中的第一个对象.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // 深度比较检查2个对象是否相等.
  // var moe   = {name : 'moe', luckyNumbers : [13, 27, 34]};
  // var clone = {name : 'moe', luckyNumbers : [13, 27, 34]};
  // moe == clone;
  // => false
  // _.isEqual(moe, clone);
  // => true
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  //给定的数组，对象或者字符串是否为空?
  // 空对象意味着没有可列举的自身属性.
  // _.isEmpty([1, 2, 3]);
  // => false
  // _.isEmpty({});
  // => true
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // 给定对象是否为DOM对象?
  // _.isElement(jQuery('body')[0]);
  // => true
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // 给定值是否为数组?
  // 优先采用 ECMA5 原生 Array.isArray
  // (function(){ return _.isArray(arguments); })();
  // => false
  // _.isArray([1,2,3]);
  // => true
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // 给定变量是否是对象?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // 添加相同类型判断方法： isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // 设置回退方法 (ahem, IE), 没有任何 Arguments 
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // 适当优化 `isFunction`.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // 对象是否为一个有穷数?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // 给定值是否为 `NaN`? (NaN 与 NaN不相等).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // 是否给了布尔值?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // 给定值是否等于 null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // 给定值是否等于 undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // 在对象中是否直接含有给定属性 (不包括原型).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions 工具函数
  // -----------------

  // 在 *noConflict* 模式下运行 underscore , 返回 `_` 作为含有的私有变量
  // 返回 Underscore 对象的引用.
  // var underscore = _.noConflict();
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // 为默认的迭代器保存函数标识.
  // var moe = {name : 'moe'};
  // moe === _.identity(moe);
  // => true
  _.identity = function(value) {
    return value;
  };

  // 执行 **n** 次函数.
  // _(3).times(function(){ genie.grantWish(); });
  _.times = function(n, iterator, context) {
    var accum = Array(Math.max(0, n));
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // 返回一个最大值最小值之前的整数.
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // 转义 HTML实体 列表.
  // _.escape('Curly, Larry & Moe');
  // => "Curly, Larry &amp; Moe"
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // 列出包含键值的正则表达式.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  //将 escaping 和 unescaping 字符串 切换 HTML 插值.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // 如果参数 `property` 是一个函数那么将对象作为上下文来调用它.
  // 否则返回对象.
  _.result = function(object, property) {
    if (object == null) return void 0;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // 对 undrscore 以混入方式添加自定义函数.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // 生成一个唯一的整数ID (在整个客户端会话中唯一).
  // 常用来最为 DOM 元素的临时ID.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // 默认情况下, Underscore 使用 ERB-style 模板分隔符, 
  // 可更改后替代为其他的分隔符.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // 当定制 `templateSettings`, 如果不想定义一个插入值
  // 评估转义正则表达式, 来达到不匹配.
  var noMatch = /(.)^/;

  // 对于某些字符需要进行二次的转义以保证可以放到字符串中.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, 和 John Resig's 实现相似.
  // Underscore 模板处理任意分隔符, 保留空白,正确的处理代码内引号里的转义.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // 通过交替，结合分隔符来形成正则表达式.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // 编译模板源, 适当转义字符串.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // 如果变量对象未被指定, 在本地存储值.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // 为了方便预编译，提供编译的函数源.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // 增加链，实现委托包装.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // 如果 Underscore 作为方法调用, 将返回一个包装可用于面向对象风格的对象
  // 这个包装器保存了 underscore 所有的方法.
  // 包装对象可悲链式使用.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // 将 Underscore 方法扩从到包装对象中.
  _.mixin(_);

  // 添加所有数组变化函数到包装器.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // 添加所有数组存储函数到包装器.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // 链式 Underscore 对象.
    chain: function() {
      this._chain = true;
      return this;
    },

    // 从包装对象和链式对象中提取属性.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);
