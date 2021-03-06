/* @flow */

import config from '../config'
import { warn } from './debug'
import { set } from '../observer/index'
import { unicodeRegExp } from './lang'
import { nativeWatch, hasSymbol } from './env'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 * 获取覆盖策略
 */
const strats = config.optionMergeStrategies

/**
 * Options with restrictions
 * 判断是否为非生产环境
 */
if (process.env.NODE_ENV !== 'production') {
  /**
   * 设置el和propsData合并策略
   * @param {any} parent 父
   * @param {any} child 子
   * @param {any} vm 实例
   * @param {string} key 属性
   * @returns {any} 合并后的数据
   */
  strats.el = strats.propsData = function (parent, child, vm, key) {
    // 如果vm不存在则警告
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    // 返回默认合并策略
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 * 递归将两个数据合并
 * @param {object} to 被合并
 * @param {object} from 合并对象
 * @returns {any} 合并后的数据
 */
function mergeData (to: Object, from: ?Object): Object {
  // 判断from不存在则直接返回to
  if (!from) return to
  let key, toVal, fromVal
  // 获取from的属性数组
  const keys = hasSymbol
    ? Reflect.ownKeys(from)
    : Object.keys(from)
  // 遍历from的属性数组
  for (let i = 0; i < keys.length; i++) {
    // 获取form的属性
    key = keys[i]
    // in case the object is already observed...
    // 如果key是observe对象则跳过
    if (key === '__ob__') continue
    // 获取对应to属性的值
    toVal = to[key]
    // 获取对应from属性的值
    fromVal = from[key]
    // 判断是否非自身的属性
    if (!hasOwn(to, key)) {
      // to不存在则为to设置值
      set(to, key, fromVal)
    } else if (
      // 如果toval存在则不相同则判断他们是否都是对象
      toVal !== fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) {
      // 则递归调用合并两个对象
      mergeData(toVal, fromVal)
    }
  }
  // 返回to
  return to
}

/**
 * Data
 * 合并数据或者方法
 * @param {any} parentVal 父值
 * @param {any} childVal 子值
 * @param {any} vm 组件实例
 * @returns {function} 返回合并方法
 */
export function mergeDataOrFn (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  // 如果vm不存在
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    // 子属性如果不存在
    if (!childVal) {
      // 返回父值
      return parentVal
    }
    // 如果父值不存在
    if (!parentVal) {
      // 返回子值
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    /**
     * 返回合并数据方法
     */
    return function mergedDataFn () {
      // 返回合并后的数据
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    // 如果vm存在，返回合并实例数据的方法
    return function mergedInstanceDataFn () {
      // instance merge
      // 子实例数据
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal
      // 父实例数据
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal
      // 判断子实例数据
      if (instanceData) {
        // 存在则返回合并后的数据
        return mergeData(instanceData, defaultData)
      } else {
        // 不存在则返回父实例数据
        return defaultData
      }
    }
  }
}
/**
 * 数据合并策略
 * @param {any} parentVal 父值
 * @param {any} childVal 子值
 * @param {any} vm vm对象
 * @returns {any} 返回合并策略方法
 */
strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  // 如果vm对象不存在
  if (!vm) {
    // 判断子数据是否存在，如果不是function则提示警告
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )
      // 返回父数据
      return parentVal
    }
    // 返回合并数据方法
    return mergeDataOrFn(parentVal, childVal)
  }
 // 返回合并数据方法带vm
  return mergeDataOrFn(parentVal, childVal, vm)
}

/**
 * Hooks and props are merged as arrays.
 * 钩子合并策略
 * @param {Array<function>} parentVal 父钩子数据，为方法数组
 * @param {Array<function>} childVal 子钩子数据为方法数组或者放啊
 * @returns {function} 返回合并后的钩子数组
 */
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  /**
   * 判断子数据是否存在
   * 存在则判断父数据是否存在
   * 存在则将子钩子合并
   * 如果父数据不存在
   * 则判断子数据是否为数组
   * 为数组则返回子数据
   * 否则将子钩子套上Array再返回
   */
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
  // 返回合并后的钩子数组,并且去除重复方法的钩子
  return res
    ? dedupeHooks(res)
    : res
}
/**
 * 去除重复方法
 * @param {array} hooks 钩子数组
 */
function dedupeHooks (hooks) {
  const res = []
  // 遍历钩子数组
  for (let i = 0; i < hooks.length; i++) {
    // 判断indexOf
    if (res.indexOf(hooks[i]) === -1) {
      // 插入钩子
      res.push(hooks[i])
    }
  }
  // 返回去重钩子数组
  return res
}
/**
 * 遍历所有钩子
 * 设置钩子合并策略为mergeHook
 */
LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 * 合并资源
 * @param {object} parentVal 父数据
 * @param {object} childVal 子数据
 * @param {object} vm 组件实例
 * @param {string} key 属性
 */
function mergeAssets (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  // 如果父数据存在则基于父为原型创建对象
  const res = Object.create(parentVal || null)
  // 判断子数据是否存在
  if (childVal) {
    // 判断是否为非生产,进行类型断言判断
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    // 调用继承方法
    return extend(res, childVal)
  } else {
    // 返回res
    return res
  }
}
/**
 * 将资源设置为合并资源策略
 */
ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 * watch合并策略
 */
strats.watch = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // work around Firefox's Object.prototype.watch...
  // 判断父是否为原生watch
  if (parentVal === nativeWatch) parentVal = undefined
  // 判断child是否为原生watch
  if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  // childval不存在则返回创建一个基于父原型的对象
  if (!childVal) return Object.create(parentVal || null)
  // 当前是否生产
  if (process.env.NODE_ENV !== 'production') {
    // 对象类型断言
    assertObjectType(key, childVal, vm)
  }
  // 如果父不存在则返回子
  if (!parentVal) return childVal
  const ret = {}
  // 继承
  extend(ret, parentVal)
  // 遍历
  for (const key in childVal) {
    // 获取父
    let parent = ret[key]
    // 获取子属性
    const child = childVal[key]
    // 如果父为非数数组
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    // 设置对应watch属性
    // 判断父是否存在
    // 存在则合并到父
    // 不存在则判断child是否为数组，为数组则返回，不为数组则包成数组
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  // 返回结果s
  return ret
}

/**
 * Other object hashes.
 * 其他属性类型合并策略
 */
strats.props =
strats.methods =
strats.inject =
strats.computed = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // 判断是否存在child
  if (childVal && process.env.NODE_ENV !== 'production') {
    // 类型断言
    assertObjectType(key, childVal, vm)
  }
  // 父不存在则返回子
  if (!parentVal) return childVal
  // 结果暂存
  const ret = Object.create(null)
  // 将父合并到ret
  extend(ret, parentVal)
  // 判断子是否存在，将子合并到ret
  if (childVal) extend(ret, childVal)
  // 返回ret
  return ret
}
// provide合并策略为datafunction
strats.provide = mergeDataOrFn

/**
 * Default strategy.
 * 默认合并策略
 * 子存在则返回子
 * 不存在则返回父
 */
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Validate component names
 * 检查组件数组名称
 */
function checkComponents (options: Object) {
  for (const key in options.components) {
    validateComponentName(key)
  }
}
/**
 * 检查组件名称
 * @param {string}} name 名称
 */
export function validateComponentName (name: string) {
  if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'should conform to valid custom element name in html5 specification.'
    )
  }
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
function normalizeProps (options: Object, vm: ?Component) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  options.props = res
}

/**
 * Normalize all injections into Object-based format
 */
function normalizeInject (options: Object, vm: ?Component) {
  const inject = options.inject
  if (!inject) return
  const normalized = options.inject = {}
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

/**
 * Normalize raw function directives into object format.
 */
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}
/**
 * 对象类型断言
 * @param {string} name 名称
 * @param {any} value 值
 * @param {any} vm vm实例
 */
function assertObjectType (name: string, value: any, vm: ?Component) {
  // 判断是否非普通对象
  if (!isPlainObject(value)) {
    // 警告
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 * 合并两个配置到一个新的配置
 */
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  // 判断是否非生产
  if (process.env.NODE_ENV !== 'production') {
    // 检查组件所有属性名称
    checkComponents(child)
  }
  // 判断child为方法的话则代表其为构造器
  if (typeof child === 'function') {
    // 获取child的options
    child = child.options
  }
  // 规范化属性
  normalizeProps(child, vm)
  // 规范化inject
  normalizeInject(child, vm)
  // 规范化指令
  normalizeDirectives(child)

  // Apply extends and mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.
  // 判断child._base是否不存
  if (!child._base) {
    // 判断是否有extends
    if (child.extends) {
      // 合并到父级
      parent = mergeOptions(parent, child.extends, vm)
    }
    // 判断子mixins
    if (child.mixins) {
      // 遍历mixins
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        // 合并配置到parent
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }
  // 暂存配置
  const options = {}
  let key
  // 遍历父配置
  for (key in parent) {
    // 合并到options
    mergeField(key)
  }
  // 遍历子配置
  for (key in child) {
    // 判断父是否没有对应属性
    if (!hasOwn(parent, key)) {
      // 合并到options
      mergeField(key)
    }
  }
  /**
   * 合并字段
   * @param {string} key 字段名称
   */
  function mergeField (key) {
    // 获取对应合并策略
    const strat = strats[key] || defaultStrat
    // 调用对应合并策略方法，设置对应options属性
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
/**
 * 解析资源
 * @param {object} options 配置
 * @param {string} type 类型
 * @param {string} id id
 * @param {boolean} warnMissing
 */
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  // 获取对应资源
  const assets = options[type]
  // check local registration variations first
  // 判断资源是否存在，存在则返回
  if (hasOwn(assets, id)) return assets[id]
  // 将以-分割格式的id进行驼峰格式话
  const camelizedId = camelize(id)
  // 判断是否存在资源内，存在则返回
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  // 将驼峰语法转换成pascal语法格式
  const PascalCaseId = capitalize(camelizedId)
  // 判断是否存在，存在则返回
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  // 获取结果
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  // 非生产环境下，如果结果不存在，则报错
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  // 返回结果
  return res
}
