/**
 * Virtual DOM patching algorithm based on Snabbdom by
 * Simon Friis Vindum (@paldepind)
 * Licensed under the MIT License
 * https://github.com/paldepind/snabbdom/blob/master/LICENSE
 *
 * modified by Evan You (@yyx990803)
 *
 * Not type-checking this because this file is perf-critical and the cost
 * of making flow understand it is not worth it.
 */

import VNode, { cloneVNode } from './vnode'
import config from '../config'
import { SSR_ATTR } from 'shared/constants'
import { registerRef } from './modules/ref'
import { traverse } from '../observer/traverse'
import { activeInstance } from '../instance/lifecycle'
import { isTextInputType } from 'web/util/element'

import {
  warn,
  isDef,
  isUndef,
  isTrue,
  makeMap,
  isRegExp,
  isPrimitive
} from '../util/index'

export const emptyNode = new VNode('', {}, [])
// 钩子数组
const hooks = ['create', 'activate', 'update', 'remove', 'destroy']
/**
 * 判断vnode是否相同
 * @param {VNode} a 虚拟node
 * @param {Vnode} b 虚拟node
 */
function sameVnode (a, b) {
  // 判断key是否相同，并且tag相同，是否为注释，都定义了data
  return (
    a.key === b.key && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}
/**
 * 判断input类型是否相同
 * @param {Vnode} a
 * @param {VNode} b
 */
function sameInputType (a, b) {
  // 如果标签不是input则返回true
  if (a.tag !== 'input') return true
  let i
  // 获取input的type类型
  const typeA = isDef(i = a.data) && isDef(i = i.attrs) && i.type
  // 获取input的type类型
  const typeB = isDef(i = b.data) && isDef(i = i.attrs) && i.type
  // 判断类型是否相同，或者都是内置的type
  return typeA === typeB || isTextInputType(typeA) && isTextInputType(typeB)
}

function createKeyToOldIdx (children, beginIdx, endIdx) {
  let i, key
  const map = {}
  for (i = beginIdx; i <= endIdx; ++i) {
    key = children[i].key
    if (isDef(key)) map[key] = i
  }
  return map
}
/**
 * 创建补丁方法
 * @param {object} backend 工具操作方法对象
 */
export function createPatchFunction (backend) {
  let i, j
  // 存储回调
  const cbs = {}
  // 获取传入参数
  const { modules, nodeOps } = backend
  // 遍历钩子数组
  for (i = 0; i < hooks.length; ++i) {
    // 初始化钩子回调方法数组
    cbs[hooks[i]] = []
    // 遍历模块方法
    for (j = 0; j < modules.length; ++j) {
      // 如果模块对应方法的钩子存在
      if (isDef(modules[j][hooks[i]])) {
        // 插入到对应钩子的回调方法数组中
        cbs[hooks[i]].push(modules[j][hooks[i]])
      }
    }
  }
  /**
   * 空元素
   * @param {Node} elm 元素
   */
  function emptyNodeAt (elm) {
    return new VNode(nodeOps.tagName(elm).toLowerCase(), {}, [], undefined, elm)
  }
  /**
   * 创建删除回调
   * @param {Node} childElm 子元素
   * @param {any} listeners
   */
  function createRmCb (childElm, listeners) {
    function remove () {
      if (--remove.listeners === 0) {
        removeNode(childElm)
      }
    }
    remove.listeners = listeners
    return remove
  }
  /**
   * 移除Node
   * @param {Node} el 元素
   */
  function removeNode (el) {
    // 获取父级元素
    const parent = nodeOps.parentNode(el)
    // element may have already been removed due to v-html / v-text
    // 如果父级存在
    if (isDef(parent)) {
      // 移除当前元素
      nodeOps.removeChild(parent, el)
    }
  }
  /**
   * 是否为未知的元素
   * @param {VNode} vnode 虚拟node
   * @param {*} inVPre
   */
  function isUnknownElement (vnode, inVPre) {
    return (
      !inVPre &&
      !vnode.ns &&
      !(
        config.ignoredElements.length &&
        config.ignoredElements.some(ignore => {
          return isRegExp(ignore)
            ? ignore.test(vnode.tag)
            : ignore === vnode.tag
        })
      ) &&
      config.isUnknownElement(vnode.tag)
    )
  }

  let creatingElmInVPre = 0
  /**
   * 创建元素
   * @param {VNode} vnode 虚拟node
   * @param {any[]} insertedVnodeQueue 插入vnode序列
   * @param {*} parentElm 父元素
   * @param {*} refElm 参考元素
   * @param {*} nested
   * @param {*} ownerArray
   * @param {*} index
   */
  function createElm (
    vnode,
    insertedVnodeQueue,
    parentElm,
    refElm,
    nested,
    ownerArray,
    index
  ) {
    // 判断虚拟node上是否存在elm元素
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // This vnode was used in a previous render!
      // now it's used as a new node, overwriting its elm would cause
      // potential patch errors down the road when it's used as an insertion
      // reference node. Instead, we clone the node on-demand before creating
      // associated DOM element for it.
      vnode = ownerArray[index] = cloneVNode(vnode)
    }
    // 如果nested不存则为true
    vnode.isRootInsert = !nested // for transition enter check
    // 创建组件成功返回true
    if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
      return
    }
    // 获取虚拟node的数据
    const data = vnode.data
    // 获取子元素列表
    const children = vnode.children
    // 获取标签名
    const tag = vnode.tag
    // 判断标签名称是否存在
    if (isDef(tag)) {
      // 非生产环境
      if (process.env.NODE_ENV !== 'production') {
        // 判断是否存在pre
        if (data && data.pre) {
          // ++
          creatingElmInVPre++
        }
        // 判断是否为未知的元素，则报错
        if (isUnknownElement(vnode, creatingElmInVPre)) {
          warn(
            'Unknown custom element: <' + tag + '> - did you ' +
            'register the component correctly? For recursive components, ' +
            'make sure to provide the "name" option.',
            vnode.context
          )
        }
      }
      // 创建元素，传递给elm属性
      vnode.elm = vnode.ns
        ? nodeOps.createElementNS(vnode.ns, tag)
        : nodeOps.createElement(tag, vnode)
      // 设置作用域
      setScope(vnode)

      /* istanbul ignore if */
      if (__WEEX__) {
        // in Weex, the default insertion order is parent-first.
        // List items can be optimized to use children-first insertion
        // with append="tree".
        const appendAsTree = isDef(data) && isTrue(data.appendAsTree)
        if (!appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
        createChildren(vnode, children, insertedVnodeQueue)
        if (appendAsTree) {
          if (isDef(data)) {
            invokeCreateHooks(vnode, insertedVnodeQueue)
          }
          insert(parentElm, vnode.elm, refElm)
        }
      } else {
        // 创建子元素
        createChildren(vnode, children, insertedVnodeQueue)
        // 判断data是否存在
        if (isDef(data)) {
          // 存在则调用createHook
          invokeCreateHooks(vnode, insertedVnodeQueue)
        }
        // 插入到元素中
        insert(parentElm, vnode.elm, refElm)
      }

      if (process.env.NODE_ENV !== 'production' && data && data.pre) {
        // 非生产环境，并且pre则--
        creatingElmInVPre--
      }
    } else if (isTrue(vnode.isComment)) { // 判断是否为注释
      // 创建注释元素
      vnode.elm = nodeOps.createComment(vnode.text)
      // 插入到元素中
      insert(parentElm, vnode.elm, refElm)
    } else {
      // 其他情况创建文本元素，插入到元素内
      vnode.elm = nodeOps.createTextNode(vnode.text)
      insert(parentElm, vnode.elm, refElm)
    }
  }
  /**
   * 创建组件
   * @param {VNode} vnode 虚拟node
   * @param {any[]} insertedVnodeQueue 插入的虚拟node队列
   * @param {Node} parentElm 父元素
   * @param {Node} refElm 参考元素
   */
  function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    // 获取vnode的data
    let i = vnode.data
    // 判断是否存在
    if (isDef(i)) {
      // 判断是否有组件实例，并且存在keepAlive
      const isReactivated = isDef(vnode.componentInstance) && i.keepAlive
      // 判断是否存在init钩子
      if (isDef(i = i.hook) && isDef(i = i.init)) {
        // 存在则调用init钩子
        i(vnode, false /* hydrating */)
      }
      // after calling the init hook, if the vnode is a child component
      // it should've created a child instance and mounted it. the child
      // component also has set the placeholder vnode's elm.
      // in that case we can just return the element and be done.
      // 判断是否存在实例
      if (isDef(vnode.componentInstance)) {
        // 初始化组件
        initComponent(vnode, insertedVnodeQueue)
        // 插入元素到parent
        insert(parentElm, vnode.elm, refElm)
        // 判断是否为isReactivated
        if (isTrue(isReactivated)) {
          // 重新启用组件
          reactivateComponent(vnode, insertedVnodeQueue, parentElm, refElm)
        }
        // 返回true
        return true
      }
    }
  }
  /**
   * 初始化组件
   * @param {VNode} vnode 虚拟node
   * @param {any[]} insertedVnodeQueue 插入的虚拟node队列
   */
  function initComponent (vnode, insertedVnodeQueue) {
    // 判断是否在插入中
    if (isDef(vnode.data.pendingInsert)) {
      // 插入队列
      insertedVnodeQueue.push.apply(insertedVnodeQueue, vnode.data.pendingInsert)
      //  设置为空
      vnode.data.pendingInsert = null
    }
    // 获取组件实例下的真实node
    vnode.elm = vnode.componentInstance.$el
    // 判断是否存在_vnode,并且有标签
    if (isPatchable(vnode)) {
      // 调用create钩子
      invokeCreateHooks(vnode, insertedVnodeQueue)
      // 设置作用域
      setScope(vnode)
    } else {
      // empty component root.
      // skip all element-related modules except for ref (#3455)
      registerRef(vnode)
      // make sure to invoke the insert hook
      // 插入insertHook队列
      insertedVnodeQueue.push(vnode)
    }
  }
  /**
   * 激活组件
   * @param {VNode} vnode 虚拟node
   * @param {any[]} insertedVnodeQueue 插入的虚拟node队列
   * @param {Node} parentElm 父元素
   * @param {Node} refElm 参考元素
   */
  function reactivateComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
    let i
    // hack for #4339: a reactivated component with inner transition
    // does not trigger because the inner node's created hooks are not called
    // again. It's not ideal to involve module-specific logic in here but
    // there doesn't seem to be a better way to do it.
    // 获取元素
    let innerNode = vnode
    // 遍历循环
    while (innerNode.componentInstance) {
      // 获取内部的vnode树
      innerNode = innerNode.componentInstance._vnode
      // 判断是否存在data，并且存在transition
      if (isDef(i = innerNode.data) && isDef(i = i.transition)) {
        // 获取activate钩子下的构造函数列表
        for (i = 0; i < cbs.activate.length; ++i) {
          // 调用钩子
          cbs.activate[i](emptyNode, innerNode)
        }
        // 插入到队列
        insertedVnodeQueue.push(innerNode)
        break
      }
    }
    // unlike a newly created component,
    // a reactivated keep-alive component doesn't insert itself
    insert(parentElm, vnode.elm, refElm)
  }
  /**
   * 插入
   * @param {object} parent
   * @param {*} elm
   * @param {*} ref
   */
  function insert (parent, elm, ref) {
    // 判断父级是否存在
    if (isDef(parent)) {
      // 判断ref是否存在
      if (isDef(ref)) {
        // 判断ref的parent是否跟parent相同
        if (nodeOps.parentNode(ref) === parent) {
          // 插入到对应的ref之前
          nodeOps.insertBefore(parent, elm, ref)
        }
      } else {
        // 插入
        nodeOps.appendChild(parent, elm)
      }
    }
  }
  /**
   * 创建子元素
   * @param {VNode} vnode 虚拟bode
   * @param {VNode[]} children 子虚拟node
   * @param {any[]} insertedVnodeQueue 插入的队列
   */
  function createChildren (vnode, children, insertedVnodeQueue) {
    // 判断是否为数组
    if (Array.isArray(children)) {
      // 非生产环境
      if (process.env.NODE_ENV !== 'production') {
        // 检查重复的key
        checkDuplicateKeys(children)
      }
      // 遍历子元素
      for (let i = 0; i < children.length; ++i) {
        // 调用创建元素方法
        createElm(children[i], insertedVnodeQueue, vnode.elm, null, true, children, i)
      }
    } else if (isPrimitive(vnode.text)) { // 判断是否为原始类型
      // 转换成string并创建text节点，插入到元素内
      nodeOps.appendChild(vnode.elm, nodeOps.createTextNode(String(vnode.text)))
    }
  }

  function isPatchable (vnode) {
    while (vnode.componentInstance) {
      vnode = vnode.componentInstance._vnode
    }
    return isDef(vnode.tag)
  }
  /**
   * 创建钩子
   * @param {VNode} vnode 虚拟node
   * @param {any[]} insertedVnodeQueue 插入的队列
   */
  function invokeCreateHooks (vnode, insertedVnodeQueue) {
    // 遍历创建回调数组
    for (let i = 0; i < cbs.create.length; ++i) {
      // 调用创建回调
      cbs.create[i](emptyNode, vnode)
    }
    // 获取钩子
    i = vnode.data.hook // Reuse variable
    // 判断钩子是否存在
    if (isDef(i)) {
      // 判断是否存在创建钩子
      if (isDef(i.create)) i.create(emptyNode, vnode)
      // 判断是否存在插入钩子
      if (isDef(i.insert)) insertedVnodeQueue.push(vnode)
    }
  }

  // set scope id attribute for scoped CSS.
  // this is implemented as a special case to avoid the overhead
  // of going through the normal attribute patching process.
  /**
   * 设置作用域
   * @param {VNode} vnode 虚拟node
   */
  function setScope (vnode) {
    let i
    // 获取scopeId
    if (isDef(i = vnode.fnScopeId)) {
      // 设置样式scope
      nodeOps.setStyleScope(vnode.elm, i)
    } else {
      let ancestor = vnode
      // 遍历vnode，如果当前vnode不存在scopeId则遍历获取父级的scopeId
      while (ancestor) {
        if (isDef(i = ancestor.context) && isDef(i = i.$options._scopeId)) {
          nodeOps.setStyleScope(vnode.elm, i)
        }
        // 获取父级
        ancestor = ancestor.parent
      }
    }
    // for slot content they should also get the scopeId from the host instance.
    if (isDef(i = activeInstance) &&
      i !== vnode.context &&
      i !== vnode.fnContext &&
      isDef(i = i.$options._scopeId)
    ) {
      nodeOps.setStyleScope(vnode.elm, i)
    }
  }
  /**
   * 添加vnode
   * @param {*} parentElm
   * @param {*} refElm
   * @param {*} vnodes
   * @param {*} startIdx
   * @param {*} endIdx
   * @param {*} insertedVnodeQueue
   */
  function addVnodes (parentElm, refElm, vnodes, startIdx, endIdx, insertedVnodeQueue) {
    for (; startIdx <= endIdx; ++startIdx) {
      createElm(vnodes[startIdx], insertedVnodeQueue, parentElm, refElm, false, vnodes, startIdx)
    }
  }
  /**
   * 调用销毁钩子
   * @param {VNode} vnode 虚拟node
   */
  function invokeDestroyHook (vnode) {
    let i, j
    // 获取vnode的data
    const data = vnode.data
    // 判断data是否存在
    if (isDef(data)) {
      // 判断组件钩子是否存在，并且是否存在destory钩子，存在则调用
      if (isDef(i = data.hook) && isDef(i = i.destroy)) i(vnode)
      // 遍历销毁状态回调，并且触发回调数组
      for (i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode)
    }
    // 如果当前虚拟node的子元素存在
    if (isDef(i = vnode.children)) {
      // 遍历自元素，递归销毁
      for (j = 0; j < vnode.children.length; ++j) {
        invokeDestroyHook(vnode.children[j])
      }
    }
  }

  function removeVnodes (vnodes, startIdx, endIdx) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (isDef(ch)) {
        if (isDef(ch.tag)) {
          removeAndInvokeRemoveHook(ch)
          invokeDestroyHook(ch)
        } else { // Text node
          removeNode(ch.elm)
        }
      }
    }
  }

  function removeAndInvokeRemoveHook (vnode, rm) {
    if (isDef(rm) || isDef(vnode.data)) {
      let i
      const listeners = cbs.remove.length + 1
      if (isDef(rm)) {
        // we have a recursively passed down rm callback
        // increase the listeners count
        rm.listeners += listeners
      } else {
        // directly removing
        rm = createRmCb(vnode.elm, listeners)
      }
      // recursively invoke hooks on child component root node
      if (isDef(i = vnode.componentInstance) && isDef(i = i._vnode) && isDef(i.data)) {
        removeAndInvokeRemoveHook(i, rm)
      }
      for (i = 0; i < cbs.remove.length; ++i) {
        cbs.remove[i](vnode, rm)
      }
      if (isDef(i = vnode.data.hook) && isDef(i = i.remove)) {
        i(vnode, rm)
      } else {
        rm()
      }
    } else {
      removeNode(vnode.elm)
    }
  }
  /**
   * 更新自元素
   * @param {Node} parentElm 父元素
   * @param {*} oldCh
   * @param {*} newCh
   * @param {*} insertedVnodeQueue
   * @param {*} removeOnly
   */
  function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    // 旧开始位置
    let oldStartIdx = 0
    // 新开始位置
    let newStartIdx = 0
    // 获取旧结束位置
    let oldEndIdx = oldCh.length - 1
    // 获取旧的开始vnode
    let oldStartVnode = oldCh[0]
    // 旧结束 vnode
    let oldEndVnode = oldCh[oldEndIdx]
    // 新的结束位置
    let newEndIdx = newCh.length - 1
    // 新的开始vnode
    let newStartVnode = newCh[0]
    // 新的结束vnode
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx, idxInOld, vnodeToMove, refElm

    // removeOnly is a special flag used only by <transition-group>
    // to ensure removed elements stay in correct relative positions
    // during leaving transitions
    // 非删除，则canmove
    const canMove = !removeOnly
    // 非生产环境
    if (process.env.NODE_ENV !== 'production') {
      // 检查相同的key
      checkDuplicateKeys(newCh)
    }
    // 遍历开始
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      // 判断旧开始vnode是否不存在
      if (isUndef(oldStartVnode)) {
        // 不存在则++,获取下一个位置的vnode
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
        // 判断旧结束vnode是否存在
      } else if (isUndef(oldEndVnode)) {
        // 不存在则--,并且更新oldEndVnode
        oldEndVnode = oldCh[--oldEndIdx]
        // 判断旧开始vnode是新开始vnode是否相同
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        idxInOld = isDef(newStartVnode.key)
          ? oldKeyToIdx[newStartVnode.key]
          : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
        if (isUndef(idxInOld)) { // New element
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
        } else {
          vnodeToMove = oldCh[idxInOld]
          if (sameVnode(vnodeToMove, newStartVnode)) {
            patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
            oldCh[idxInOld] = undefined
            canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
          } else {
            // same key but different element. treat as new element
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
    }
    if (oldStartIdx > oldEndIdx) {
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) {
      removeVnodes(oldCh, oldStartIdx, oldEndIdx)
    }
  }
  /**
   * 检查重复的key
   * @param {VNode[]} children 子元素
   */
  function checkDuplicateKeys (children) {
    // 存储key
    const seenKeys = {}
    // 遍历子元素
    for (let i = 0; i < children.length; i++) {
      // 获取对应vnode
      const vnode = children[i]
      // 获取元素的key
      const key = vnode.key
      // 判断key是否存在
      if (isDef(key)) {
        // 判断对应的key是否存在
        if (seenKeys[key]) {
          // 存在则报错
          warn(
            `Duplicate keys detected: '${key}'. This may cause an update error.`,
            vnode.context
          )
        } else {
          // 设置为true
          seenKeys[key] = true
        }
      }
    }
  }

  function findIdxInOld (node, oldCh, start, end) {
    for (let i = start; i < end; i++) {
      const c = oldCh[i]
      if (isDef(c) && sameVnode(node, c)) return i
    }
  }
  /**
   * 修补vnode
   * @param {VNode} oldVnode 旧vnode
   * @param {VNode} vnode 新Vnode
   * @param {any[]} insertedVnodeQueue 插入的队列
   * @param {*} ownerArray
   * @param {*} index
   * @param {*} removeOnly
   */
  function patchVnode (
    oldVnode,
    vnode,
    insertedVnodeQueue,
    ownerArray,
    index,
    removeOnly
  ) {
    // 如果新旧相同则直接返回
    if (oldVnode === vnode) {
      return
    }
    // 判断elm是否存在
    if (isDef(vnode.elm) && isDef(ownerArray)) {
      // clone reused vnode
      // 克隆vnode
      vnode = ownerArray[index] = cloneVNode(vnode)
    }
    // 设置元素
    const elm = vnode.elm = oldVnode.elm
    // 判断是否为异步组件
    if (isTrue(oldVnode.isAsyncPlaceholder)) {
      if (isDef(vnode.asyncFactory.resolved)) {
        hydrate(oldVnode.elm, vnode, insertedVnodeQueue)
      } else {
        vnode.isAsyncPlaceholder = true
      }
      return
    }

    // reuse element for static trees.
    // note we only do this if the vnode is cloned -
    // if the new node is not cloned it means the render functions have been
    // reset by the hot-reload-api and we need to do a proper re-render.
    // 判断是否为静态,并且两者key相同
    if (isTrue(vnode.isStatic) &&
      isTrue(oldVnode.isStatic) &&
      vnode.key === oldVnode.key &&
      (isTrue(vnode.isCloned) || isTrue(vnode.isOnce))
    ) {
      // 设置实例
      vnode.componentInstance = oldVnode.componentInstance
      return
    }

    let i
    // 获取data
    const data = vnode.data
    // 判断是否存在prepatch钩子
    if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
      // 调用钩子
      i(oldVnode, vnode)
    }
    // 获取自元素列表
    const oldCh = oldVnode.children
    const ch = vnode.children
    // 判断data是否存在
    if (isDef(data) && isPatchable(vnode)) {
      // 遍历update钩子，并且调用
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      // 调用自身update钩子
      if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
    // 判断text是否不存在
    if (isUndef(vnode.text)) {
      // 判断旧子元素是否存在，并且当前自元素存在
      if (isDef(oldCh) && isDef(ch)) {
        // 新旧子元素数组不相等则更新
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) { // 判断新的children是否存在
        if (process.env.NODE_ENV !== 'production') {
          // 检测重复的key
          checkDuplicateKeys(ch)
        }
        // 判断旧vnode的text是否存在，存则则设置内容为空
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        // 添加vNode
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        // 移除旧的
        removeVnodes(oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      nodeOps.setTextContent(elm, vnode.text)
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.postpatch)) i(oldVnode, vnode)
    }
  }
  /**
   * 插入钩子
   * @param {VNode} vnode 虚拟node
   * @param {any[]} queue 插入的队列
   * @param {boolean} initial 是否为初始化
   */
  function invokeInsertHook (vnode, queue, initial) {
    // delay insert hooks for component root nodes, invoke them after the
    // element is really inserted
    // 判断是否为初始化, 并且存在父元素
    if (isTrue(initial) && isDef(vnode.parent)) {
      // 设置到pendingInsert内
      vnode.parent.data.pendingInsert = queue
    } else {
      // 遍历队列数组
      for (let i = 0; i < queue.length; ++i) {
        // 调用插入钩子
        queue[i].data.hook.insert(queue[i])
      }
    }
  }

  let hydrationBailed = false
  // list of modules that can skip create hook during hydration because they
  // are already rendered on the client or has no need for initialization
  // Note: style is excluded because it relies on initial clone for future
  // deep updates (#7063).
  const isRenderedModule = makeMap('attrs,class,staticClass,staticStyle,key')

  // Note: this is a browser-only function so we can assume elms are DOM nodes.
  function hydrate (elm, vnode, insertedVnodeQueue, inVPre) {
    let i
    const { tag, data, children } = vnode
    inVPre = inVPre || (data && data.pre)
    vnode.elm = elm

    if (isTrue(vnode.isComment) && isDef(vnode.asyncFactory)) {
      vnode.isAsyncPlaceholder = true
      return true
    }
    // assert node match
    if (process.env.NODE_ENV !== 'production') {
      if (!assertNodeMatch(elm, vnode, inVPre)) {
        return false
      }
    }
    if (isDef(data)) {
      if (isDef(i = data.hook) && isDef(i = i.init)) i(vnode, true /* hydrating */)
      if (isDef(i = vnode.componentInstance)) {
        // child component. it should have hydrated its own tree.
        initComponent(vnode, insertedVnodeQueue)
        return true
      }
    }
    if (isDef(tag)) {
      if (isDef(children)) {
        // empty element, allow client to pick up and populate children
        if (!elm.hasChildNodes()) {
          createChildren(vnode, children, insertedVnodeQueue)
        } else {
          // v-html and domProps: innerHTML
          if (isDef(i = data) && isDef(i = i.domProps) && isDef(i = i.innerHTML)) {
            if (i !== elm.innerHTML) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('server innerHTML: ', i)
                console.warn('client innerHTML: ', elm.innerHTML)
              }
              return false
            }
          } else {
            // iterate and compare children lists
            let childrenMatch = true
            let childNode = elm.firstChild
            for (let i = 0; i < children.length; i++) {
              if (!childNode || !hydrate(childNode, children[i], insertedVnodeQueue, inVPre)) {
                childrenMatch = false
                break
              }
              childNode = childNode.nextSibling
            }
            // if childNode is not null, it means the actual childNodes list is
            // longer than the virtual children list.
            if (!childrenMatch || childNode) {
              /* istanbul ignore if */
              if (process.env.NODE_ENV !== 'production' &&
                typeof console !== 'undefined' &&
                !hydrationBailed
              ) {
                hydrationBailed = true
                console.warn('Parent: ', elm)
                console.warn('Mismatching childNodes vs. VNodes: ', elm.childNodes, children)
              }
              return false
            }
          }
        }
      }
      if (isDef(data)) {
        let fullInvoke = false
        for (const key in data) {
          if (!isRenderedModule(key)) {
            fullInvoke = true
            invokeCreateHooks(vnode, insertedVnodeQueue)
            break
          }
        }
        if (!fullInvoke && data['class']) {
          // ensure collecting deps for deep class bindings for future updates
          traverse(data['class'])
        }
      }
    } else if (elm.data !== vnode.text) {
      elm.data = vnode.text
    }
    return true
  }

  function assertNodeMatch (node, vnode, inVPre) {
    if (isDef(vnode.tag)) {
      return vnode.tag.indexOf('vue-component') === 0 || (
        !isUnknownElement(vnode, inVPre) &&
        vnode.tag.toLowerCase() === (node.tagName && node.tagName.toLowerCase())
      )
    } else {
      return node.nodeType === (vnode.isComment ? 8 : 3)
    }
  }
  /**
   * 返回patch补丁方法
   * @param {VNode} 旧的虚拟node
   * @param {VNode} 新的虚拟node
   */
  return function patch (oldVnode, vnode, hydrating, removeOnly) {
    // 如果新的vnode为空
    if (isUndef(vnode)) {
      // 如果旧的vnode不为空，则调用销毁钩子
      if (isDef(oldVnode)) invokeDestroyHook(oldVnode)
      return
    }
    // 是否为初始化补丁
    let isInitialPatch = false
    // 插入的虚拟node队列
    const insertedVnodeQueue = []
    // 如果旧vnode为undefined，则代表其为初始化
    if (isUndef(oldVnode)) {
      // empty mount (likely as component), create new root element
      // 初始化补丁为true
      isInitialPatch = true
      // 创建元素
      createElm(vnode, insertedVnodeQueue)
    } else {
      // 判断是否为真实的node
      const isRealElement = isDef(oldVnode.nodeType)
      // 非真实的node并且旧node和新node一样
      if (!isRealElement && sameVnode(oldVnode, vnode)) {
        // patch existing root node
        // 修补vnode
        patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
      } else {
        // 是否为真实node
        if (isRealElement) {
          // mounting to a real element
          // check if this is server-rendered content and if we can perform
          // a successful hydration.
          // 判断nodeType为元素节点,并且存在ssr属性
          if (oldVnode.nodeType === 1 && oldVnode.hasAttribute(SSR_ATTR)) {
            // 移除ssr属性
            oldVnode.removeAttribute(SSR_ATTR)
            // 设置为true
            hydrating = true
          }
          // 如果为true
          if (isTrue(hydrating)) {
            if (hydrate(oldVnode, vnode, insertedVnodeQueue)) {
              invokeInsertHook(vnode, insertedVnodeQueue, true)
              return oldVnode
            } else if (process.env.NODE_ENV !== 'production') {
              warn(
                'The client-side rendered virtual DOM tree is not matching ' +
                'server-rendered content. This is likely caused by incorrect ' +
                'HTML markup, for example nesting block-level elements inside ' +
                '<p>, or missing <tbody>. Bailing hydration and performing ' +
                'full client-side render.'
              )
            }
          }
          // either not server-rendered, or hydration failed.
          // create an empty node and replace it
          // 创建一个空的vnode
          oldVnode = emptyNodeAt(oldVnode)
        }

        // replacing existing element
        // 获取vnode的elm属性
        const oldElm = oldVnode.elm
        // 获取父节点
        const parentElm = nodeOps.parentNode(oldElm)

        // create new node
        // 创建新的元素
        createElm(
          vnode,
          insertedVnodeQueue,
          // extremely rare edge case: do not insert if old element is in a
          // leaving transition. Only happens when combining transition +
          // keep-alive + HOCs. (#4590)
          oldElm._leaveCb ? null : parentElm,
          nodeOps.nextSibling(oldElm)
        )

        // update parent placeholder node element, recursively
        // 判断vnode父元素是否存在
        if (isDef(vnode.parent)) {
          let ancestor = vnode.parent
          const patchable = isPatchable(vnode)
          while (ancestor) {
            for (let i = 0; i < cbs.destroy.length; ++i) {
              cbs.destroy[i](ancestor)
            }
            ancestor.elm = vnode.elm
            if (patchable) {
              for (let i = 0; i < cbs.create.length; ++i) {
                cbs.create[i](emptyNode, ancestor)
              }
              // #6513
              // invoke insert hooks that may have been merged by create hooks.
              // e.g. for directives that uses the "inserted" hook.
              const insert = ancestor.data.hook.insert
              if (insert.merged) {
                // start at index 1 to avoid re-invoking component mounted hook
                for (let i = 1; i < insert.fns.length; i++) {
                  insert.fns[i]()
                }
              }
            } else {
              registerRef(ancestor)
            }
            ancestor = ancestor.parent
          }
        }

        // destroy old node
        if (isDef(parentElm)) {
          removeVnodes([oldVnode], 0, 0)
        } else if (isDef(oldVnode.tag)) {
          invokeDestroyHook(oldVnode)
        }
      }
    }
    // 调用插入钩子
    invokeInsertHook(vnode, insertedVnodeQueue, isInitialPatch)
    // 返回vnode实例
    return vnode.elm
  }
}
