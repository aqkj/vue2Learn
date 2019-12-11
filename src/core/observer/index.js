/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 * 收集依赖并更新
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data
  /**
   * obServer构造函数
   * @param {any} value 需要挂载的值
   */
  constructor (value: any) {
    // 获取对应值
    this.value = value
    // 新建dep对象
    this.dep = new Dep()
    // 设置vmCount
    this.vmCount = 0
    // 给value订阅ob对象，并且挂载观察者对象
    def(value, '__ob__', this)
    // 判断value是否是数组
    if (Array.isArray(value)) {
      // 如果有proto的话
      if (hasProto) {
        protoAugment(value, arrayMethods)
      } else {
        // 不存在proto则将数组方法copy到value
        copyAugment(value, arrayMethods, arrayKeys)
      }
      // 如果是数组则调用观察数组方法
      this.observeArray(value)
    } else {
      // 非数组则调用walk
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   * 遍历对象属性，将对象和属性绑定get,set
   */
  walk (obj: Object) {
    // 获取对象属性数组
    const keys = Object.keys(obj)
    // 遍历对象属性
    for (let i = 0; i < keys.length; i++) {
      // 定义可反应的对象
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   * 观察列表数组的元素
   */
  observeArray (items: Array<any>) {
    // 遍历数组
    for (let i = 0, l = items.length; i < l; i++) {
      // 观察数组元素
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 * 设置对象的proto
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 * 拷贝src至target
 * @param {object} target 对象
 * @param {object} src copy源对象
 * @param {Array<string>} keys 属性数组
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  // 遍历数组字符串
  for (let i = 0, l = keys.length; i < l; i++) {
    // 获取对应key属性
    const key = keys[i]
    // 定义属性
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 * 给值创建一个observer实例
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 如果是一个非对象或者是vnode的话，直接返回undefined
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果存在ob对象
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    // 获取ob对象
    ob = value.__ob__
  } else if (
    shouldObserve && // 应该观察
    !isServerRendering() && // 非服务器渲染
    (Array.isArray(value) || isPlainObject(value)) && // 数组或者普通对象
    Object.isExtensible(value) && // 是否可扩展
    !value._isVue // 非vue对象
  ) {
    // 创建一个新的observer对象
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  // 返回ob对象
  return ob
}

/**
 * Define a reactive property on an Object.
 * 为对象定义一个可反应的属性
 * @param {object} obj 对象
 * @param {string} key 属性
 * @param {any} val 值
 * @param {Function} customSetter 自定义setter
 * @param {boolean} shallow 浅观察
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  // 创建dep对象
  const dep = new Dep()
  // 获取对象属性的描述符
  const property = Object.getOwnPropertyDescriptor(obj, key)
  // 如果不可配置，则直接返回undefined
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  // 获取描述符对应getter
  const getter = property && property.get
  // 获取对应setter
  const setter = property && property.set
  // 判断如果getter不存在，或者setter存在，并且方法参数只有两个
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key] // 设置val为object属性的值
  }
  // 如果非浅观察，则观察对应值
  let childOb = !shallow && observe(val)
  // 定义属性
  Object.defineProperty(obj, key, {
    enumerable: true, // 可枚举
    configurable: true, // 可配置
    get: function reactiveGetter () { // 设置get
      // 判断getter是否存在，存在则调用返回，否则返回对应值
      const value = getter ? getter.call(obj) : val
      // 判断是否有全局watcher
      if (Dep.target) {
        // 添加至target
        dep.depend()
        // 判断是否有子ob
        if (childOb) {
          // 子观察则对象的依赖也进行关联
          childOb.dep.depend()
          // 判断value是否为数组
          if (Array.isArray(value)) {
            // 则遍历关联依赖
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) { // 设置set
      // getter存在则获取getter，不存在则直接获取val
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      //  新值旧值相等则不处理
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      // 非生产环境则会用自定义set
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      // 如果getter存在setter不存在代表其为只读则直接返回
      if (getter && !setter) return
      // 如果setter存在
      if (setter) {
        // 调用setter并传入新值
        setter.call(obj, newVal)
      } else {
        // 不存在则重新设置val
        val = newVal
      }
      // 非浅观察则观察新值
      childOb = !shallow && observe(newVal)
      // 触发更新
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  if (!ob) {
    target[key] = val
    return val
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(target, key)) {
    return
  }
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  // 遍历数组
  for (let e, i = 0, l = value.length; i < l; i++) {
    // 获取对应值
    e = value[i]
    // 判断是否有observer对象
    e && e.__ob__ && e.__ob__.dep.depend()
    // 如果是数组则递归关联
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
