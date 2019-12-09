/* @flow */

export default class VNode {
  /** 标签 */
  tag: string | void;
  /** data数据 */
  data: VNodeData | void;
  /** 子数组 */
  children: ?Array<VNode>;
  /** 文本 */
  text: string | void;
  /** elm元素 */
  elm: Node | void;
  ns: string | void;
  /** 上下文 */
  context: Component | void; // rendered in this component's scope
  /** key唯一 */
  key: string | number | void;
  /** 组件配置 */
  componentOptions: VNodeComponentOptions | void;
  /** 组件实例 */
  componentInstance: Component | void; // component instance
  /** 父Vnode */
  parent: VNode | void; // component placeholder node

  // strictly internal
  raw: boolean; // contains raw HTML? (server only) 包含原始html
  /** 是否静态 */
  isStatic: boolean; // hoisted static node
  /** 是否从root插入 */
  isRootInsert: boolean; // necessary for enter transition check
  /** 是否为空 */
  isComment: boolean; // empty comment placeholder?
  /** 是否为克隆的node */
  isCloned: boolean; // is a cloned node?
  /** 是否单次的node */
  isOnce: boolean; // is a v-once node?
  /** 是否为异步工厂 */
  asyncFactory: Function | void; // async component factory function
  /** 异步meta */
  asyncMeta: Object | void;
  /** 是否为异步占位符 */
  isAsyncPlaceholder: boolean;
  /** 服务器渲染上下文 */
  ssrContext: Object | void;
  /** 方法上下文 */
  fnContext: Component | void; // real context vm for functional nodes
  /** 方法配置 */
  fnOptions: ?ComponentOptions; // for SSR caching
  /** devtools媒体 */
  devtoolsMeta: ?Object; // used to store functional render context for devtools
  /** 方法作用域id */
  fnScopeId: ?string; // functional scope id support
  /**
   * VNode构造函数
   * @param {string} tag 标签名
   * @param {object} data data数据对象
   * @param {Vnode[]} children 子元素数组
   * @param {string} text 文本
   * @param {Node} elm 元素对象
   * @param {any} context vue上下文
   * @param {any} componentOptions vue组件配置
   * @param {function} asyncFactory 异步工厂
   */
  constructor (
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    // 设置tag
    this.tag = tag
    // 设置data
    this.data = data
    // 子元素数组
    this.children = children
    // 设置文本
    this.text = text
    // 设置el元素
    this.elm = elm
    // 设置ns, 目前不知道干啥的
    this.ns = undefined
    // 设置上下文
    this.context = context
    // 设置方法上下文
    this.fnContext = undefined
    // 设置配置上下文
    this.fnOptions = undefined
    // 设置作用域id
    this.fnScopeId = undefined
    // 设置key
    this.key = data && data.key
    /** 获取组件配置 */
    this.componentOptions = componentOptions
    /** 获取组件实例 */
    this.componentInstance = undefined
    /** 获取父vnode */
    this.parent = undefined
    /** 包含原始html */
    this.raw = false
    /** 设置是否静态 */
    this.isStatic = false
    // 是否根添加
    this.isRootInsert = true
    // 是否注释
    this.isComment = false
    // 是否克隆
    this.isCloned = false
    // 是否一次性
    this.isOnce = false
    // 是否是异步工厂
    this.asyncFactory = asyncFactory
    // 是否异步媒体
    this.asyncMeta = undefined
    // 是否异步占位符
    this.isAsyncPlaceholder = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child (): Component | void {
    // 获取子元素为当前组件实例
    return this.componentInstance
  }
}
/**
 * 返回空vnode
 * @param {*} text
 */
export const createEmptyVNode = (text: string = '') => {
  // 创建vnode
  const node = new VNode()
  // 设置vnodetext
  node.text = text
  // 设置其为注释
  node.isComment = true
  // 返回node对象
  return node
}
/**
 * 创建文本vnode
 * @param {string} val 文本值
 */
export function createTextVNode (val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
/**
 * 克隆虚拟node
 * @param {*} vnode
 */
export function cloneVNode (vnode: VNode): VNode {
  // 基于传参创建一个新vnode
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true
  return cloned
}
