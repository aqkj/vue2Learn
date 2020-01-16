/* @flow */

import config from '../config'
import VNode, { createEmptyVNode } from './vnode'
import { createComponent } from './create-component'
import { traverse } from '../observer/traverse'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject,
  isPrimitive,
  resolveAsset
} from '../util/index'

import {
  normalizeChildren,
  simpleNormalizeChildren
} from './helpers/index'

const SIMPLE_NORMALIZE = 1
const ALWAYS_NORMALIZE = 2

// wrapper function for providing a more flexible interface
// without getting yelled at by flow
/**
 * 创建元素
 * @param {any} context 上下文
 * @param {any} tag 标签名称
 * @param {any} data 数据对象
 * @param {any} children 子元素
 * @param {any} normalizationType 规范化类型
 * @param {boolean} alwaysNormalize 始终规范化
 */
export function createElement (
  context: Component,
  tag: any,
  data: any,
  children: any,
  normalizationType: any,
  alwaysNormalize: boolean
): VNode | Array<VNode> {
  // 判断data是否为数组，或者是原始类型
  if (Array.isArray(data) || isPrimitive(data)) {
    // 规范化类型为children
    normalizationType = children
    // 将data设置为children
    children = data
    // 将data设置为undefined
    data = undefined
  }
  // 判断是否总是设置规范化类型
  if (isTrue(alwaysNormalize)) {
    // 设置规范化类型ALWAYS_NORMALIZE
    normalizationType = ALWAYS_NORMALIZE
  }
  // 返回私有创建元素方法
  return _createElement(context, tag, data, children, normalizationType)
}
/**
 * 私有创建元素
 * @param {any} context vue上下文
 * @param {any} tag 元素
 * @param {any} data data数据
 * @param {any} children 子数组
 * @param {any} normalizationType 规范化类型
 */
export function _createElement (
  context: Component,
  tag?: string | Class<Component> | Function | Object,
  data?: VNodeData,
  children?: any,
  normalizationType?: number
): VNode | Array<VNode> {
  // 如果vue的data上被挂载上了ob对象则警告
  if (isDef(data) && isDef((data: any).__ob__)) {
    process.env.NODE_ENV !== 'production' && warn(
      `Avoid using observed data object as vnode data: ${JSON.stringify(data)}\n` +
      'Always create fresh vnode data objects in each render!',
      context
    )
    // 返回空vnode
    return createEmptyVNode()
  }
  // object syntax in v-bind
  // 判断是否有is, <component is="name" />
  if (isDef(data) && isDef(data.is)) {
    // 拿到is属性为组件名称
    tag = data.is
  }
  // tag不存在
  if (!tag) {
    // in case of component :is set to falsy value
    return createEmptyVNode() // 返回空vnode
  }
  // warn against non-primitive key
  // 如果key不是原始类型则警告例如 <node :key="{}" />则会报错
  if (process.env.NODE_ENV !== 'production' &&
    isDef(data) && isDef(data.key) && !isPrimitive(data.key)
  ) {
    if (!__WEEX__ || !('@binding' in data.key)) {
      warn(
        'Avoid using non-primitive value as key, ' +
        'use string/number value instead.',
        context
      )
    }
  }
  // support single function children as default scoped slot
  // 判断children是数组并且children第一个为方法
  if (Array.isArray(children) &&
    typeof children[0] === 'function'
  ) {
    // 获取data
    data = data || {}
    // 设置作用域插槽
    data.scopedSlots = { default: children[0] }
    // 清空子元素
    children.length = 0
  }
  // 如果规范化类型为一直规范化则调用
  if (normalizationType === ALWAYS_NORMALIZE) {
    // 规范子元素数组
    children = normalizeChildren(children)
  } else if (normalizationType === SIMPLE_NORMALIZE) { // 简单规范
    children = simpleNormalizeChildren(children)
  }
  let vnode, ns
  if (typeof tag === 'string') { // 判断tag如果为字符串
    let Ctor
    // 获取namespace
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    // 判断是否为保留的html自带标签和svg标签
    if (config.isReservedTag(tag)) {
      // platform built-in elements 判断组件是否绑定nativeOn,绑定 则报错
      if (process.env.NODE_ENV !== 'production' && isDef(data) && isDef(data.nativeOn)) {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        )
      }
      // 创建虚拟node
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
      // 如果未订阅data或者.pre属性不存在，并且组件上下文内有定义，则获取对应的构造函数
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) { // 判断并且获取组件构造方法
      // component
      // 是组件的情况下创建组件
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      // 未知的标签元素，直接创建vnode元素
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    // 如果tag不是一个字符串，是一个组件配置或者构造器的话，则创建组件
    vnode = createComponent(tag, data, context, children)
  }
  // 判断vnode类型是否为数组
  if (Array.isArray(vnode)) {
    // 直接返回vnode数组
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode // 返回vnode
  } else {
    return createEmptyVNode() // 不存在则返回空的vnode
  }
}

function applyNS (vnode, ns, force) {
  vnode.ns = ns
  if (vnode.tag === 'foreignObject') {
    // use default namespace inside foreignObject
    ns = undefined
    force = true
  }
  if (isDef(vnode.children)) {
    for (let i = 0, l = vnode.children.length; i < l; i++) {
      const child = vnode.children[i]
      if (isDef(child.tag) && (
        isUndef(child.ns) || (isTrue(force) && child.tag !== 'svg'))) {
        applyNS(child, ns, force)
      }
    }
  }
}

// ref #5318
// necessary to ensure parent re-render when deep bindings like :style and
// :class are used on slot nodes
function registerDeepBindings (data) {
  if (isObject(data.style)) {
    traverse(data.style)
  }
  if (isObject(data.class)) {
    traverse(data.class)
  }
}
