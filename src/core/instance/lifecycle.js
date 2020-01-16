/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'

export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance
  activeInstance = vm
  return () => {
    activeInstance = prevActiveInstance
  }
}
/**
 * 初始化生命周期
 * @param {any} vm vue实例
 */
export function initLifecycle (vm: Component) {
  // 获取实例配置
  const options = vm.$options
  // locate first non-abstract parent
  // 获取父级
  let parent = options.parent
  // 判断父级是否存在，并且自身非抽象
  if (parent && !options.abstract) {
    // 循环调用获取非抽象父级
    while (parent.$options.abstract && parent.$parent) {
      parent = parent.$parent
    }
    // 插入到父级的children数组中
    parent.$children.push(vm)
  }
  // 设置父parent
  vm.$parent = parent
  // 设置根，判断是否存在父，存在父则用父的根
  vm.$root = parent ? parent.$root : vm
  // 设置子数组
  vm.$children = []
  vm.$refs = {}
  // 设置watcher
  vm._watcher = null
  // 设置_inactive
  vm._inactive = null
  // 设置_directInactive
  vm._directInactive = false
  // 设置是否mounted
  vm._isMounted = false
  // 设置是否销毁
  vm._isDestroyed = false
  // 设置是否在销毁中
  vm._isBeingDestroyed = false
}
/**
 * 生命周期mixin
 * @param {Vue} Vue vue构造器
 */
export function lifecycleMixin (Vue: Class<Component>) {
  /**
   * 通过传入的虚拟dom更新真实dom树
   * @param {VNode} vnode 虚拟dom
   * @param {boolean} hydrating 目前不知道干啥的
   */
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    // 获取vm实例
    const vm: Component = this
    // 暂存上一次的eldom树结构
    const prevEl = vm.$el
    // 获取上一次的虚拟node树结构
    const prevVnode = vm._vnode
    // 保存上一次的vm实例，并且返回一个方法用于恢复上一次的实例
    const restoreActiveInstance = setActiveInstance(vm)
    // 设置vnode
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points
    // based on the rendering backend used.
    // 如果上一次的vnode不存在，代表其为初始化
    if (!prevVnode) {
      // initial render
      // 初始化渲染并赋值给$el
      vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
    } else {
      // updates
      // 更新渲染
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    // 恢复上一次的vm实例
    restoreActiveInstance()
    // update __vue__ reference
    // 如果上一次的el dom树存在
    if (prevEl) {
      // 将vue实例关联清空
      prevEl.__vue__ = null
    }
    // 如果当前渲染的el dom树存在
    if (vm.$el) {
      // 设置当前dom树关联vue实例
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    // 如果父组件为高阶组件，则设置父组件的el为当前实例的el
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // updated in a parent's updated hook.
  }
  /**
   * 手动触发更新
   */
  Vue.prototype.$forceUpdate = function () {
    // 获取当前实例
    const vm: Component = this
    // 如果当前实例存在_watcher
    if (vm._watcher) {
      // 触发依赖收集，并且更新回调
      vm._watcher.update()
    }
  }
  /**
   * 组件销毁
   */
  Vue.prototype.$destroy = function () {
    // 获取当前实例
    const vm: Component = this
    // 如果已经销毁则不操作
    if (vm._isBeingDestroyed) {
      return
    }
    // 调用beforeDestory钩子
    callHook(vm, 'beforeDestroy')
    // 设置_isBeingDestroyed为销毁
    vm._isBeingDestroyed = true
    // remove self from parent
    // 获取父实例
    const parent = vm.$parent
    // 如果父实例存在并且父实例没有销毁，并且当前实例非抽象
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      // 将父实例和当前实例的关系移除
      remove(parent.$children, vm)
    }
    // teardown watchers
    // 移除当前收集的依赖关系，并且将当前watcher移除
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    // 获取当前实例观察的数量
    let i = vm._watchers.length
    // 将所有watcher进行移除操作
    while (i--) {
      // 移除当前收集的依赖关系
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // frozen object may not have observer.
    // 如果当前data存在observe对象
    if (vm._data.__ob__) {
      // 则将实例count--
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    // 设置_isDestroyed为true
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    // 销毁vnode
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    // 调用destoryed钩子
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    // 移除所有订阅事件
    vm.$off()
    // remove __vue__ reference
    // 移除当前真实dom树的依赖关系
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    // 移除$vnode的parent
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}
/**
 * 挂载组件
 * @param {object} vm vm实例
 * @param {object} el el元素
 * @param {*} hydrating
 */
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  // 设置el组件为获取el元素
  vm.$el = el
  // 如果不存在render方法
  if (!vm.$options.render) {
    // 设置render方法为创建空虚拟弄的的方法
    vm.$options.render = createEmptyVNode
    // 非生产环境
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      // 如果template存在，并且不为#， 或者el存在,则报错
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  // 调用钩子beforeMount
  callHook(vm, 'beforeMount')
  // 订阅更新组件方法
  let updateComponent
  /* istanbul ignore if */
  // 非生产环境，并且开启了性能调试
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      // 获取当前实例名称
      const name = vm._name
      // 获取当前uid
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag)
      // 获取当前vnode树
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag)
      // 传递vnode生产真实dom树
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    // 更新组件方法
    updateComponent = () => {
      // 获取虚拟node树，更新真实dom树
      vm._update(vm._render(), hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  // 创建watcher对象，传递updateComponent为getter，在创建vnode时进行依赖收集
  new Watcher(vm, updateComponent, noop, {
    before () {
      // 调用beforeUpdate钩子
      if (vm._isMounted && !vm._isDestroyed) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  // 替换$vnode为空
  if (vm.$vnode == null) {
    // 设置_isMounte为true
    vm._isMounted = true
    // 调用钩子mounted
    callHook(vm, 'mounted')
  }
  // 返回vm实例
  return vm
}
/**
 * 更新子组件
 * @param {object} vm 组件实例
 * @param {object} propsData 传入参数
 * @param {object} listeners 监听事件
 * @param {object} parentVnode 父级虚拟node
 * @param {VNode[]} renderChildren 子虚拟node
 */
export function updateChildComponent (
  vm: Component,
  propsData: ?Object,
  listeners: ?Object,
  parentVnode: MountedComponentVNode,
  renderChildren: ?Array<VNode>
) {
  // 非生产环境
  if (process.env.NODE_ENV !== 'production') {
    // 更新子组件中
    isUpdatingChildComponent = true
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  // 获取父Vnode的data的作用域插槽
  const newScopedSlots = parentVnode.data.scopedSlots
  // 获取旧的作用域插槽
  const oldScopedSlots = vm.$scopedSlots
  // 判断是否存在动态作用域插槽
  const hasDynamicScopedSlot = !!(
    // 新插槽存在，并且非$stable
    (newScopedSlots && !newScopedSlots.$stable) ||
    // 旧插槽为等于空对象，并且非$stable
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    // 判断新插槽存在，并且新两者key不相同
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key)
  )

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  // 是否需要触发更新
  const needsForceUpdate = !!(
    // 存在子node数组
    renderChildren ||               // has new static slots
    // 旧子元素数组
    vm.$options._renderChildren ||  // has old static slots
    // 动态作用域插槽
    hasDynamicScopedSlot
  )
  // 设置父VNode
  vm.$options._parentVnode = parentVnode
  // 设置$vnode元素
  vm.$vnode = parentVnode // update vm's placeholder node without re-render
  // 设置子vnode元素的父vnode
  if (vm._vnode) { // update child tree's parent
    vm._vnode.parent = parentVnode
  }
  // 设置子元素数组
  vm.$options._renderChildren = renderChildren

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  // 设置父的attr属性
  vm.$attrs = parentVnode.data.attrs || emptyObject
  // 设置监听事件
  vm.$listeners = listeners || emptyObject

  // update props
  // 存在propsData,存在options.props配置
  if (propsData && vm.$options.props) {
    // 关闭observe观察
    toggleObserving(false)
    // 获取props
    const props = vm._props
    // 获取props属性名列表
    const propKeys = vm.$options._propKeys || []
    // 遍历属性名
    for (let i = 0; i < propKeys.length; i++) {
      // 获取属性名称
      const key = propKeys[i]
      // 获取配置的属性
      const propOptions: any = vm.$options.props // wtf flow?
      // 校验prop
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    // 开启observe观察
    toggleObserving(true)
    // keep a copy of raw propsData
    // 设置propsData
    vm.$options.propsData = propsData
  }

  // update listeners
  // 获取事件监听对象
  listeners = listeners || emptyObject
  // 获取旧的事件监听对象
  const oldListeners = vm.$options._parentListeners
  // 设置为新的事件监听对象
  vm.$options._parentListeners = listeners
  // 更新组件事件
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  // 如果 需要触发更新
  if (needsForceUpdate) {
    // 解析更新钩子
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    // 触发更新
    vm.$forceUpdate()
  }
  // 非生产环境
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

function isInInactiveTree (vm) {
  while (vm && (vm = vm.$parent)) {
    if (vm._inactive) return true
  }
  return false
}

export function activateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {
      return
    }
  } else if (vm._directInactive) {
    return
  }
  if (vm._inactive || vm._inactive === null) {
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) {
      activateChildComponent(vm.$children[i])
    }
    callHook(vm, 'activated')
  }
}
/**
 * 停用子组件
 * @param {object} vm vue实例
 * @param {*} direct
 */
export function deactivateChildComponent (vm: Component, direct?: boolean) {
  if (direct) {
    // 停用组件条件
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  // 判断是活跃的，则设置为非活跃
  if (!vm._inactive) {
    // 设置为非活跃
    vm._inactive = true
    // 遍历当前实例子实例
    for (let i = 0; i < vm.$children.length; i++) {
      //递归停用子组件
      deactivateChildComponent(vm.$children[i])
    }
    // 触发停用钩子
    callHook(vm, 'deactivated')
  }
}

export function callHook (vm: Component, hook: string) {
  // #7573 disable dep collection when invoking lifecycle hooks
  pushTarget()
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  if (handlers) {
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}
