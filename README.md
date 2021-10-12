# node-m3u8-to-mp4

可以将远程或本地的 m3u8 文件转换成 MP4 或 MP3 等媒体文件

## 最新版本

v3.0.0

## 安装

```
npm install node-m3u8-to-mp4 -S
```

## 用法说明

v3.x 将 node-m3u8-to-mp4 的功能解耦成 4 大部分

- m3u8 解析器 -> mParser
- 下载器 -> mDownloader
- 媒体片段合成器 -> mConverter
- 进度指示器 -> mIndicator

如下代码：

```
const { mParser, mDownloader, mConverter, mIndicator } = require("node-m3u8-to-mp4");
```

开发者可以根据项目具体情况灵活组合各个部分

下载 m3u8 媒体文件的一般过程为：解析视频资源列表(mParser)->下载资源片段(mDownloader)->片段合成文件(mConverter)

大致用法如下：

```
mParser("m3u8的本地或远程路径").then(list=>{
  const medias = list.map((item) => `${item.url}`);
  mDownloader(medias).then(()=>{
    mConverter("临时缓存路径", "媒体路径");
  });
})
```

详细用法如下（也可以参考 [example.js文件](./example.js)）：

```
const {
  mParser,
  mDownloader,
  mConverter,
  mIndicator,
} = require("node-m3u8-to-mp4");

const path = require("path");
const fse = require("fs-extra");

// 设定进度指示器（可不设置）
mIndicator("downloading", (index, total) => {
  console.log("下载进度:" + ((index / total) * 100).toFixed(2) + "%");
});

mIndicator("converting", (index, total) => {
  console.log("转换进度:" + ((index / total) * 100).toFixed(2) + "%");
});

// 过程：解析视频资源列表(mParser)->下载资源片段(mDownloader)->片段合成文件(mConverter)

// 解析资源列表，第二个参数为远程请求文件时的请求头，可留空
mParser(path.join(__dirname, "./index.m3u8"), {
  referer: "https://www.great-elec.com/",
}).then((list) => {
  // [{url:"",isFull:boolean},...] 资源列表，若url不是完整的互联网路径，可根据isFull字段做二次处理
  const medias = list.map((item) => `${item.url}`);

  console.log("解析完成，开始下载");

  // 下载媒体列表，配置项可留空，targetPath为存储片段的临时文件夹路径默认为'.tmp'，headers为远程请求头
  mDownloader(medias, {
    targetPath: path.resolve(".target"),
    headers: {
      referer: "https://www.great-elec.com/",
    },
  })
    .then(() => {
      console.log("下载完成，正在转换");

      // 下载完成后，根据临时文件夹路径，合成视频到指定位置的指定格式，最后一个参数表示是否要在程序运行完后清除临时目录，默认为true
      mConverter(path.resolve(".target"), "./video.mp4").then(() => {
        console.log("已生成文件");
      });
    })
    .catch((e) => {
      console.log("下载出错！");
      // 下载出错，可将指定下载的临时目录删除
      fse.removeSync(path.resolve(".target"));
    });
});
```

## 作者联系方式

## 微信: zaowangxiaoye

<img src="https://github.com/supervergil/my_contact/raw/main/assets/wechat.jpg" width="320px" />

技术交流，结交好友

ps：接各种前后端私活，欢迎联系