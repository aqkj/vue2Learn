/* @flow */

import { remove, isDef } from 'shared/util'

export default {
  create (_: any, vnode: VNodeWithData) {
    registerRef(vnode)
  },
  update (oldVnode: VNodeWithData, vnode: VNodeWithData) {
    if (oldVnode.data.ref !== vnode.data.ref) {
      registerRef(oldVnode, true)
      registerRef(vnode)
    }
  },
  destroy (vnode: VNodeWithData) {
    registerRef(vnode, true)
  }
}
/**
 * 注册ref
 * @param {VNode} vnode
 * @param {boolean} isRemoval
 */
export function registerRef (vnode: VNodeWithData, isRemoval: ?boolean) {
  // 获取ref
  const key = vnode.data.ref
  // 判断ref存在
  if (!isDef(key)) return
  // 获取vnode上下文
  const vm = vnode.context
  // 设置ref
  const ref = vnode.componentInstance || vnode.elm
  // 获取当前实例的refs
  const refs = vm.$refs

  if (isRemoval) {
    // 判断是否为数组
    if (Array.isArray(refs[key])) {
      // 为数组则移除ref
      remove(refs[key], ref)
    } else if (refs[key] === ref) {
      // 如果相等则移除
      refs[key] = undefined
    }
  } else {
    if (vnode.data.refInFor) {
      if (!Array.isArray(refs[key])) {
        refs[key] = [ref]
      } else if (refs[key].indexOf(ref) < 0) {
        // $flow-disable-line
        refs[key].push(ref)
      }
    } else {
      refs[key] = ref
    }
  }
}
