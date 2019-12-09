/* @flow */

import type VNode from 'core/vdom/vnode'

/**
 * Runtime helper for resolving raw children VNodes into a slot object.
 * 解析插槽
 * @param {VNode[]} children 子vnode
 * @param {Component} ctx 上下文
 */
export function resolveSlots (
  children: ?Array<VNode>,
  context: ?Component
): { [key: string]: Array<VNode> } {
  // 判断children是否存在，不存在则直接返回空对象
  if (!children || !children.length) {
    return {}
  }
  // 设置slots
  const slots = {}
  // 遍历子元素数组
  for (let i = 0, l = children.length; i < l; i++) {
    // 获取子vnode
    const child = children[i]
    // 获取vnode数据
    const data = child.data
    // remove slot attribute if the node is resolved as a Vue slot node
    // 判断是否存在data属性和attr属性，并且attr属性有slot属性字段
    if (data && data.attrs && data.attrs.slot) {
      // 删除slot属性字段
      delete data.attrs.slot
    }
    // named slots should only be respected if the vnode was rendered in the
    // same context.
    if ((child.context === context || child.fnContext === context) &&
      data && data.slot != null
    ) {
      // 获取插槽名
      const name = data.slot
      // 获取对应名称插槽
      const slot = (slots[name] || (slots[name] = []))
      // 如果child的标签是template标签
      if (child.tag === 'template') {
        // 将template下的子元素插入到插槽
        slot.push.apply(slot, child.children || [])
      } else {
        // 插入插槽
        slot.push(child)
      }
    } else {
      // 如果不存在slot属性，则插入默认插槽
      (slots.default || (slots.default = [])).push(child)
    }
  }
  // ignore slots that contains only whitespace
  // 遍历插槽名称
  for (const name in slots) {
    // 判断插槽内是否都是空格，或者注释
    if (slots[name].every(isWhitespace)) {
      // 如果都是则删除对应插槽
      delete slots[name]
    }
  }
  // 返回处理完成的插槽
  return slots
}

function isWhitespace (node: VNode): boolean {
  return (node.isComment && !node.asyncFactory) || node.text === ' '
}
