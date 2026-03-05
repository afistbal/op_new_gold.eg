const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const { minify: minifyHtml } = require('html-minifier-terser');
const terser = require('terser');
const csso = require('csso');

// 源码统一使用 op_new 这一套，打包时按环境输出到不同目标目录
const ROOT = path.resolve(__dirname, '..'); // D:\JJ-game
const SRC_ROOT = path.join(__dirname, 'op_new'); // D:\JJ-game\op_new.build\op_new
const DEST_ROOT = path.join(ROOT, 'lot.in.www'); // D:\JJ-game\lot.in.www

// 运行模式：dev / prod / all（默认 dev）
const MODE = process.argv[2] || 'dev';

async function copyAndMinifyFolder(targetFolder, envType) {
  const srcDir = SRC_ROOT;
  const destDir = path.join(DEST_ROOT, targetFolder);

  console.log(`处理目录: ${targetFolder}，环境: ${envType}`);
  console.log(`源: ${srcDir}`);
  console.log(`目标: ${destDir}`);

  // 覆盖复制静态文件，避免删除目录导致 EBUSY
  await fs.ensureDir(destDir);
  await fs.copy(srcDir, destDir, { overwrite: true });
  console.log(`已复制到 ${targetFolder}`);

  // 根据环境覆盖 env.js
  const envFileName = envType === 'prod' ? 'env.prod.js' : 'env.dev.js';
  const srcEnvFile = path.join(SRC_ROOT, 'js', envFileName);
  const destEnvFile = path.join(destDir, 'js', 'env.js');
  try {
    await fs.copy(srcEnvFile, destEnvFile, { overwrite: true });
    console.log(`已应用环境配置: ${envFileName} -> ${destEnvFile}`);
  } catch (e) {
    console.warn(`应用环境配置失败(跳过): ${envFileName} - ${e.message}`);
  }

  // 压缩 html/js/css（图片等不处理）
  const exts = ['html', 'js', 'css'];
  const files = exts
    .map((ext) =>
      glob.sync(`**/*.${ext}`, {
        cwd: destDir,
        nodir: true,
      }).map((relative) => path.join(destDir, relative))
    )
    .flat();

  console.log(`共找到需要压缩文件 ${files.length} 个`);

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    let content = await fs.readFile(file, 'utf8');
    let result = content;

    try {
      if (ext === '.html') {
        result = await minifyHtml(content, {
          collapseWhitespace: true,
          removeComments: true,
          minifyCSS: true,
          minifyJS: true,
          removeRedundantAttributes: true,
          removeEmptyAttributes: true,
        });
      } else if (ext === '.js') {
        // 已是 .min.js 的第三方库不再二次压缩，避免损坏
        const basename = path.basename(file, ext);
        if (basename.endsWith('.min')) {
          result = content;
          console.log(`跳过压缩(已是 min): ${file}`);
        } else {
          const isProd = envType === 'prod';
          const min = await terser.minify(content, {
            // 生产环境构建时移除所有 console 调用（包括调试日志）
            compress: isProd ? { drop_console: true } : true,
            mangle: true,
          });
          if (min.code) result = min.code;
        }
      } else if (ext === '.css') {
        const min = csso.minify(content);
        result = min.css;
      }

      await fs.writeFile(file, result, 'utf8');
      console.log(`压缩完成: ${file}`);
    } catch (e) {
      console.warn(`压缩失败(跳过): ${file} - ${e.message}`);
    }
  }

  console.log(`目录 ${targetFolder} 完成`);
}

(async () => {
  try {
    if (MODE === 'dev') {
      await copyAndMinifyFolder('op_new.dev', 'dev');
    } else if (MODE === 'prod') {
      // prod 环境打包到 D:\JJ-game\lot.in.www\op_new\gold
      await copyAndMinifyFolder(path.join('op_new', 'gold'), 'prod');
    } else {
      // all 或未识别：两个都打
      await copyAndMinifyFolder('op_new.dev', 'dev');
      await copyAndMinifyFolder(path.join('op_new', 'gold'), 'prod');
    }
    console.log('全部完成');
  } catch (err) {
    console.error('构建失败:', err);
    process.exit(1);
  }
})();

