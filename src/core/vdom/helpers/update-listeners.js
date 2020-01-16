/* @flow */

import {
  warn,
  invokeWithErrorHandling
} from 'core/util/index'
import {
  cached,
  isUndef,
  isTrue,
  isPlainObject
} from 'shared/util'
/**
 * 规范eventname
 */
const normalizeEvent = cached((name: string): {
  name: string,
  once: boolean,
  capture: boolean,
  passive: boolean,
  handler?: Function,
  params?: Array<any>
} => {
  // 被动开头带有&
  const passive = name.charAt(0) === '&'
  // 设置name
  name = passive ? name.slice(1) : name
  // 单次开头带有~
  const once = name.charAt(0) === '~' // Prefixed last, checked first
  // 设置name
  name = once ? name.slice(1) : name
  // 捕获浅醉含有!
  const capture = name.charAt(0) === '!'
  // 获取name
  name = capture ? name.slice(1) : name
  // 返回对应配置数据
  return {
    name,
    once,
    capture,
    passive
  }
})
/**
 * 创建触发器
 * @param {function} fns 方法数组或者方法
 * @param {any} vm 当前vue实例
 */
export function createFnInvoker (fns: Function | Array<Function>, vm: ?Component): Function {
  // 创建invoker方法
  function invoker () {
    // 获取fns
    const fns = invoker.fns
    // 判断是否为数组
    if (Array.isArray(fns)) {
      // clone方法数组
      const cloned = fns.slice()
      // 遍历方法
      for (let i = 0; i < cloned.length; i++) {
        // 触发方法并且拦截错误
        invokeWithErrorHandling(cloned[i], null, arguments, vm, `v-on handler`)
      }
    } else {
      // return handler return value for single handlers
      return invokeWithErrorHandling(fns, null, arguments, vm, `v-on handler`)
    }
  }
  // 设置方法fns
  invoker.fns = fns
  // 返回invoker
  return invoker
}
/**
 * 更新事件监听对象
 * @param {object} on 新监听
 * @param {object} oldOn 旧监听
 * @param {function} add 添加事件方法
 * @param {function} remove 移除事件方法
 * @param {function} createOnceHandler 单次触发方法
 * @param {object} vm vm实例
 */
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function,
  createOnceHandler: Function,
  vm: Component
) {
  let name, def, cur, old, event
  // 获取新监听
  for (name in on) {
    // 获取listenter值
    def = cur = on[name]
    // 获取对应旧值
    old = oldOn[name]
    // 规范化eventName
    event = normalizeEvent(name)
    /* istanbul ignore if */
    if (__WEEX__ && isPlainObject(def)) {
      cur = def.handler
      event.params = def.params
    }
    // 判断当前新的值是否未定义
    if (isUndef(cur)) {
      // 警告
      process.env.NODE_ENV !== 'production' && warn(
        `Invalid handler for event "${event.name}": got ` + String(cur),
        vm
      )
    } else if (isUndef(old)) { // 如果旧值未定义
      if (isUndef(cur.fns)) { // 判断fns是否未定义
        cur = on[name] = createFnInvoker(cur, vm) // 创建触发器并赋值给对应监听
      }
      // 判断是否是单次执行
      if (isTrue(event.once)) {
        // 创建单次触发器
        cur = on[name] = createOnceHandler(event.name, cur, event.capture)
      }
      // 新增事件
      add(event.name, cur, event.capture, event.passive, event.params)
    } else if (cur !== old) { // 如果旧的跟当前不同
      old.fns = cur // 则将旧fns设置为当前
      on[name] = old // 设置当前监听为old
    }
  }
  // 遍历old
  for (name in oldOn) {
    if (isUndef(on[name])) { // 如果on[name]不存在，
      event = normalizeEvent(name) // 规范化名称
      remove(event.name, oldOn[name], event.capture) // 移除对应事件
    }
  }
}
