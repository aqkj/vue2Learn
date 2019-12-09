/* @flow */

import { toArray } from '../util/index'
/**
 * 初始化use方法
 * @param {Vue} Vue Vue构造
 */
export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 获取安装的插件
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 检查是否存在，存在则直接返回
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 获取该方法除了第一个以外的所有参数
    const args = toArray(arguments, 1)
    // 在参数第一位插入当前实例
    args.unshift(this)
    // 判断plugin是否有install方法
    if (typeof plugin.install === 'function') {
      // 调用install方法，传入参数
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') { // 判断plugin本身是否为方法
      plugin.apply(null, args) // 调用自身方法
    }
    // 将方法插入存储
    installedPlugins.push(plugin)
    // 返回自身
    return this
  }
}
