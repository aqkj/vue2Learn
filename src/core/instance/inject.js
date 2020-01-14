/* @flow */

import { hasOwn } from 'shared/util'
import { warn, hasSymbol } from '../util/index'
import { defineReactive, toggleObserving } from '../observer/index'
/**
 * 初始化provide
 * @param {*} vm
 */
export function initProvide (vm: Component) {
  // 获取配置provide
  const provide = vm.$options.provide
  // 如果provide存在
  if (provide) {
    // 如果是方法则获取返回值，将其值挂载到_provided属性上
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}
/**
 * 初始化inject
 * @param {*} vm
 */
export function initInjections (vm: Component) {
  // 解析inject
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    toggleObserving(false)
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        defineReactive(vm, key, result[key])
      }
    })
    toggleObserving(true)
  }
}
/**
 * 解析inject
 * @param {any} inject inject属性
 * @param {component} vm vue实例
 */
export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    // 获取key数组
    const keys = hasSymbol
      ? Reflect.ownKeys(inject)
      : Object.keys(inject)
    // 遍历keys
    for (let i = 0; i < keys.length; i++) {
      // 获取key值
      const key = keys[i]
      // #6574 in case the inject object is observed...
      // 如果key为__ob__则忽略
      if (key === '__ob__') continue
      // 获取provideKey，父实例provide的属性
      const provideKey = inject[key].from
      // 获取实例
      let source = vm
      while (source) {
        // 判断是否存在provided
        if (source._provided && hasOwn(source._provided, provideKey)) {
          // 存在则获取provide值，并设置到result上
          result[key] = source._provided[provideKey]
          break
        }
        // 不存在则循环获取父级
        source = source.$parent
      }
      // 如果到最上级的实例了
      if (!source) {
        // 判断是否存在default属性默认值
        if ('default' in inject[key]) {
          // 获取default值
          const provideDefault = inject[key].default
          // 如果default是一个方法，则获取方法返回值，否则获取值
          result[key] = typeof provideDefault === 'function'
            ? provideDefault.call(vm)
            : provideDefault
        } else if (process.env.NODE_ENV !== 'production') {
          // 如果不存在则报警告
          warn(`Injection "${key}" not found`, vm)
        }
      }
    }
    // 返回解析后的{key:value}值
    return result
  }
}
