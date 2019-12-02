const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const rollup = require('rollup')
const terser = require('terser')
/**
 * 判断是否存在dist文件不存在就创建
 */
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist')
}
/**
 * 生成并获取所有打包配置
 */
let builds = require('./config').getAllBuilds()

// filter builds via command line arg
if (process.argv[2]) {
  const filters = process.argv[2].split(',')
  builds = builds.filter(b => {
    return filters.some(f => b.output.file.indexOf(f) > -1 || b._name.indexOf(f) > -1)
  })
} else {
  // filter out weex builds by default
  builds = builds.filter(b => {
    return b.output.file.indexOf('weex') === -1
  })
}

build(builds)
/**
 * 打包所有
 * @param {object[]} builds 配置数组
 */
function build (builds) {
  let built = 0
  const total = builds.length
  const next = () => {
    // 打包所有
    buildEntry(builds[built]).then(() => {
      built++
      if (built < total) {
        next()
      }
    }).catch(logError)
  }
  // 调用
  next()
}
/**
 * 打包
 * @param {object} config 打包配置
 */
function buildEntry (config) {
  // 获取导出配置
  const output = config.output
  // 获取导出文件和banner
  const { file, banner } = output
  // 生产环境正则判断
  const isProd = /(min|prod)\.js$/.test(file)
  // 打包
  return rollup.rollup(config)
    // build.generate返回生成后的结果
    .then(bundle => bundle.generate(output))
    // 获取结果
    .then(({ output: [{ code }] }) => {
      // 判断是否是生产
      if (isProd) {
        // 插入banner并且压缩，返回压缩后的代码
        const minified = (banner ? banner + '\n' : '') + terser.minify(code, {
          toplevel: true,
          output: {
            ascii_only: true
          },
          compress: {
            pure_funcs: ['makeMap']
          }
        }).code
        // 写入文件
        return write(file, minified, true)
      } else {
        // 非生产环境，不压缩
        return write(file, code)
      }
    })
}
/**
 * 写入文件
 * @param {string} dest 导出文件地址
 * @param {string} code 文件内容
 * @param {boolean} zip 是否gzip
 */
function write (dest, code, zip) {
  // 返回promise
  return new Promise((resolve, reject) => {
    // 打印
    function report (extra) {
      console.log(blue(path.relative(process.cwd(), dest)) + ' ' + getSize(code) + (extra || ''))
      resolve()
    }
    // 写入文件
    fs.writeFile(dest, code, err => {
      // 错误报错
      if (err) return reject(err)
      // 写入成功后
      // gzip判断
      if (zip) {
        // gzip压缩
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          // 打印
          report(' (gzipped: ' + getSize(zipped) + ')')
        })
      } else {
        // 打印
        report()
      }
    })
  })
}
// 获取文件大小,单位kb
function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}
// 打印错误
function logError (e) {
  console.log(e)
}
// 蓝色打印
function blue (str) {
  return '\x1b[1m\x1b[34m' + str + '\x1b[39m\x1b[22m'
}
