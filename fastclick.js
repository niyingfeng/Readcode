;(function () {
    'use strict';

    /**
     * @preserve FastClick: polyfill 浏览器UI中触摸事件时点击延迟的问题.
     *
     * @codingstandard ftlabs-jsv2
     * @copyright The Financial Times Limited [All Rights Reserved]
     * @license MIT License (see LICENSE.txt)
     */

    /*jslint browser:true, node:true*/
    /*global define, Event, Node*/


    /**
     * 在特定的layer上来初始化 fast-click 的监听
     *
     * @构造函数
     * @param {Element} layer 监听的layer
     * @param {Object} [options={}] 默认数据的重写参数
     */
    function FastClick(layer, options) {
        var oldOnClick;

        options = options || {};

        /**
         * 当前的点击是否是被标记的
         *
         * @type boolean
         */
        this.trackingClick = false;


        /**
         * 点击被标记时的时间戳
         *
         * @type number
         */
        this.trackingClickStart = 0;


        /**
         * 被标记点击的元素
         *
         * @type EventTarget
         */
        this.targetElement = null;


        /**
         * touch开始时的横坐标值
         *
         * @type number
         */
        this.touchStartX = 0;


        /**
         * touch开始时的纵坐标值
         *
         * @type number
         */
        this.touchStartY = 0;


        /**
         * 最后一次touch的id, 为Touch.identifier.
         *
         * @type number
         */
        this.lastTouchIdentifier = 0;


        /**
         * 标识 Touchmove 的分界线, 如超过后则取消触发点击.
         *
         * @type number
         */
        this.touchBoundary = options.touchBoundary || 10;


        /**
         * FastClick的layer.
         *
         * @type Element
         */
        this.layer = layer;

        /**
         * 判断为 tap(touchstart 和 touchend) 事件之间最小时间间隔
         *
         * @type number
         */
        this.tapDelay = options.tapDelay || 200;

        /**
         * 判断为 tap 的最大时间间隔
         *
         * @type number
         */
        this.tapTimeout = options.tapTimeout || 700;

        if (FastClick.notNeeded(layer)) {
            return;
        }

        // 部分老版本安卓没有 Function.prototype.bind
        function bind(method, context) {
            return function() { return method.apply(context, arguments); };
        }

        // 添加实例的几个事件方法
        var methods = ['onMouse', 'onClick', 'onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
        var context = this;
        for (var i = 0, l = methods.length; i < l; i++) {
            context[methods[i]] = bind(context[methods[i]], context);
        }

        // 更具需要来设置事件
        if (deviceIsAndroid) {
            layer.addEventListener('mouseover', this.onMouse, true);
            layer.addEventListener('mousedown', this.onMouse, true);
            layer.addEventListener('mouseup', this.onMouse, true);
        }

        layer.addEventListener('click', this.onClick, true);
        layer.addEventListener('touchstart', this.onTouchStart, false);
        layer.addEventListener('touchmove', this.onTouchMove, false);
        layer.addEventListener('touchend', this.onTouchEnd, false);
        layer.addEventListener('touchcancel', this.onTouchCancel, false);

        // 对于浏览器不支持事件 stopImmediatePropagation的hack一下 (e.g. Android 2)
        // 这是 FastClick 通常如何阻止 点击事件在冒泡到 FastClick layer 注册的回调方法之前就被取消。

        if (!Event.prototype.stopImmediatePropagation) {
            layer.removeEventListener = function(type, callback, capture) {
                var rmv = Node.prototype.removeEventListener;
                if (type === 'click') {
                    rmv.call(layer, type, callback.hijacked || callback, capture);
                } else {
                    rmv.call(layer, type, callback, capture);
                }
            };

            // 重写layer的绑定事件方法 单独处理click
            layer.addEventListener = function(type, callback, capture) {
                var adv = Node.prototype.addEventListener;
                if (type === 'click') {
                    adv.call(layer, type, callback.hijacked || (callback.hijacked = function(event) {
                        if (!event.propagationStopped) {
                            callback(event);
                        }
                    }), capture);
                } else {
                    adv.call(layer, type, callback, capture);
                }
            };
        }

        // 如果事件句柄已经被绑定在元素的 onclick 属性上, 会在 FastClick的onClick事件之前触发
        // 通过创建用户定义事件句柄函数，将其添加到监听中来解决
        if (typeof layer.onclick === 'function') {

            // 低于3.2的Android浏览器需要将 layer.onclick 指向新的引用
            // 如果直接传递，会有有一定问题
            oldOnClick = layer.onclick;
            layer.addEventListener('click', function(event) {
                oldOnClick(event);
            }, false);
            layer.onclick = null;
        }
    }

    /**
    * Windows Phone 8.1 欺骗性使用 user agent 伪装 Android and iPhone.
    *
    * @type boolean
    */
    var deviceIsWindowsPhone = navigator.userAgent.indexOf("Windows Phone") >= 0;

    /**
     * 安卓设备
     *
     * @type boolean
     */
    var deviceIsAndroid = navigator.userAgent.indexOf('Android') > 0 && !deviceIsWindowsPhone;


    /**
     * iOS设备
     *
     * @type boolean
     */
    var deviceIsIOS = /iP(ad|hone|od)/.test(navigator.userAgent) && !deviceIsWindowsPhone;


    /**
     * iOS 4 特殊标识
     *
     * @type boolean
     */
    var deviceIsIOS4 = deviceIsIOS && (/OS 4_\d(_\d)?/).test(navigator.userAgent);


    /**
     * iOS 6.0-7.* 需要手动处理目标元素
     *
     * @type boolean
     */
    var deviceIsIOSWithBadTarget = deviceIsIOS && (/OS [6-7]_\d/).test(navigator.userAgent);

    /**
     * 蓝莓设备
     *
     * @type boolean
     */
    var deviceIsBlackBerry10 = navigator.userAgent.indexOf('BB10') > 0;

    /**
     * 确认元素是否需要原生的点击事件.
     *
     * @param {EventTarget|Element} target 目标DOM元素
     * @returns {boolean} 如果需要原生的点击事件 返回 true
     */
    FastClick.prototype.needsClick = function(target) {
        switch (target.nodeName.toLowerCase()) {

        // 不对隐藏的 inputs 发送构造的点击事件 (issue #62)
        case 'button':
        case 'select':
        case 'textarea':
            if (target.disabled) {
                return true;
            }

            break;
        case 'input':

            // 由于iOS 6 的BUG， File inputs 需要真实点击 (issue #68)
            if ((deviceIsIOS && target.type === 'file') || target.disabled) {
                return true;
            }

            break;
        case 'label':
        case 'iframe': // iOS8 主屏程序能阻止事件冒泡到frames
        case 'video':
            return true;
        }

        // 还有bneedsclick的classname
        return (/\bneedsclick\b/).test(target.className);
    };


    /**
     * 确定给定元素是否需要调用焦点来模拟单击元素
     *
     * @param {EventTarget|Element} target 目标DOM元素
     * @returns {boolean} 如果需要调用焦点来模拟单击元素返回true
     */
    FastClick.prototype.needsFocus = function(target) {
        switch (target.nodeName.toLowerCase()) {
        case 'textarea':
            return true;
        case 'select':
            return !deviceIsAndroid;
        case 'input':
            switch (target.type) {
            case 'button':
            case 'checkbox':
            case 'file':
            case 'image':
            case 'radio':
            case 'submit':
                return false;
            }

            // 集中处理无意义的一些inputs
            return !target.disabled && !target.readOnly;
        default:
            return (/\bneedsfocus\b/).test(target.className);
        }
    };


    /**
     * 对于特殊元素发送click事件
     *
     * @param {EventTarget|Element} targetElement
     * @param {Event} event
     */
    FastClick.prototype.sendClick = function(targetElement, event) {
        var clickEvent, touch;

        // 在一些安卓设备下，需要先进行聚焦，否则无法调用合成的click事件 (#24)
        if (document.activeElement && document.activeElement !== targetElement) {
            document.activeElement.blur();
        }

        touch = event.changedTouches[0];

        // 合成一个点击事件, 添加一个额外属性以便于跟踪
        // 合成事件 还真没见过
        clickEvent = document.createEvent('MouseEvents');
        clickEvent.initMouseEvent(this.determineEventType(targetElement), true, true, window, 1, touch.screenX, touch.screenY, touch.clientX, touch.clientY, false, false, false, false, 0, null);
        clickEvent.forwardedTouchEvent = true;
        targetElement.dispatchEvent(clickEvent);
    };

    FastClick.prototype.determineEventType = function(targetElement) {

        //Issue #159: Android Chrome Select Box无法使用合成事件打开
        if (deviceIsAndroid && targetElement.tagName.toLowerCase() === 'select') {
            return 'mousedown';
        }

        return 'click';
    };


    /**
     * @param {EventTarget|Element} targetElement
     */
    FastClick.prototype.focus = function(targetElement) {
        var length;

        // Issue #160: 在iOS 7中, 一些元素 (例如 date datetime month) 会抛出一个模糊的 setSelectionRange 类型错误. 
        // 这些元素没有 selectionStart 和 selectionEnd 的整数属性, 不幸的是访问这个属性也会抛出错误导致无法检测. 
        // 只能使用判断类型来处理. Filed as Apple bug #15122724.
        if (deviceIsIOS && targetElement.setSelectionRange && targetElement.type.indexOf('date') !== 0 && targetElement.type !== 'time' && targetElement.type !== 'month') {
            length = targetElement.value.length;
            targetElement.setSelectionRange(length, length);
        } else {
            targetElement.focus();
        }
    };


    /**
     * 检测给定的元素是否是一个可滚动元素的子元素，如果是则标识一下
     *
     * @param {EventTarget|Element} targetElement
     */
    FastClick.prototype.updateScrollParent = function(targetElement) {
        var scrollParent, parentElement;

        scrollParent = targetElement.fastClickScrollParent;

        // 尝试检测元素是否在一个可滚动的layer内部. 
        // 在元素变换父级元素后需要重新检测
        if (!scrollParent || !scrollParent.contains(targetElement)) {
            parentElement = targetElement;
            do {
                if (parentElement.scrollHeight > parentElement.offsetHeight) {
                    scrollParent = parentElement;
                    targetElement.fastClickScrollParent = parentElement;
                    break;
                }

                parentElement = parentElement.parentElement;
            } while (parentElement);
        }

        // 如果可以总去更新追踪
        if (scrollParent) {
            scrollParent.fastClickLastScrollTop = scrollParent.scrollTop;
        }
    };


    /**
     * @param {EventTarget} targetElement
     * @returns {Element|EventTarget}
     */
    FastClick.prototype.getTargetElementFromEventTarget = function(eventTarget) {

        // 在部分老的浏览器内 (notably Safari on iOS 4.1 - see issue #56) 事件对象可能为 text节点.
        if (eventTarget.nodeType === Node.TEXT_NODE) {
            return eventTarget.parentNode;
        }

        return eventTarget;
    };


    /**
     * 在 touch 开始时, 记录 position 和 scroll offset.
     *
     * @param {Event} event
     * @returns {boolean}
     */
    FastClick.prototype.onTouchStart = function(event) {
        var targetElement, touch, selection;

        // 忽略多点 touch, 否则 在FastClick元素上的双指触摸放大缩小会被阻止 (issue #111).
        if (event.targetTouches.length > 1) {
            return true;
        }

        targetElement = this.getTargetElementFromEventTarget(event.target);
        touch = event.targetTouches[0];

        if (deviceIsIOS) {

            // 在iOS中 只有通过的事件才会触发文案的选择取消 (issue #49)
            selection = window.getSelection();
            if (selection.rangeCount && !selection.isCollapsed) {
                return true;
            }

            if (!deviceIsIOS4) {

                // iOS下奇怪的事件是当 alert 或者 confirm 对话框是被点击事件的回调方法打开的(issue #23):
                // when the user next taps anywhere else on the page, new touchstart and touchend events are dispatched
                // with the same identifier as the touch event that previously triggered the click that triggered the alert.
                // Sadly, there is an issue on iOS 4 that causes some normal touch events to have the same identifier as an
                // immediately preceeding touch event (issue #52), so this fix is unavailable on that platform.
                // Issue 120: touch.identifier is 0 when Chrome dev tools 'Emulate touch events' is set with an iOS device UA string,
                // which causes all touch events to be ignored. As this block only applies to iOS, and iOS identifiers are always long,
                // random integers, it's safe to to continue if the identifier is 0 here.
                if (touch.identifier && touch.identifier === this.lastTouchIdentifier) {
                    event.preventDefault();
                    return false;
                }

                this.lastTouchIdentifier = touch.identifier;

                // 如果目标元素是一个滚动元素的子元素时 (使用了 -webkit-overflow-scrolling: touch) 并且:
                // 1) 用户在滚动的layer上滚动
                // 2) 用户使用tap来停止滚动
                // 那么 event.target 的最后的 touchend 事件将是用户最后手指下面的元素的事件
                // 当滚动开始时, 会触发 FastClick 将点击事件传递到那个layer - unless a check
                // 除非在发送合成点击事件前检测其父级layer并非是滚动的 (issue #42).
                this.updateScrollParent(targetElement);
            }
        }

        this.trackingClick = true;
        this.trackingClickStart = event.timeStamp;
        this.targetElement = targetElement;

        this.touchStartX = touch.pageX;
        this.touchStartY = touch.pageY;

        // 防止双击触发fast click (issue #36)
        if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
            event.preventDefault();
        }

        return true;
    };


    /**
     * 基于 touchmove 事件对象, 检测在touch从开始位置移动是否超过某一阀值.
     *
     * @param {Event} event
     * @returns {boolean}
     */
    FastClick.prototype.touchHasMoved = function(event) {
        var touch = event.changedTouches[0], boundary = this.touchBoundary;

        // 检测X，Y方向上移动的距离 是否超过阀值
        if (Math.abs(touch.pageX - this.touchStartX) > boundary || Math.abs(touch.pageY - this.touchStartY) > boundary) {
            return true;
        }

        return false;
    };


    /**
     * 更新最后的位置
     *
     * @param {Event} event
     * @returns {boolean}
     */
    FastClick.prototype.onTouchMove = function(event) {
        if (!this.trackingClick) {
            return true;
        }

        // 如果此次 touch 算作移动 , 取消该点击的跟踪
        if (this.targetElement !== this.getTargetElementFromEventTarget(event.target) || this.touchHasMoved(event)) {
            this.trackingClick = false;
            this.targetElement = null;
        }

        return true;
    };


    /**
     * 尝试对给定的标签元素找到其标签控件.
     *
     * @param {EventTarget|HTMLLabelElement} labelElement
     * @returns {Element|null}
     */
    FastClick.prototype.findControl = function(labelElement) {

        // 新浏览器支持H5空间的快速路径
        if (labelElement.control !== undefined) {
            return labelElement.control;
        }

        // 支持touch的所有浏览器均支持HTML5 htmlFor 属性
        if (labelElement.htmlFor) {
            return document.getElementById(labelElement.htmlFor);
        }

        // 如果没有属性支持, 尝试检测第一个后代元素
        return labelElement.querySelector('button, input:not([type=hidden]), keygen, meter, output, progress, select, textarea');
    };


    /**
     * 在 touch end 时，立即确定是否发送 click
     *
     * @param {Event} event
     * @returns {boolean}
     */
    FastClick.prototype.onTouchEnd = function(event) {
        var forElement, trackingClickStart, targetTagName, scrollParent, touch, targetElement = this.targetElement;

        if (!this.trackingClick) {
            return true;
        }

        // 阻止构造的快速双击 (issue #36)
        if ((event.timeStamp - this.lastClickTime) < this.tapDelay) {
            this.cancelNextClick = true;
            return true;
        }

        if ((event.timeStamp - this.trackingClickStart) > this.tapTimeout) {
            return true;
        }

        // 重置错误的input上的点击取消 (issue #156).
        this.cancelNextClick = false;

        this.lastClickTime = event.timeStamp;

        trackingClickStart = this.trackingClickStart;
        this.trackingClick = false;
        this.trackingClickStart = 0;

        // 在一些iOS设备中, 如果目标元素的层正处于过渡变换或者滚动的时候，
        // 其对于事件的支持是无效的除非再次手动检测. 
        // See issue #57; also filed as rdar://13048589 .
        if (deviceIsIOSWithBadTarget) {
            touch = event.changedTouches[0];

            // 在某些情况下 elementFromPoint 未负数, 所以阻止将目标元素设置为null
            targetElement = document.elementFromPoint(touch.pageX - window.pageXOffset, touch.pageY - window.pageYOffset) || targetElement;
            targetElement.fastClickScrollParent = this.targetElement.fastClickScrollParent;
        }

        targetTagName = targetElement.tagName.toLowerCase();
        if (targetTagName === 'label') {
            forElement = this.findControl(targetElement);
            if (forElement) {
                this.focus(targetElement);
                if (deviceIsAndroid) {
                    return false;
                }

                targetElement = forElement;
            }
        } else if (this.needsFocus(targetElement)) {

            // Case 1: If the touch started a while ago (best guess is 100ms based on tests for issue #36) then focus will be triggered anyway. Return early and unset the target element reference so that the subsequent click will be allowed through.
            // Case 2: Without this exception for input elements tapped when the document is contained in an iframe, then any inputted text won't be visible even though the value attribute is updated as the user types (issue #37).
            if ((event.timeStamp - trackingClickStart) > 100 || (deviceIsIOS && window.top !== window && targetTagName === 'input')) {
                this.targetElement = null;
                return false;
            }

            this.focus(targetElement);
            this.sendClick(targetElement, event);

            // Select elements need the event to go through on iOS 4, otherwise the selector menu won't open.
            // Also this breaks opening selects when VoiceOver is active on iOS6, iOS7 (and possibly others)
            if (!deviceIsIOS || targetTagName !== 'select') {
                this.targetElement = null;
                event.preventDefault();
            }

            return false;
        }

        if (deviceIsIOS && !deviceIsIOS4) {

            // Don't send a synthetic click event if the target element is contained within a parent layer that was scrolled
            // and this tap is being used to stop the scrolling (usually initiated by a fling - issue #42).
            scrollParent = targetElement.fastClickScrollParent;
            if (scrollParent && scrollParent.fastClickLastScrollTop !== scrollParent.scrollTop) {
                return true;
            }
        }

        // Prevent the actual click from going though - unless the target node is marked as requiring
        // real clicks or if it is in the whitelist in which case only non-programmatic clicks are permitted.
        if (!this.needsClick(targetElement)) {
            event.preventDefault();
            this.sendClick(targetElement, event);
        }

        return false;
    };


    /**
     * touch取消, 则停止跟踪此次点击.
     *
     * @returns {void}
     */
    FastClick.prototype.onTouchCancel = function() {
        this.trackingClick = false;
        this.targetElement = null;
    };


    /**
     * 确定是否允许鼠标事件.
     *
     * @param {Event} event
     * @returns {boolean}
     */
    FastClick.prototype.onMouse = function(event) {

        // 如果没有设置目标元素则允许事件 (因为touch事件并没有触发)
        if (!this.targetElement) {
            return true;
        }

        // 已被标识的 则直接通过
        if (event.forwardedTouchEvent) {
            return true;
        }

        // 为一个特殊对象上编码合成的事件 直接通过
        if (!event.cancelable) {
            return true;
        }

        // 检测目标元素是否是允许的鼠标事件;
        // 除非是手动开启，否者 阻止非触摸点击事件触发动作避免幽灵点击与双击
        if (!this.needsClick(this.targetElement) || this.cancelNextClick) {

            // 防止任何用户添加的监听在此被FastClick 触发
            if (event.stopImmediatePropagation) {
                event.stopImmediatePropagation();
            } else {

                // 浏览器对于不支持 Event#stopImmediatePropagation 的hack (e.g. Android 2)
                // 这边在初始化中 进行了逻辑处理
                event.propagationStopped = true;
            }

            // 阻止冒泡 取消默认事件
            event.stopPropagation();
            event.preventDefault();

            return false;
        }

        // If the mouse event is permitted, return true for the action to go through.
        return true;
    };


    /**
     * 在实际点击中, 确定是否是触摸产生的点击, 一个点击行为的发生应该在一次触摸之后（需要取消或者避免重复）
     * 应该允许真实的点击
     *
     * @param {Event} event
     * @returns {boolean}
     */
    FastClick.prototype.onClick = function(event) {
        var permitted;

        // 避免第三方的代码中使用了类似与FastClick的库来触发点击事件
        // 在此情况下 设置点击跟踪标识为false，回归初始化 会使 ontouchend 更早返回
        if (this.trackingClick) {
            this.targetElement = null;
            this.trackingClick = false;
            return true;
        }

        // 在iOS的奇怪行为 (issue #18): 
        // 如果一个提交元素在form表单中并且用户模拟点击或者点击弹出键盘上的 GO 按钮
        // 就会导致将以提交的输入元素作为目标触发一种“假”单击事件.
        if (event.target.type === 'submit' && event.detail === 0) {
            return true;
        }

        permitted = this.onMouse(event);

        // 只有未设置 targetElement 点击才不通过. 确保在 onMouse 检测 !targetElement失败以及浏览器点击不通过.
        if (!permitted) {
            this.targetElement = null;
        }

        // 如果点击被允许 返回action并且通过.
        return permitted;
    };


    /**
     * 移除所有 FastClick 对象的事件监听.
     *
     * @returns {void}
     */
    FastClick.prototype.destroy = function() {
        var layer = this.layer;

        if (deviceIsAndroid) {
            layer.removeEventListener('mouseover', this.onMouse, true);
            layer.removeEventListener('mousedown', this.onMouse, true);
            layer.removeEventListener('mouseup', this.onMouse, true);
        }

        layer.removeEventListener('click', this.onClick, true);
        layer.removeEventListener('touchstart', this.onTouchStart, false);
        layer.removeEventListener('touchmove', this.onTouchMove, false);
        layer.removeEventListener('touchend', this.onTouchEnd, false);
        layer.removeEventListener('touchcancel', this.onTouchCancel, false);
    };


    /**
     * 检测 layer 是否有需要实例化 FastClick.
     *
     * @param {Element} layer 被监听的layer
     */
    FastClick.notNeeded = function(layer) {
        var metaViewport;
        var chromeVersion;
        var blackberryVersion;
        var firefoxVersion;

        // 设备不支持触摸事件的则不需要FastClick
        if (typeof window.ontouchstart === 'undefined') {
            return true;
        }

        // Chrome版本 - 0为其他浏览器
        chromeVersion = +(/Chrome\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

        if (chromeVersion) {

            if (deviceIsAndroid) {
                metaViewport = document.querySelector('meta[name=viewport]');

                if (metaViewport) {
                    // Android下的Chrome含有 user-scalable="no" 不需要 FastClick (issue #89)
                    if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
                        return true;
                    }
                    // Chrome 32 以及以上的含有 width=device-width or less 不需要 FastClick
                    if (chromeVersion > 31 && document.documentElement.scrollWidth <= window.outerWidth) {
                        return true;
                    }
                }

            // 桌面版本 Chrome 不需要 FastClick (issue #15)
            } else {
                return true;
            }
        }

        if (deviceIsBlackBerry10) {
            blackberryVersion = navigator.userAgent.match(/Version\/([0-9]*)\.([0-9]*)/);

            // BlackBerry 10.3+ 不需要加载 Fastclick 库.
            // https://github.com/ftlabs/fastclick/issues/251
            if (blackberryVersion[1] >= 10 && blackberryVersion[2] >= 3) {
                metaViewport = document.querySelector('meta[name=viewport]');

                if (metaViewport) {
                    // user-scalable=no 消除了点击延迟.
                    if (metaViewport.content.indexOf('user-scalable=no') !== -1) {
                        return true;
                    }
                    // width=device-width (或者 less than device-width) 消除了点击延迟.
                    if (document.documentElement.scrollWidth <= window.outerWidth) {
                        return true;
                    }
                }
            }
        }

        // IE10 含有 -ms-touch-action: none 或者 manipulation, 为禁用双击缩放 (issue #97)
        if (layer.style.msTouchAction === 'none' || layer.style.touchAction === 'manipulation') {
            return true;
        }

        // Firefox版本 - 0为其他浏览器
        firefoxVersion = +(/Firefox\/([0-9]+)/.exec(navigator.userAgent) || [,0])[1];

        if (firefoxVersion >= 27) {
            // Firefox 27+ 如果内容不可缩放则没有触摸延迟 - https://bugzilla.mozilla.org/show_bug.cgi?id=922896

            metaViewport = document.querySelector('meta[name=viewport]');
            if (metaViewport && (metaViewport.content.indexOf('user-scalable=no') !== -1 || document.documentElement.scrollWidth <= window.outerWidth)) {
                return true;
            }
        }

        // IE11: 不再支持前缀 -ms-touch-action ，建议使用无前缀形式
        // http://msdn.microsoft.com/en-us/library/windows/apps/Hh767313.aspx
        if (layer.style.touchAction === 'none' || layer.style.touchAction === 'manipulation') {
            return true;
        }

        return false;
    };


    /**
     * 创建一个 FastClick 对象的工厂方法
     *
     * @param {Element} layer 监听的layer
     * @param {Object} [options={}] 自定义参数
     */
    FastClick.attach = function(layer, options) {
        return new FastClick(layer, options);
    };


    if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {

        // AMD. 加载异步模块
        define(function() {
            return FastClick;
        });
    } else if (typeof module !== 'undefined' && module.exports) {
        module.exports = FastClick.attach;
        module.exports.FastClick = FastClick;
    } else {
        window.FastClick = FastClick;
    }
}());