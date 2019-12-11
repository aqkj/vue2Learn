/* @flow */

import {
  tip,
  hasOwn,
  isDef,
  isUndef,
  hyphenate,
  formatComponentName
} from 'core/util/index'
/**
 * 从vnode数据中提取props
 * @param {object} data 数据对象
 * @param {function} Ctor 构造函数
 * @param {string} tag 标签
 */
export function extractPropsFromVNodeData (
  data: VNodeData,
  Ctor: Class<Component>,
  tag?: string
): ?Object {
  // we are only extracting raw values here.
  // validation and default values are handled in the child
  // component itself.
  // 获取构造函数的props
  const propOptions = Ctor.options.props
  if (isUndef(propOptions)) { // 如果props不存在则直接返回
    return
  }
  const res = {}
  const { attrs, props } = data
  // 获取属性判断不为空
  if (isDef(attrs) || isDef(props)) {
    // 遍历构造函数传递的props
    for (const key in propOptions) {
      // 格式化属性格式
      const altKey = hyphenate(key)
      if (process.env.NODE_ENV !== 'production') {
        // 如果非生产则转换为小写
        const keyInLowerCase = key.toLowerCase()
        // 如果转换后的key和之前的key对比不相同则报警告
        if (
          key !== keyInLowerCase &&
          attrs && hasOwn(attrs, keyInLowerCase)
        ) {
          tip(
            `Prop "${keyInLowerCase}" is passed to component ` +
            `${formatComponentName(tag || Ctor)}, but the declared prop name is` +
            ` "${key}". ` +
            `Note that HTML attributes are case-insensitive and camelCased ` +
            `props need to use their kebab-case equivalents when using in-DOM ` +
            `templates. You should probably use "${altKey}" instead of "${key}".`
          )
        }
      }
      // 检查属性
      checkProp(res, props, key, altKey, true) ||
      checkProp(res, attrs, key, altKey, false)
    }
  }
  return res
}
/**
 * 检查属性
 * @param {object} res result
 * @param {object} hash 属性对象
 * @param {string} key key属性
 * @param {string} altKey 格式化后的key
 * @param {boolean} preserve 是否保留
 */
function checkProp (
  res: Object,
  hash: ?Object,
  key: string,
  altKey: string,
  preserve: boolean
): boolean {
  // 判断属性对象是否存在
  if (isDef(hash)) {
    // 判断key是否是对象上的
    if (hasOwn(hash, key)) {
      // 属性设置结果
      res[key] = hash[key]
      // 不保留则删除对应key
      if (!preserve) {
        delete hash[key]
      }
      // 返回true
      return true
    } else if (hasOwn(hash, altKey)) { // 判断altKey是否存在
      res[key] = hash[altKey] // 设置结果
      if (!preserve) { // 不保留则删除
        delete hash[altKey]
      }
      return true // 返回true
    }
  }
  return false // 返回false
}
