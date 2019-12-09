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
  } else if (normalizationType === SIMPLE_NORMALIZE) {
    children = simpleNormalizeChildren(children)
  }
  let vnode, ns
  if (typeof tag === 'string') {
    let Ctor
    ns = (context.$vnode && context.$vnode.ns) || config.getTagNamespace(tag)
    if (config.isReservedTag(tag)) {
      // platform built-in elements
      if (process.env.NODE_ENV !== 'production' && isDef(data) && isDef(data.nativeOn)) {
        warn(
          `The .native modifier for v-on is only valid on components but it was used on <${tag}>.`,
          context
        )
      }
      vnode = new VNode(
        config.parsePlatformTagName(tag), data, children,
        undefined, undefined, context
      )
    } else if ((!data || !data.pre) && isDef(Ctor = resolveAsset(context.$options, 'components', tag))) {
      // component
      vnode = createComponent(Ctor, data, context, children, tag)
    } else {
      // unknown or unlisted namespaced elements
      // check at runtime because it may get assigned a namespace when its
      // parent normalizes children
      vnode = new VNode(
        tag, data, children,
        undefined, undefined, context
      )
    }
  } else {
    // direct component options / constructor
    vnode = createComponent(tag, data, context, children)
  }
  if (Array.isArray(vnode)) {
    return vnode
  } else if (isDef(vnode)) {
    if (isDef(ns)) applyNS(vnode, ns)
    if (isDef(data)) registerDeepBindings(data)
    return vnode
  } else {
    return createEmptyVNode()
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
