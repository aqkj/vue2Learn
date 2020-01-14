/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'
// 存储uid
let uid = 0
/**
 * 初始化mixin
 * @param {function} Vue vue构造器
 */
export function initMixin (Vue: Class<Component>) {
  /**
   * 设置初始化方法
   * @param {object} options vue配置
   */
  Vue.prototype._init = function (options?: Object) {
    // 获取当前vue实例
    const vm: Component = this
    // 设置uid
    vm._uid = uid++
    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // isVue用于判断是否为vue对象，并且避免被后期挂载getset观察到
    vm._isVue = true
    // merge options
    // 判断是否存在options，并且是组件isComponent
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      // 初始化内部组件
      initInternalComponent(vm, options)
    } else {
      // 合并配置到$options
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') { // 如果非生产环境
      // 初始化代理
      initProxy(vm)
    } else {
      // 获取渲染代理
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    // 初始化生命周期
    initLifecycle(vm)
    // 初始化event
    initEvents(vm)
    // 初始化渲染
    initRender(vm)
    callHook(vm, 'beforeCreate')
    // 初始化解析inject
    initInjections(vm) // resolve injections before data/props
    // 初始化状态
    initState(vm)
    // 初始化provide
    initProvide(vm) // resolve provide after data/props
    // 调用created钩子
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    // 判断是否存在el配置
    if (vm.$options.el) {
      // 调用$mount挂载
      vm.$mount(vm.$options.el)
    }
  }
}
/**
 * 初始化内部组件
 * @param {vm} vm vue实例
 * @param {object} options vue配置
 */
export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  // 设置options并且设置原型为构造函数的配置
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  // 获取父vnode
  const parentVnode = options._parentVnode
  // 获取父
  opts.parent = options.parent
  // 设置父vnode
  opts._parentVnode = parentVnode
  // 设置组件options为父组件options
  const vnodeComponentOptions = parentVnode.componentOptions
  // 设置数据为组件配置options
  opts.propsData = vnodeComponentOptions.propsData
  // 设置监听
  opts._parentListeners = vnodeComponentOptions.listeners
  // 设置父渲染的子
  opts._renderChildren = vnodeComponentOptions.children
  // 设置父组件的tag
  opts._componentTag = vnodeComponentOptions.tag
  // 判断是否存在render
  if (options.render) {
    // 获取render
    opts.render = options.render
    // 获取静态render
    opts.staticRenderFns = options.staticRenderFns
  }
}
/**
 * 解析构造函数配置
 * 内部一些属性字段可以在vue.extend方法实现部分看到
 * @param {function} Ctor 构造函数
 */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  // 获取构造函数配置
  let options = Ctor.options
  // 如果构造函数有父级
  if (Ctor.super) {
    // 解析父级的配置
    const superOptions = resolveConstructorOptions(Ctor.super)
    // 缓存父类配置
    const cachedSuperOptions = Ctor.superOptions
    // 判断父类配置和解析的父类配置是否不同
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      // 不同则更新配置
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      // 间隙修改后的信息
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      // 判断是否存在修改的配置
      if (modifiedOptions) {
        // 存在则合并至继承属性
        extend(Ctor.extendOptions, modifiedOptions)
      }
      // 获取合并配置
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      // 判断是否有name
      if (options.name) {
        // 挂载组件
        options.components[options.name] = Ctor
      }
    }
  }
  // 返回配置
  return options
}
/**
 * 解析修改配置
 * @param {function} Ctor 构造函数
 */
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  // 定义修改
  let modified
  // 获取构造函数配置
  const latest = Ctor.options
  // 获取构造函数最后配置
  const sealed = Ctor.sealedOptions
  // 遍历配置属性
  for (const key in latest) {
    // 如果配置值不同
    if (latest[key] !== sealed[key]) {
      // 判断modified不存在
      if (!modified) modified = {}
      // 存储不同的属性值
      modified[key] = latest[key]
    }
  }
  // 返回修改的信息
  return modified
}
