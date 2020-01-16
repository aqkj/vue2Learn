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
/**
 * 事件mixins
 * @param {object} Vue Vue构造器
 */
export function eventsMixin (Vue: Class<Component>) {
  // 钩子匹配正则
  const hookRE = /^hook:/
  /**
   * 添加订阅
   * @param {string|string[]} event 事件名
   * @param {Function} fn 事件回调
   */
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    // 获取vm实例
    const vm: Component = this
    // 判断事件名是否为数组
    if (Array.isArray(event)) {
      // 遍历事件名数组
      for (let i = 0, l = event.length; i < l; i++) {
        // 循环绑定对应事件
        vm.$on(event[i], fn)
      }
      // 非数组
    } else {
      // 初始化_events对象并将回调插入到对应事件名称的回调数组下
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      // 如果匹配到事件名称为hook:开头。则代表其为钩子事件
      if (hookRE.test(event)) {
        // 设置hasHookEvent为true
        vm._hasHookEvent = true
      }
    }
    // 返回当前实例
    return vm
  }
  /**
   * 创建一次性的订阅
   * 在第一次调用后会进行off取消
   * @param {string} event 事件名称
   * @param {Function} fn 事件回调
   */
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    // 获取实例
    const vm: Component = this
    // 重写绑定回调
    function on () {
      // 解除订阅
      vm.$off(event, on)
      // 调用传入的回调
      fn.apply(vm, arguments)
    }
    // 设置on的fn,用于off时找到对应的回调方法
    on.fn = fn
    // 添加订阅
    vm.$on(event, on)
    // 返回vm实例
    return vm
  }
  /**
   * 移除事件订阅
   * @param {string | string[]} event 事件名称
   * @param {Function} fn 事件回调
   */
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    // 获取当前实例
    const vm: Component = this
    // all
    // 如果方法没传入参数
    if (!arguments.length) {
      // 清空所有的事件
      vm._events = Object.create(null)
      // 返回当前实例
      return vm
    }
    // array of events
    // 如果事件名称为数组
    if (Array.isArray(event)) {
      // 遍历事件名称
      for (let i = 0, l = event.length; i < l; i++) {
        // 挨个移除事件名，并且传入移除的回调方法
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event
    // 找到对应事件名称的回调数组
    const cbs = vm._events[event]
    // 如果回调数组不存在，则不处理
    if (!cbs) {
      // 返回vm实例
      return vm
    }
    // 如果传入的回调方法不存在
    if (!fn) {
      // 清空当前事件所有的回调
      vm._events[event] = null
      // 返回vm实例
      return vm
    }
    // specific handler
    let cb
    // 获取事件回调长度
    let i = cbs.length
    // 遍历
    while (i--) {
      // 回去回调方法
      cb = cbs[i]
      // 判断该方法是否和传入的方法相同，或者once时回调的.fn是否跟当前传入的相同
      if (cb === fn || cb.fn === fn) {
        // 相同则移除对应位置
        cbs.splice(i, 1)
        // 跳出循环
        break
      }
    }
    // 返回当前实例
    return vm
  }
  /**
   * 事件发布通知，订阅的事件将执行对应回调
   * @param {string} event 事件名称
   */
  Vue.prototype.$emit = function (event: string): Component {
    // 回去实例
    const vm: Component = this
    // 如果非生产
    if (process.env.NODE_ENV !== 'production') {
      // 获取小写的事件名称
      const lowerCaseEvent = event.toLowerCase()
      // 如果小写的事件名称跟当前事件名称不相同，并且当前实例的事件对象中存在小写的事件，则提示
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
    // 获取当前事件名称的所有事件回调
    let cbs = vm._events[event]
    // 判断回调是否存在
    if (cbs) {
      // 如果回调长度大于1，通过toArray返回一个新的数组列表
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      // 获取发布事件传入的除第一个参数以后的参数数组
      const args = toArray(arguments, 1)
      // 信息
      const info = `event handler for "${event}"`
      // 遍历回调
      for (let i = 0, l = cbs.length; i < l; i++) {
        // 调用方法并且拦截错误
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    // 返回对应的实例
    return vm
  }
}
