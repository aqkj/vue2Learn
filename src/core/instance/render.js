/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import VNode, { createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'
/**
 * 初始化渲染
 * @param {object} vm vue实例
 */
export function initRender (vm: Component) {
  // 设置vnode
  vm._vnode = null // the root of the child tree
  // 缓存的tree
  vm._staticTrees = null // v-once cached trees
  // 获取实例配置
  const options = vm.$options
  // 获取父vnode
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  // 获取渲染上下文
  const renderContext = parentVnode && parentVnode.context
  // 解析获取插槽
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  // 获取作用域插槽
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false) // 代理createElement方法
  // normalization is always applied for the public version, used in
  // user-written render functions.
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true) // 代理createElement方法

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  const parentData = parentVnode && parentVnode.data

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}

export let currentRenderingInstance: Component | null = null

// for testing only
export function setCurrentRenderingInstance (vm: Component) {
  currentRenderingInstance = vm
}
/**
 * 渲染mixin
 * @param {*} Vue
 */
export function renderMixin (Vue: Class<Component>) {
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype)
  /**
   * 下一次事件循环执行回调方法
   * @param {Function} fn 方法
   */
  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }
  /**
   * 渲染方法
   */
  Vue.prototype._render = function (): VNode {
    // 获取当前实例
    const vm: Component = this
    // 获取当前render方法和_parentVnode
    const { render, _parentVnode } = vm.$options
    // 如果存在_parentVnode
    if (_parentVnode) {
      // 规范化设置作用域插槽
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots,
        vm.$slots,
        vm.$scopedSlots
      )
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    // 设置$vnode为_parentVnode
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
      // There's no need to maintain a stack because all render fns are called
      // separately from one another. Nested component's render fns are called
      // when parent component is patched.
      // 设置currentRenderingInstance为vm
      currentRenderingInstance = vm
      // 调用render方法，传入渲染代理，和createElement方法
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      // 拦截错误报错
      handleError(e, vm, `render`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      // 如果非生产环境，并且有renderError，则渲染错界面
      if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
        try {
          // 设置vnode
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
        } catch (e) {
          // 错误拦截
          handleError(e, vm, `renderError`)
          // 设置为之前的_vnode
          vnode = vm._vnode
        }
      } else {
        // 设置为之前的vnode
        vnode = vm._vnode
      }
    } finally {
      // 设置currentRenderingInstance为null
      currentRenderingInstance = null
    }
    // if the returned array contains only a single node, allow it
    // 如果vnode为数组，则获取其第一个
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    // 如果vnode结果不为VNode构造的
    if (!(vnode instanceof VNode)) {
      // 非生产环境并且是数组的话，则报错
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      // 创建一个空的VNode
      vnode = createEmptyVNode()
    }
    // set parent
    // 设置vnode的parent为_parentVnode
    vnode.parent = _parentVnode
    // 返回vnode
    return vnode
  }
}
