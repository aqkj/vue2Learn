/* @flow */

import config from '../config'
import { noop } from 'shared/util'

export let warn = noop
export let tip = noop
export let generateComponentTrace = (noop: any) // work around flow check
export let formatComponentName = (noop: any)
// 非生产环境
if (process.env.NODE_ENV !== 'production') {
  // 判断是否存在console
  const hasConsole = typeof console !== 'undefined'
  // 替换转换成组件名称
  const classifyRE = /(?:^|[-_])(\w)/g
  const classify = str => str
    .replace(classifyRE, c => c.toUpperCase())
    .replace(/[-_]/g, '')
  /**
   * 警告方法
   * @param {string} msg 警告信息
   * @param {object} vm vue实例
   */
  warn = (msg, vm) => {
    // 获取组件栈
    const trace = vm ? generateComponentTrace(vm) : ''
    // 判断配置是否存在错误触发函数
    if (config.warnHandler) {
      // 调用配置的
      config.warnHandler.call(null, msg, vm, trace)
    } else if (hasConsole && (!config.silent)) {
      // 调用console的error
      console.error(`[Vue warn]: ${msg}${trace}`)
    }
  }
  /**
   * 提示方法
   * @param {string} msg 提示信息
   * @param {object} vm vue实例
   */
  tip = (msg, vm) => {
    // 存在console，并且判断silent为false则提示
    if (hasConsole && (!config.silent)) {
      console.warn(`[Vue tip]: ${msg}` + (
        vm ? generateComponentTrace(vm) : ''
      ))
    }
  }
  /**
   * 解析组件名称
   */
  formatComponentName = (vm, includeFile) => {
    // 判断实例是否为跟实例
    if (vm.$root === vm) {
      // 直接 返回root
      return '<Root>'
    }
    // 如果vm是构造函数，则获取构造函数配置,否则判断是否为vue，为vue实例则获取实例配置，否则则返回自身
    const options = typeof vm === 'function' && vm.cid != null
      ? vm.options
      : vm._isVue
        ? vm.$options || vm.constructor.options
        : vm
    // 获取组件名称，不存在则获取当前组件标签名称
    let name = options.name || options._componentTag
    // 获取当前文件路径
    const file = options.__file
    // 如果name不存在，并且file存在
    if (!name && file) {
      // 则匹配file文件的名称
      const match = file.match(/([^/\\]+)\.vue$/)
      // 获取文件名称
      name = match && match[1]
    }
    // 如果name存在，则返回组件名称 + 文件的路径
    return (
      (name ? `<${classify(name)}>` : `<Anonymous>`) +
      (file && includeFile !== false ? ` at ${file}` : '')
    )
  }
  // 重复方法
  const repeat = (str, n) => {
    let res = ''
    while (n) {
      if (n % 2 === 1) res += str
      if (n > 1) str += str
      n >>= 1
    }
    return res
  }
  // 生成组件栈信息
  generateComponentTrace = vm => {
    // 判断当前vm是否为vue实例，并且非根实例
    if (vm._isVue && vm.$parent) {
      // 存储树
      const tree = []
      // 递归序列index
      let currentRecursiveSequence = 0
      //  遍历判断vm
      while (vm) {
        // 如果树长度大于0
        if (tree.length > 0) {
          // 获取最后一个
          const last = tree[tree.length - 1]
          // 判断最后一个实例的构造函数和当前vm实例的构造函数是否相同
          if (last.constructor === vm.constructor) {
            // 相同则++
            currentRecursiveSequence++
            // 并且将vm设置为父级
            vm = vm.$parent
            continue
            // 如果大于0
          } else if (currentRecursiveSequence > 0) {
            // 设置最后一条为[last实例, 当前序列]
            tree[tree.length - 1] = [last, currentRecursiveSequence]
            // 设置为0
            currentRecursiveSequence = 0
          }
        }
        // 将当前实例插入到树内
        tree.push(vm)
        // 当前vm设置为父级实例
        vm = vm.$parent
      }
      // 返回组件树信息
      return '\n\nfound in\n\n' + tree
        .map((vm, i) => `${
          i === 0 ? '---> ' : repeat(' ', 5 + i * 2)
        }${
          Array.isArray(vm)
            ? `${formatComponentName(vm[0])}... (${vm[1]} recursive calls)`
            : formatComponentName(vm)
        }`)
        .join('\n')
    } else {
      return `\n\n(found in ${formatComponentName(vm)})`
    }
  }
}
