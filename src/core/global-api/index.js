/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'
/**
 * 初始化全局api
 * @param {Vue} Vue Vue构造器
 */
export function initGlobalAPI (Vue: GlobalAPI) {
  // 配置
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 挂载属性config
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 一些工具方法
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }
  // 挂载set方法
  Vue.set = set
  // delete方法
  Vue.delete = del
  // nextTick方法
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // observable方法
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }
  // vue配置
  Vue.options = Object.create(null)
  // 挂载资源类型
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue
  // 合并组件到components
  extend(Vue.options.components, builtInComponents)
  // 初始化Vue
  initUse(Vue)
  // 初始化mixins
  initMixin(Vue)
  // 初始化继承
  initExtend(Vue)
  // 初始化资源注册
  initAssetRegisters(Vue)
}
