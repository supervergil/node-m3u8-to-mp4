const { mParser, mDownloader, mConverter, mIndicator } = require("./index");
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
