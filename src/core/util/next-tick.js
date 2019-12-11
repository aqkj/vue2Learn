/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'
/**
 * 是否使用微任务
 * 微任务在宏任务之后执行，宏任务为事件循环中的点击事件渲染页面等
 * 微任务有promise和MutationObserver他们会在宏任务处理完之后执行
 */
export let isUsingMicroTask = false

const callbacks = []
let pending = false
/**
 * 刷新callback
 */
function flushCallbacks () {
  // 等待为false
  pending = false
  // 返回新方法
  const copies = callbacks.slice(0)
  // 清空callback队列
  callbacks.length = 0
  // 遍历调用callback
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
/* istanbul ignore next, $flow-disable-line */
/**
 * 如果存在promise则使用promise进行调用
 * promise为微任务，会在宏任务之后执行所以使用promise
 */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
  /**
   * promise不存在则降级使用MutationObserver
   * 存在则使用
   * MutationObserver也是微任务会在宏任务之后执行
   */
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
  /**
   * 不存在则降级判断setImmediate
   * 他会在浏览器所有操作执行完成后调用
   * 目前只有ie支持
   */
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  /**
   * 以上都不支持则使用setTimeout
   * setTimeout会插入在事件循环任务队列的末尾
   * 所以也能实现更新修改后触发
   */
  // Fallback to setTimeout.
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}
/**
 * 下一次事件循环中调用对应callback
 * @param {function} cb 回调
 * @param {object} ctx 上下文
 */
export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  // 插入回调
  callbacks.push(() => {
    // 判断cb是否存在
    if (cb) {
      try {
        // 调用回调传入上下文
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) { // 不存在则调用resolve使用promise
      _resolve(ctx)
    }
  })
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    // 返回promise
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
