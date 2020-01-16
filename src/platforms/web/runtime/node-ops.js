/* @flow */

import { namespaceMap } from 'web/util/index'
/**
 * 创建元素
 * @param {string} tagName 标签名称
 * @param {object} vnode 虚拟node
 */
export function createElement (tagName: string, vnode: VNode): Element {
  // 创建元素
  const elm = document.createElement(tagName)
  // 如果标签名称并非是select
  if (tagName !== 'select') {
    // 直接返回
    return elm
  }
  // false or null will remove the attribute but undefined will not
  // 判断是否存在multiple属性，存在则设置属性
  if (vnode.data && vnode.data.attrs && vnode.data.attrs.multiple !== undefined) {
    // 设置多选属性
    elm.setAttribute('multiple', 'multiple')
  }
  // 返回创建的元素
  return elm
}
/**
 * 创建作用域元素
 * @param {string} namespace 命名空间
 * @param {string} tagName 标签名称
 */
export function createElementNS (namespace: string, tagName: string): Element {
  return document.createElementNS(namespaceMap[namespace], tagName)
}
/**
 * 创建文本node
 * @param {string} text 字符串
 */
export function createTextNode (text: string): Text {
  // 创建文本node
  return document.createTextNode(text)
}
/**
 * 创建注释元素
 * @param {*} text
 */
export function createComment (text: string): Comment {
  // 创建注释
  return document.createComment(text)
}
/**
 * 插入元素
 * @param {Node} parentNode 父级元素
 * @param {Node} newNode 新元素
 * @param {Node} referenceNode 在此元素之前插入
 */
export function insertBefore (parentNode: Node, newNode: Node, referenceNode: Node) {
  parentNode.insertBefore(newNode, referenceNode)
}
/**
 * 移除自元素
 * @param {Node} node 元素节点
 * @param {Node} child 子节点
 */
export function removeChild (node: Node, child: Node) {
  node.removeChild(child)
}
/**
 * 插入子元素
 * @param {Node} node 元素节点
 * @param {Node} child 插入的元素
 */
export function appendChild (node: Node, child: Node) {
  node.appendChild(child)
}
/**
 * 父级节点
 * @param {Node} node 当前节点
 */
export function parentNode (node: Node): ?Node {
  // 返回父节点
  return node.parentNode
}
/**
 * 返回下一个兄弟节点
 * @param {Node} node 元素
 */
export function nextSibling (node: Node): ?Node {
  return node.nextSibling
}
/**
 * 获取标签名称
 * @param {Element} node 元素
 */
export function tagName (node: Element): string {
  // 返回元素名称
  return node.tagName
}
/**
 * 为元素设置文本
 * @param {Node} node 元素
 * @param {string} text 文本
 */
export function setTextContent (node: Node, text: string) {
  // 设置文本
  node.textContent = text
}
/**
 * 设置作用域id
 * @param {Element} node 元素
 * @param {string} scopeId 作用域id
 */
export function setStyleScope (node: Element, scopeId: string) {
  node.setAttribute(scopeId, '')
}
