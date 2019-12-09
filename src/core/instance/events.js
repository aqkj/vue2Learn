/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'
/**
 * 初始化event
 * @param {any} vm vue实例
 */
export function initEvents (vm: Component) {
  // 设置私有events
  vm._events = Object.create(null)
  // 判断是否有钩子event
  vm._hasHookEvent = false
  // init parent attached events
  // 获取父级监听
  const listeners = vm.$options._parentListeners
  // 判断监听是否存在
  if (listeners) {
    // 更新组件监听
    updateComponentListeners(vm, listeners)
  }
}

let target: any
/**
 * 添加监听
 * @param {string} event eventName
 * @param {function} fn event方法
 */
function add (event, fn) {
  // 设置监听
  target.$on(event, fn)
}
/**
 * 移除监听
 * @param {string} event eventname
 * @param {function} fn event方法
 */
function remove (event, fn) {
  // 移除监听
  target.$off(event, fn)
}
/**
 * 创建单次触发
 * @param {string} event eventName
 * @param {function} fn 方法
 */
function createOnceHandler (event, fn) {
  // 获取target
  const _target = target
  // 创建单次触发方法
  return function onceHandler () {
    // 调用方法，获取返回值
    const res = fn.apply(null, arguments)
    // 如果返回值不为null则移除event
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}
/**
 * 更新组件监听
 * @param {vue} vm vue实例
 * @param {object} listeners 监听
 * @param {object} oldListeners 旧监听
 */
export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  // 设置target为当前实例
  target = vm
  // 更新监听
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  // 清空实例
  target = undefined
}

export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }

  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // array of events
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
