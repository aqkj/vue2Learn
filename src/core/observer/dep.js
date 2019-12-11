/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 * dep类，用于和wathcer进行关联
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  subs: Array<Watcher>;
  /**
   * 构造函数
   */
  constructor () {
    // 设置唯一id
    this.id = uid++
    // 设置订阅数组
    this.subs = []
  }
  /**
   * 添加订阅
   * @param {object} sub 订阅对象
   */
  addSub (sub: Watcher) {
    // 插入sub数组
    this.subs.push(sub)
  }
  /**
   * 移除订阅
   * @param {object} sub 订阅对象
   */
  removeSub (sub: Watcher) {
    // 移除sub赎罪
    remove(this.subs, sub)
  }
  /**
   * 依赖关联
   */
  depend () {
    if (Dep.target) {
      // 添加 至watcher
      Dep.target.addDep(this)
    }
  }
  /**
   * 通知更新
   */
  notify () {
    // stabilize the subscriber list first
    // 获取订阅数组
    const subs = this.subs.slice()
    // 非生产则进行排序
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // subs aren't sorted in scheduler if not running async
      // we need to sort them now to make sure they fire in correct
      // order
      subs.sort((a, b) => a.id - b.id)
    }
    // 遍历调用update更新方法
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time
// 用于依赖关联，一时间内只能有一个
Dep.target = null
// 存储栈
const targetStack = []
/**
 * 添加wathcer
 * @param {any} target wathcer
 */
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}
/**
 * 移除watcher
 */
export function popTarget () {
  // 移除watcher
  targetStack.pop()
  // target设置为最后一个
  Dep.target = targetStack[targetStack.length - 1]
}
