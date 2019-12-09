/* not type checking this file because flow doesn't play well with Proxy */

import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

let initProxy
/**
 * 非生产
 */
if (process.env.NODE_ENV !== 'production') {
  // 允许的全局方法
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  )
  /**
   * 警告不存在
   * @param {object} target 对象
   * @param {string} key 属性
   */
  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }
  /**
   * 警告保留的前缀
   * @param {*} target
   * @param {*} key
   */
  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals. ' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }
  /**
   * 判断是否存在proxy对象
   */
  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)
  // 存在proxy
  if (hasProxy) {
    // 设置内置修饰符
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    // 代理keycode
    config.keyCodes = new Proxy(config.keyCodes, {
      // 设置keycode
      set (target, key, value) {
        // 设置为非内置时报错
        if (isBuiltInModifier(key)) {
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          // 设置对应keycode
          target[key] = value
          return true
        }
      }
    })
  }
  // has处理
  const hasHandler = {
    // 设置has处理
    has (target, key) {
      // 判断key是否在target内
      const has = key in target
      // 判断key是否为允许的全局方法，如果不是，则判断key是否为字符串，并且判断是否_开头，并且判断其不在data内
      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
      // 如果不在target内，并且非允许的
      if (!has && !isAllowed) {
        // 则判断是否在data内，在data内则保存内置的前缀
        if (key in target.$data) warnReservedPrefix(target, key)
        // 报错，不存在
        else warnNonPresent(target, key)
      }
      return has || !isAllowed
    }
  }
  // get处理
  const getHandler = {
    // 设置get
    get (target, key) {
      // 判断key是否为字符串，并且不在target内
      if (typeof key === 'string' && !(key in target)) {
        // 则判断是否在data内，在data内则保存内置的前缀
        if (key in target.$data) warnReservedPrefix(target, key)
        // 报错，不存在
        else warnNonPresent(target, key)
      }
      // 返回对应值
      return target[key]
    }
  }
  /**
   * 初始化proxy
   */
  initProxy = function initProxy (vm) {
    // 判断是否存在proxy
    if (hasProxy) {
      // determine which proxy handler to use
      // 存在则获取实例配置
      const options = vm.$options
      // 获取handlers
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
      // 设置创建proxy
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      // 否则设置自身
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
