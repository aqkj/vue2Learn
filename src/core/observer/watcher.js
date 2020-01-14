/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 * 观察者类
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;
  /**
   * 构造函数
   * @param {object} vm 组件实例
   * @param {string|function} expOrFn
   * @param {function} cb 回调
   * @param {object} options 配置
   * @param {boolean} isRenderWatcher
   */
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    // 设置vm
    this.vm = vm
    // 是否渲染watcher
    if (isRenderWatcher) {
      // 设置_watcher
      vm._watcher = this
    }
    // 添加wathcer到实例的_watchers数组内
    vm._watchers.push(this)
    // options
    // 如果配置存在
    if (options) {
      this.deep = !!options.deep // 深度
      this.user = !!options.user // 目前不知道干啥的
      this.lazy = !!options.lazy // 懒
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb // 获取回调
    this.id = ++uid // uid for batching 设置uid
    this.active = true // 默认为true
    this.dirty = this.lazy // for lazy watchers 脏检查
    this.deps = [] // deps用于跟dep绑定
    this.newDeps = [] // 新deps
    this.depIds = new Set() // depid
    this.newDepIds = new Set() // 新depid
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') { // 如果 exporfun是方法的话
      this.getter = expOrFn // 设置为对应的get
    } else {
      this.getter = parsePath(expOrFn) // 如果非function则拼接返回function
      if (!this.getter) { // 判断是否获取失败
        this.getter = noop // getter为空
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 如果为懒，则值为undefined否则调用get获取值
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   * 调用getter并且收集依赖
   */
  get () {
    // 将当前watcher挂载用于收集依赖
    pushTarget(this)
    // 存储value
    let value
    // 获取当前组件实例
    const vm = this.vm
    try {
      // 调用getter获取对应value
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      // 将watcher移除
      popTarget()
      // 清空更新依赖
      this.cleanupDeps()
    }
    // 返回获取的返回值
    return value
  }

  /**
   * Add a dependency to this directive.
   * 添加dep依赖
   */
  addDep (dep: Dep) {
    // 获取depid
    const id = dep.id
    // 判断newdepid内是否不存在depid
    if (!this.newDepIds.has(id)) {
      // 不存在则添加
      this.newDepIds.add(id)
      // 插入
      this.newDeps.push(dep)
      // 如果depids内不存在id，则说明之前并未收集到过
      if (!this.depIds.has(id)) {
        dep.addSub(this) // dep添加依赖
      }
    }
  }

  /**
   * Clean up for dependency collection.
   * 清空
   */
  cleanupDeps () {
    // 获取收集到的依赖的长度
    let i = this.deps.length
    // 遍历
    while (i--) {
      // 获取dep
      const dep = this.deps[i]
      // 判断新dep内是否存在旧的depid
      if (!this.newDepIds.has(dep.id)) {
        // 移除dep和watcher的关联
        dep.removeSub(this)
      }
    }
    // 暂存dep的ids
    let tmp = this.depIds
    // 暂存新的depids
    this.depIds = this.newDepIds
    // 设置为新的ids为depids
    this.newDepIds = tmp
    // 将新的ids清空
    this.newDepIds.clear()
    // tmp存储deps
    tmp = this.deps
    // 将dep等于新的newDeps
    this.deps = this.newDeps
    // 清空新的deps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   * 依赖发现修改时触发
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) { // 如果为懒
      this.dirty = true // 设置为脏
    } else if (this.sync) { // 如果为同步
      this.run() // 调用run
    } else {
      queueWatcher(this) // 队列观察者
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   * 调用更新触发回调
   */
  run () {
    if (this.active) {
      // 获取新值
      const value = this.get()
      // 判断新旧value是否相同，或者是对象，或者deep深
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value // 获取oldvalue
        this.value = value // 设置成新的值
        if (this.user) { //
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          // 调用回调
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   * 懒惰的观察者调用
   */
  evaluate () {
    this.value = this.get() // 调用getter
    this.dirty = false // 懒为false
  }

  /**
   * Depend on all deps collected by this watcher.
   * 收集依赖
   */
  depend () {
    let i = this.deps.length
    // 遍历dep依赖
    while (i--) {
      // dep依赖进行依赖收集
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   * 移除自身的依赖关联进行解绑
   */
  teardown () {
    // 默认为true
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      // vm销毁了，我们就跳过删除自身
      if (!this.vm._isBeingDestroyed) {
        // 从实例中的watchers移除自己
        remove(this.vm._watchers, this)
      }
      // 获取dep的长度
      let i = this.deps.length
      // 遍历dep依赖
      while (i--) {
        // 删除依赖关联
        this.deps[i].removeSub(this)
      }
      // 设置为false
      this.active = false
    }
  }
}
