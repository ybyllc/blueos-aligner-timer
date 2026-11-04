# 猫咪陪你 · BlueOS 表盘

独立表盘工程，面向 vivo WATCH GT（WA2456C / BlueOS 3.0），设计宽度 466。显示本地时间、日期与星期，点击猫咪或底部“牙套计时”打开已经安装的牙套计时器。

<img src="src/watch300102/assets/preview.png" alt="猫咪陪你表盘设计预览，非真机截图" width="280" />

应用跳转地址：`hap://app/com.personal.alignertimer/pages/Demo`。表盘不会读取另一个应用的私有计时数据，也不会在点击入口时切换佩戴状态。

## 构建和安装

在 BlueOS Studio 中打开本目录，使用方形手表目标编译。也可以在本目录终端执行：

```powershell
node "D:\BlueOSStudio\resources\app\extensions\blueos-debugger\node_modules\blueos-pack\bin\index.js" build --device-type watch-square
```

已使用 blueos-pack 1.0.12-beta.13 编译，调试包为 `dist/watch-square/debug/com.personal.alignercatwatchface.debug.1.0.0.rpk`。

先安装牙套计时器，再通过 Studio 安装本表盘调试包，长按手表当前表盘，在表盘选择列表中查找“猫咪陪你”。真机是否接受第三方表盘安装、应用深链接是否成功，需要在手表上验证。

`300102` 是本工程本地开发使用的表盘 ID。若发布到表盘商店，应使用官方分配的表盘 ID，同步更新 manifest、表盘目录和资源路径。

猫咪为本项目原创矢量图，源文件为 `art/cat.svg`。打包使用 PNG 图片，以兼容手表图片渲染。表盘仅在前台按分钟刷新，退出和隐藏时清理计时任务。
