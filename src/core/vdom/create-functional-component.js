/* @flow */

import VNode, { cloneVNode } from './vnode'
import { createElement } from './create-element'
import { resolveInject } from '../instance/inject'
import { normalizeChildren } from '../vdom/helpers/normalize-children'
import { resolveSlots } from '../instance/render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import { installRenderHelpers } from '../instance/render-helpers/index'

import {
  isDef,
  isTrue,
  hasOwn,
  camelize,
  emptyObject,
  validateProp
} from '../util/index'
/**
 * 创发渲染像下文
 * @param {VNodeData} data 数据
 * @param {object} props 属性
 * @param {VNode[]} children 子
 * @param {Component} parent 父
 * @param {Function} Ctor 构造函数
 */
export function FunctionalRenderContext (
  data: VNodeData,
  props: Object,
  children: ?Array<VNode>,
  parent: Component,
  Ctor: Class<Component>
) {
  // 获取构造器的options
  const options = Ctor.options
  // ensure the createElement function in functional components
  // gets a unique context - this is necessary for correct named slot check
  let contextVm
  // 判断父是否有uid
  if (hasOwn(parent, '_uid')) {
    // 设置contextvm的原型
    contextVm = Object.create(parent)
    // $flow-disable-line
    // 设置源
    contextVm._original = parent
  } else {
    // the context vm passed in is a functional context as well.
    // in this case we want to make sure we are able to get a hold to the
    // real context instance.
    // 如果父不存在uid，则设置contextvm为parent
    contextVm = parent
    // $flow-disable-line
    // 设置当前源为父的源
    parent = parent._original
  }
  // 判断是否编译
  const isCompiled = isTrue(options._compiled)
  // 判断是否需要规范化
  const needNormalization = !isCompiled
  // 获取data
  this.data = data
  // 获取props
  this.props = props
  // 获取children
  this.children = children
  // 获取父
  this.parent = parent
  // 获取监听属性
  this.listeners = data.on || emptyObject
  // 获取inject
  this.injections = resolveInject(options.inject, parent)
  // 获取slots
  this.slots = () => {
    // 不存在插槽的话
    if (!this.$slots) {
      // 规范化插槽
      normalizeScopedSlots(
        data.scopedSlots,
        this.$slots = resolveSlots(children, parent)
      )
    }
    // 返回插槽
    return this.$slots
  }
  // 设置作用域插槽
  Object.defineProperty(this, 'scopedSlots', ({
    enumerable: true,
    get () {
      // 获取规范化的插槽
      return normalizeScopedSlots(data.scopedSlots, this.slots())
    }
  }: any))

  // support for compiled functional template
  // 判断是否编译完成
  if (isCompiled) {
    // exposing $options for renderStatic()
    // 获取options
    this.$options = options
    // pre-resolve slots for renderSlot()
    // 获取插槽
    this.$slots = this.slots()
    // 获取作用域插槽
    this.$scopedSlots = normalizeScopedSlots(data.scopedSlots, this.$slots)
  }
  // 判断是否存在scopeid
  if (options._scopeId) {
    // 设置_c代理createElement
    this._c = (a, b, c, d) => {
      const vnode = createElement(contextVm, a, b, c, d, needNormalization)
      // 判断vnode是否不为数组
      if (vnode && !Array.isArray(vnode)) {
        // 获取scopedId
        vnode.fnScopeId = options._scopeId
        // 设置上下文
        vnode.fnContext = parent
      }
      // 返回vnode
      return vnode
    }
  } else {
    // 代理createElement
    this._c = (a, b, c, d) => createElement(contextVm, a, b, c, d, needNormalization)
  }
}

installRenderHelpers(FunctionalRenderContext.prototype)
/**
 * 创建函数化组件
 * @param {component} Ctor 构造器
 * @param {object} propsData 属性数据
 * @param {object} data 数据
 * @param {object} contextVm 组件实例上下文
 * @param {any[]} children 子元素
 */
export function createFunctionalComponent (
  Ctor: Class<Component>,
  propsData: ?Object,
  data: VNodeData,
  contextVm: Component,
  children: ?Array<VNode>
): VNode | Array<VNode> | void {
  // 获取构造器的配置
  const options = Ctor.options
  // 暂存peops
  const props = {}
  // 获取配置的props数据
  const propOptions = options.props
  // 判断是否有propsOptions
  if (isDef(propOptions)) {
    // 遍历属性
    for (const key in propOptions) {
      // 校验属性，并且赋值
      props[key] = validateProp(key, propOptions, propsData || emptyObject)
    }
  } else {
    // 如果未设置属性则合并到props
    if (isDef(data.attrs)) mergeProps(props, data.attrs)
    if (isDef(data.props)) mergeProps(props, data.props)
  }
  /**
   * 创建函数化渲染上下文
   */
  const renderContext = new FunctionalRenderContext(
    data,
    props,
    children,
    contextVm,
    Ctor
  )
  // 获取虚拟节点树
  const vnode = options.render.call(null, renderContext._c, renderContext)
  // 判断是否是vnode
  if (vnode instanceof VNode) {
    // 克隆vnode
    return cloneAndMarkFunctionalResult(vnode, data, renderContext.parent, options, renderContext)
  } else if (Array.isArray(vnode)) {
    // 规范化子元素
    const vnodes = normalizeChildren(vnode) || []
    // 创建新数组
    const res = new Array(vnodes.length)
    // 遍历vnode数组
    for (let i = 0; i < vnodes.length; i++) {
      // clone并返回
      res[i] = cloneAndMarkFunctionalResult(vnodes[i], data, renderContext.parent, options, renderContext)
    }
    // 返回结果
    return res
  }
}
/**
 * 返回克隆的vnode
 * @param {objecy} vnode
 * @param {objecy} data
 * @param {objecy} contextVm
 * @param {object} options
 * @param {objecy} renderContext
 */
function cloneAndMarkFunctionalResult (vnode, data, contextVm, options, renderContext) {
  // #7817 clone node before setting fnContext, otherwise if the node is reused
  // (e.g. it was from a cached normal slot) the fnContext causes named slots
  // that should not be matched to match.
  const clone = cloneVNode(vnode) // 克隆返回一个新vnode
  clone.fnContext = contextVm // 方法上下文
  clone.fnOptions = options // 方法配置
  if (process.env.NODE_ENV !== 'production') {
    (clone.devtoolsMeta = clone.devtoolsMeta || {}).renderContext = renderContext
  }
  // 如果有slot，设置clone后的slot
  if (data.slot) {
    (clone.data || (clone.data = {})).slot = data.slot
  }
  // 返回新的vnode
  return clone
}
/**
 * 合并属性
 * @param {object} to
 * @param {objecy} from
 */
function mergeProps (to, from) {
  for (const key in from) {
    to[camelize(key)] = from[key]
  }
}
