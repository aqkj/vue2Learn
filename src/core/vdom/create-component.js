/* @flow */

import VNode from './vnode'
import { resolveConstructorOptions } from 'core/instance/init'
import { queueActivatedComponent } from 'core/observer/scheduler'
import { createFunctionalComponent } from './create-functional-component'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  isObject
} from '../util/index'

import {
  resolveAsyncComponent,
  createAsyncPlaceholder,
  extractPropsFromVNodeData
} from './helpers/index'

import {
  callHook,
  activeInstance,
  updateChildComponent,
  activateChildComponent,
  deactivateChildComponent
} from '../instance/lifecycle'

import {
  isRecyclableComponent,
  renderRecyclableComponentTemplate
} from 'weex/runtime/recycle-list/render-component-template'

// inline hooks to be invoked on component VNodes during patch
const componentVNodeHooks = { // 组件各阶段钩子
  /**
   * 初始化组件
   * @param {VNode} vnode 虚拟node
   * @param {*} hydrating
   */
  init (vnode: VNodeWithData, hydrating: boolean): ?boolean {
    // 判断组件实例是否存在，并且未销毁，并且存在keepAlive
    if (
      vnode.componentInstance &&
      !vnode.componentInstance._isDestroyed &&
      vnode.data.keepAlive
    ) {
      // kept-alive components, treat as a patch
      // 获取挂载node
      const mountedNode: any = vnode // work around flow
      // 调用prepatch钩子，传入虚拟node
      componentVNodeHooks.prepatch(mountedNode, mountedNode)
    } else {
      // 初始化，创建组件实例
      const child = vnode.componentInstance = createComponentInstanceForVnode(
        vnode,
        activeInstance
      )
      child.$mount(hydrating ? vnode.elm : undefined, hydrating)
    }
  },
  /**
   * 预补丁钩子
   * @param {VNode} oldVnode 旧的VNode
   * @param {VNode} vnode 新VNode
   */
  prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
    // 获取组件配置
    const options = vnode.componentOptions
    // 获取组件实例
    const child = vnode.componentInstance = oldVnode.componentInstance
    // 更新子组件
    updateChildComponent(
      child,
      options.propsData, // updated props
      options.listeners, // updated listeners
      vnode, // new parent vnode
      options.children // new children
    )
  },
  /**
   * 插入钩子
   * @param {VNode} vnode 虚拟node
   */
  insert (vnode: MountedComponentVNode) {
    // 获取组件上下文和实例
    const { context, componentInstance } = vnode
    // 如果组件并未挂载
    if (!componentInstance._isMounted) {
      // 设置挂载
      componentInstance._isMounted = true
      // 调用挂载钩子
      callHook(componentInstance, 'mounted')
    }
    // 判断组件是否keepAlive
    if (vnode.data.keepAlive) {
      // 判断上下文是否挂载
      if (context._isMounted) {
        // vue-router#1212
        // During updates, a kept-alive component's child components may
        // change, so directly walking the tree here may call activated hooks
        // on incorrect children. Instead we push them into a queue which will
        // be processed after the whole patch process ended.s
        queueActivatedComponent(componentInstance)
      } else {
        activateChildComponent(componentInstance, true /* direct */)
      }
    }
  },
  /**
   * 销毁钩子
   * @param {*} vnode
   */
  destroy (vnode: MountedComponentVNode) {
    // 获取虚拟组件实例
    const { componentInstance } = vnode
    // 如果不在销毁状态
    if (!componentInstance._isDestroyed) {
      // 并且非缓存组件
      if (!vnode.data.keepAlive) {
        // 调用组件销毁钩子
        componentInstance.$destroy()
      } else {
        // 如果为缓存则停用此当前实例树
        deactivateChildComponent(componentInstance, true /* direct */)
      }
    }
  }
}
// 合并的钩子名数组
const hooksToMerge = Object.keys(componentVNodeHooks)
/**
 * 创建组件
 * @param {function|component} Ctor 组件构造方法
 * @param {object} data data
 * @param {object} context 上下文
 * @param {any[]} children
 * @param {string} tag 标签名称
 */
export function createComponent (
  Ctor: Class<Component> | Function | Object | void,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag?: string
): VNode | Array<VNode> | void {
  // 构造器不存在则直接返回undefined
  if (isUndef(Ctor)) {
    return
  }
  // 获取base构造器
  const baseCtor = context.$options._base

  // plain options object: turn it into a constructor
  // 判断当前构造方法是否是对象
  if (isObject(Ctor)) {
    // 是对象则将其当为参数传递给base构造函数，继承生成新的 组件构造函数
    Ctor = baseCtor.extend(Ctor)
  }

  // if at this stage it's not a constructor or an async component factory,
  // reject.
  // 如果构造函数非方法
  if (typeof Ctor !== 'function') {
    // 非生产报警告
    if (process.env.NODE_ENV !== 'production') {
      warn(`Invalid Component definition: ${String(Ctor)}`, context)
    }
    // 返回undefined
    return
  }

  // async component
  // 异步组件
  let asyncFactory
  // 如果cid未定义
  if (isUndef(Ctor.cid)) { // 判断构造器是否有cid
    // 获取异步工厂方法
    asyncFactory = Ctor
    // 解析异步组件
    Ctor = resolveAsyncComponent(asyncFactory, baseCtor)
    if (Ctor === undefined) {
      // return a placeholder node for async component, which is rendered
      // as a comment node but preserves all the raw information for the node.
      // the information will be used for async server-rendering and hydration.
      return createAsyncPlaceholder(
        asyncFactory,
        data,
        context,
        children,
        tag
      )
    }
  }

  data = data || {} // 获取data

  // resolve constructor options in case global mixins are applied after
  // component constructor creation
  resolveConstructorOptions(Ctor) // 解析构造器配置，用于获取Vue构造器配置，并更新配置

  // transform component v-model data into props & events
  if (isDef(data.model)) { // v-model语法糖解析
    transformModel(Ctor.options, data) // model语法糖拆分成属性和事件
  }

  // extract props
  // 提取传入组件的属性
  const propsData = extractPropsFromVNodeData(data, Ctor, tag) // 提取属性

  // functional component
  if (isTrue(Ctor.options.functional)) { // 如果构造函数是函数化组件
    // 创建函数化组件
    return createFunctionalComponent(Ctor, propsData, data, context, children)
  }

  // extract listeners, since these needs to be treated as
  // child component listeners instead of DOM listeners
  // 获取data挂载的on对象，一般是用户挂载在元素上的@event
  const listeners = data.on
  // replace with listeners with .native modifier
  // so it gets processed during parent component patch.
  // 设置on对象为原生on
  data.on = data.nativeOn
  // 判断构造器是否为抽象
  if (isTrue(Ctor.options.abstract)) {
    // abstract components do not keep anything
    // other than props & listeners & slot

    // work around flow
    const slot = data.slot // 暂存slot插槽
    data = {} // 设置data为空
    if (slot) { // 如果插槽存在
      data.slot = slot // 重新赋值
    }
  }

  // install component management hooks onto the placeholder node
  installComponentHooks(data) // 安装组件钩子

  // return a placeholder vnode
  const name = Ctor.options.name || tag // 获取组件的名称
  // 创建对应组件vnode对象
  const vnode = new VNode(
    `vue-component-${Ctor.cid}${name ? `-${name}` : ''}`,
    data, undefined, undefined, undefined, context,
    { Ctor, propsData, listeners, tag, children },
    asyncFactory
  )

  // Weex specific: invoke recycle-list optimized @render function for
  // extracting cell-slot template.
  // https://github.com/Hanks10100/weex-native-directive/tree/master/component
  /* istanbul ignore if */
  if (__WEEX__ && isRecyclableComponent(vnode)) {
    return renderRecyclableComponentTemplate(vnode)
  }
  // 返回vnode对象
  return vnode
}
/**
 * 为虚拟node创建组件实例
 * @param {VNode} vnode 虚拟node
 * @param {*} parent
 */
export function createComponentInstanceForVnode (
  vnode: any, // we know it's MountedComponentVNode but flow doesn't
  parent: any, // activeInstance in lifecycle state
): Component {
  // 组件配置
  const options: InternalComponentOptions = {
    _isComponent: true,
    _parentVnode: vnode,
    parent
  }
  // check inline-template render functions
  const inlineTemplate = vnode.data.inlineTemplate
  // 如果是否存在
  if (isDef(inlineTemplate)) {
    // 存在则获取render方法
    options.render = inlineTemplate.render
    // 获取静态render方法
    options.staticRenderFns = inlineTemplate.staticRenderFns
  }
  // 调用组件构造器，返回实例
  return new vnode.componentOptions.Ctor(options)
}
/**
 * 安装组件钩子
 * @param {Object} data 组件data
 */
function installComponentHooks (data: VNodeData) {
  // 获取钩子
  const hooks = data.hook || (data.hook = {})
  // 遍历钩子属性
  for (let i = 0; i < hooksToMerge.length; i++) {
    // 获取对应钩子名称
    const key = hooksToMerge[i]
    // 如果存在钩子则获取
    const existing = hooks[key]
    // 拿到组件钩子对象
    const toMerge = componentVNodeHooks[key]
    // 判断传递钩子和全局定义的钩子是否不相同，并且钩子不存在，或者没合并
    if (existing !== toMerge && !(existing && existing._merged)) {
      // 设置对应钩子，如果存在则合并钩子
      hooks[key] = existing ? mergeHook(toMerge, existing) : toMerge
    }
  }
}
/**
 * 合并钩子
 * @param {any} f1 钩子方法
 * @param {any} f2 钩子方法
 */
function mergeHook (f1: any, f2: any): Function {
  // 创建一个新方法
  const merged = (a, b) => {
    // flow complains about extra args which is why we use any
    f1(a, b)
    f2(a, b)
  }
  // 设置合并字段为true
  merged._merged = true
  // 返回合并后的钩子方法
  return merged
}

// transform component v-model info (value and callback) into
// prop and event handler respectively.
/**
 * 转变vmodel并且分别触发prop和事件
 * @param {*} options
 * @param {*} data
 */
function transformModel (options, data: any) {
  // 获取model配置,默认为value
  const prop = (options.model && options.model.prop) || 'value'
  // 获取model配置下的event，默认为input
  const event = (options.model && options.model.event) || 'input'
  // 设置data的attr属性为prop，值为model下的value
  ;(data.attrs || (data.attrs = {}))[prop] = data.model.value
  // 获取监听的on对象
  const on = data.on || (data.on = {})
  // 获取对应event，如果存在的话
  const existing = on[event]
  // 获取model的callback
  const callback = data.model.callback
  // 判断对应事件是否存在
  if (isDef(existing)) {
    // 存在则判断是否为数组，并且判断callback是否在是否在event数组内
    if (
      Array.isArray(existing)
        ? existing.indexOf(callback) === -1
        : existing !== callback
    ) {
      on[event] = [callback].concat(existing) // 不存在则拼接金event事件
    }
  } else {
    // 如果不存在则设置event方法为callback
    on[event] = callback
  }
}
