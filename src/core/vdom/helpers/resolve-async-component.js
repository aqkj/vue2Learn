/* @flow */

import {
  warn,
  once,
  isDef,
  isUndef,
  isTrue,
  isObject,
  hasSymbol,
  isPromise,
  remove
} from 'core/util/index'

import { createEmptyVNode } from 'core/vdom/vnode'
import { currentRenderingInstance } from 'core/instance/render'

function ensureCtor (comp: any, base) {
  if (
    comp.__esModule ||
    (hasSymbol && comp[Symbol.toStringTag] === 'Module')
  ) {
    comp = comp.default
  }
  return isObject(comp)
    ? base.extend(comp)
    : comp
}

export function createAsyncPlaceholder (
  factory: Function,
  data: ?VNodeData,
  context: Component,
  children: ?Array<VNode>,
  tag: ?string
): VNode {
  const node = createEmptyVNode()
  node.asyncFactory = factory
  node.asyncMeta = { data, context, children, tag }
  return node
}
/**
 * 解析异步组件
 * @param {function} factory 工厂方法
 * @param {function} baseCtor 主构造函数
 */
export function resolveAsyncComponent (
  factory: Function,
  baseCtor: Class<Component>
): Class<Component> | void {
  // 判断是否存在error属性并且错误组件也存在
  if (isTrue(factory.error) && isDef(factory.errorComp)) {
    return factory.errorComp
  }
  // 判断是否存在resolved
  if (isDef(factory.resolved)) {
    return factory.resolved
  }
  // 获取当前渲染vm实例
  const owner = currentRenderingInstance
  // 判断是否存在vm实例，并且工厂方法内也存在实例，并且实例不存在于工厂方法实例数组内
  if (owner && isDef(factory.owners) && factory.owners.indexOf(owner) === -1) {
    // already pending
    // 插入到实例数组内
    factory.owners.push(owner)
  }
  // 判断是否loading中，并且存在loading组件
  if (isTrue(factory.loading) && isDef(factory.loadingComp)) {
    // 返回loading组件
    return factory.loadingComp
  }
  // 如果当前实例存在，并且factory上的实例数组不存在
  if (owner && !isDef(factory.owners)) {
    // 创建实例数组
    const owners = factory.owners = [owner]
    // sync设置为 true
    let sync = true
    let timerLoading = null
    let timerTimeout = null
    // 添加订阅钩子,组件销毁钩子,移除实例关联
    ;(owner: any).$on('hook:destroyed', () => remove(owners, owner))
    // 触发渲染方法, 传递是否渲染成功
    const forceRender = (renderCompleted: boolean) => {
      // 遍历实例数组
      for (let i = 0, l = owners.length; i < l; i++) {
        // 强制触发重新渲染方法
        (owners[i]: any).$forceUpdate()
      }
      // 如果渲染成功为true
      if (renderCompleted) {
        // 重制数组长度为0
        owners.length = 0
        // 如果timerLoading不为null，则清除
        if (timerLoading !== null) {
          // 清除timer
          clearTimeout(timerLoading)
          // 设置为null
          timerLoading = null
        }
        // 如果timerTimeout不为null
        if (timerTimeout !== null) {
          // 清除timeout
          clearTimeout(timerTimeout)
          // 设置为null
          timerTimeout = null
        }
      }
    }
    // 创建resolve方法
    const resolve = once((res: Object | Class<Component>) => {
      // cache resolved
      // 存储resolved构造器
      factory.resolved = ensureCtor(res, baseCtor)
      // invoke callbacks only if this is not a synchronous resolve
      // (async resolves are shimmed as synchronous during SSR)
      if (!sync) {
        forceRender(true)
      } else {
        owners.length = 0
      }
    })

    const reject = once(reason => {
      process.env.NODE_ENV !== 'production' && warn(
        `Failed to resolve async component: ${String(factory)}` +
        (reason ? `\nReason: ${reason}` : '')
      )
      if (isDef(factory.errorComp)) {
        factory.error = true
        forceRender(true)
      }
    })

    const res = factory(resolve, reject)

    if (isObject(res)) {
      if (isPromise(res)) {
        // () => Promise
        if (isUndef(factory.resolved)) {
          res.then(resolve, reject)
        }
      } else if (isPromise(res.component)) {
        res.component.then(resolve, reject)

        if (isDef(res.error)) {
          factory.errorComp = ensureCtor(res.error, baseCtor)
        }

        if (isDef(res.loading)) {
          factory.loadingComp = ensureCtor(res.loading, baseCtor)
          if (res.delay === 0) {
            factory.loading = true
          } else {
            timerLoading = setTimeout(() => {
              timerLoading = null
              if (isUndef(factory.resolved) && isUndef(factory.error)) {
                factory.loading = true
                forceRender(false)
              }
            }, res.delay || 200)
          }
        }

        if (isDef(res.timeout)) {
          timerTimeout = setTimeout(() => {
            timerTimeout = null
            if (isUndef(factory.resolved)) {
              reject(
                process.env.NODE_ENV !== 'production'
                  ? `timeout (${res.timeout}ms)`
                  : null
              )
            }
          }, res.timeout)
        }
      }
    }

    sync = false
    // return in case resolved synchronously
    return factory.loading
      ? factory.loadingComp
      : factory.resolved
  }
}
