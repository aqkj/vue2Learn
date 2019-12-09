/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'
/**
 * 初始化继承
 * @param {Vue} Vue vue构造器
 */
export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   * 每个实例都有一个cid，每次extend时都会+1，并赋值给对应构造函数
   */
  Vue.cid = 0
  // 缓存cid
  let cid = 1

  /**
   * Class inheritance
   * 创建继承构造函数
   */
  Vue.extend = function (extendOptions: Object): Function {
    // 获取继承属性
    extendOptions = extendOptions || {}
    // 获取父实例
    const Super = this
    // 获取父实例的cid
    const SuperId = Super.cid
    // 获取缓存的构造函数
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    // 判断是否缓存，缓存则直接返回
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }
    // 获取当前name
    const name = extendOptions.name || Super.options.name
    // 判断是否非生产，非生产则校验名称
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }
    // 创建Sub构造器
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    // 获取super原型
    Sub.prototype = Object.create(Super.prototype)
    // 设置构造函数
    Sub.prototype.constructor = Sub
    // 设置cid
    Sub.cid = cid++
    // 合并属性
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // 设置super父
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    // 判断是否有props
    if (Sub.options.props) {
      // 初始化props
      initProps(Sub)
    }
    // 判断计算属性
    if (Sub.options.computed) {
      // 初始化计算属性
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 设置继承方法
    Sub.extend = Super.extend
    // 设置mixin方法
    Sub.mixin = Super.mixin
    // 设置use方法
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    // 获取父类资源
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    // 如果存在name则挂载给自身
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    // 设置父属性
    Sub.superOptions = Super.options
    // 设置继承属性
    Sub.extendOptions = extendOptions
    // 获取最终options
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    // 缓存构造器
    cachedCtors[SuperId] = Sub
    return Sub
  }
}
/**
 * 初始化props
 * @param {function} Comp 组件构造函数
 */
function initProps (Comp) {
  // 获取组件props
  const props = Comp.options.props
  // 遍历代理
  for (const key in props) {
    // 代理设置原型props属性getset
    proxy(Comp.prototype, `_props`, key)
  }
}
/**
 * 初始化computed
 * @param {function} Comp 组件构造函数
 */
function initComputed (Comp) {
  // 获取计算属性
  const computed = Comp.options.computed
  // 遍历属性
  for (const key in computed) {
    // 定义计算属性
    defineComputed(Comp.prototype, key, computed[key])
  }
}
