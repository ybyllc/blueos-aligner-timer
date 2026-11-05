# 猫咪陪你 · BlueOS 表盘

表盘工程，面向 vivo WATCH GT（WA2456C / BlueOS 3.0），设计宽度 466。按用户参考图采用黑底、大号时间、红色日期、活动三色环、墨镜薄荷猫、“状态优秀”和渐变装饰条。底部保留左侧紫色电量环与中间绿色血氧环，右下角第三个圆替换为牙套状态。

<img src="src/watch300102/assets/preview.png" alt="猫咪陪你表盘设计预览，非真机截图" width="280" />

<img src="src/watch300102/assets/preview-removed.png" alt="摘下牙套时显示红色圆环与摘下时长的设计预览" width="280" />

应用跳转地址：`hap://app/com.personal.alignertimer/pages/Demo`。右下角圆环内显示居中的牙齿图标、状态和时间；绿色显示当天累计佩戴时长，红色显示本次摘下时长，圆环始终表示当天佩戴进度。点击右下角圆环打开应用。

电量读取设备电池信息，心率与血氧读取最近采样，三色活动环读取当天热量、运动分钟和站立小时，参考目标分别为 500 千卡、30 分钟和 12 小时。健康数据需要 `READ_HEALTH_DATA` 权限，未授权或读取失败时显示 `--` 和空环。“状态优秀”与渐变条为参考图中的装饰元素，不构成健康评估。设计预览使用参考图中的示例日期与健康数值，实际表盘显示设备数据。

应用通过 BlueOS `exchange` 的 `vendor` 空间发布最小状态，表盘读取后按时间戳计算实时显示，历史记录保留在应用本地。两个包需要使用同一签名；本机调试包均使用相同的 SDK 调试证书。共享键为 `com.personal.alignertimer.status.v1`。系统重启会清除共享数据，表盘此时显示“点此同步”，打开一次牙套应用即可恢复。

## 构建和安装

保留整个仓库目录结构，在 BlueOS Studio 中打开本目录，使用方形手表目标编译。共享状态计算复用仓库的 `src/watchface-state.js`。也可以在本目录终端执行：

```powershell
node "D:\BlueOSStudio\resources\app\extensions\blueos-debugger\node_modules\blueos-pack\bin\index.js" build --device-type watch-square
```

已使用 blueos-pack 1.0.12-beta.13 编译，表盘版本 1.0.2，调试包为 `dist/watch-square/debug/com.personal.alignercatwatchface.debug.1.0.2.rpk`。

先更新牙套计时器到 1.0.3 或更新版本，打开一次应用，再通过 Studio 安装本表盘调试包，长按手表当前表盘，在表盘选择列表中查找“猫咪陪你”。真机是否接受第三方表盘安装、状态共享与应用深链接是否成功，需要在手表上验证。

`300102` 是本工程本地开发使用的表盘 ID。若发布到表盘商店，应使用官方分配的表盘 ID，同步更新 manifest、表盘目录和资源路径。

墨镜猫、渐变条和电池图标按参考图用矢量重绘，源文件位于 `art/`；打包使用 PNG 图片，以兼容手表图片渲染。活动环和底部圆环使用原生 progress 组件，时间和数值由原生文字组件绘制。表盘仅在前台按秒更新时间，每 15 秒读取一次牙套共享状态，每 30 秒更新电量与健康数据，退出和隐藏时清理计时任务，并忽略延迟返回的旧请求。
