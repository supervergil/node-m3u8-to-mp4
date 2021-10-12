require("babel-polyfill");

const fs = require("fs");
const fse = require("fs-extra");
const path = require("path");
const https = require("https");
const axios = require("axios");

// 常用变量
const targetPath = path.resolve(".tmp");
const isRemoteReg =
  /(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/;
const hostReg = /^(http|ftp|https):\/\/((?!\/).)*/;
const m3u8Reg = /\.m3u8$/;
const timeout = 30000;

// 全局指示器函数
let onDownloading = () => {};
let onCombining = () => {};

// 解析远程m3u8函数
const parseRemote = async (url, headers) => {
  try {
    const urlPath = url.split("/").slice(0, -1).join("/");
    const host = url.match(hostReg)[0];
    const { status, data } = await axios.get(url, {
      headers,
      timeout,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false,
        agent: false,
      }),
    });
    if (status === 200) {
      let tmpList = [];
      const infoList = data
        .split("\n")
        .filter(
          (item) => item.replace(/\s*/g, "").length > 0 && !item.startsWith("#")
        );
      for (let item of infoList) {
        let tmpUrl = "";
        let isRemote = isRemoteReg.test(item);
        if (isRemote) {
          tmpUrl = item;
        } else {
          if (item.startsWith("/")) {
            tmpUrl = `${host}${item}`;
          } else {
            tmpUrl = `${urlPath}/${item}`;
          }
        }
        if (m3u8Reg.test(item)) {
          tmpList = tmpList.concat(await parseRemote(tmpUrl, headers));
        } else {
          tmpList.push({ url: tmpUrl, isFull: isRemote });
        }
      }
      return tmpList;
    } else {
      throw e;
    }
  } catch (e) {
    throw e;
  }
};

// 解析本地m3u8函数
const parseLocal = async (url, headers) => {
  try {
    const urlPath = url.split("/").slice(0, -1).join("/");
    let tmpList = [];
    const data = fs.readFileSync(url, "utf-8");
    const infoList = data
      .split("\n")
      .filter(
        (item) => item.replace(/\s*/g, "").length > 0 && !item.startsWith("#")
      );
    for (let item of infoList) {
      let isRemote = isRemoteReg.test(item);
      if (isRemote) {
        tmpList = tmpList.concat(await parseRemote(item, headers));
      } else {
        let tmpUrl = `${urlPath}/${item}`;
        if (m3u8Reg.test(item)) {
          tmpList = tmpList.concat(await parseLocal(tmpUrl, headers));
        } else {
          tmpList.push({ url: tmpUrl, isFull: isRemote });
        }
      }
    }
    return tmpList;
  } catch (e) {
    throw e;
  }
};

// 超时比较函数
const compare = (startTime, path, size, cb) => {
  let timer = setTimeout(() => {
    if (Date.now() - startTime > timeout) {
      if (fs.existsSync(path)) {
        const fileInfo = fs.statSync(path);
        if (size < fileInfo.size) {
          clearTimeout(timer);
          return compare(startTime, path, fileInfo.size, cb);
        }
      }
    } else {
      clearTimeout(timer);
      return compare(startTime, path, size, cb);
    }
    clearTimeout(timer);
    cb();
  }, 3000);
};

// 流转buffer函数
const streamToBuffer = (stream) =>
  new Promise(async (resolve, reject) => {
    try {
      const bufferArr = [];
      stream.on("data", (data) => {
        bufferArr.push(data);
      });
      stream.on("error", (e) => {
        reject(e);
      });
      stream.on("end", () => {
        resolve(Buffer.concat(bufferArr));
      });
    } catch (e) {
      reject(e);
    }
  });

// 下载媒体片段
const downloadTsItem = (item, name, targetPath, headers = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      const stream = fs.createWriteStream(`${targetPath}/${name}.ts`, {
        emitClose: true,
      });
      const { status, data } = await axios.get(item, {
        timeout,
        responseType: "stream",
        httpsAgent: new https.Agent({
          rejectUnauthorized: false,
          agent: false,
        }),
        headers,
      });
      if (status === 200) {
        let fileSize = 0;
        let closed = false;
        let over = false;
        const startTime = Date.now();

        stream.on("close", () => {
          if (!over) {
            closed = true;
            data.destroy();
            stream.destroy();
            resolve();
          }
        });

        data.pipe(stream);

        compare(startTime, `${targetPath}/${name}.ts`, fileSize, () => {
          if (!closed) {
            over = true;
            data.destroy();
            stream.destroy();
            downloadTsItem(item, name, targetPath, headers).then(() =>
              resolve()
            );
          }
        });
      } else {
        throw new Error("网络错误");
      }
    } catch (e) {
      downloadTsItem(item, name, targetPath, headers).then(() => resolve());
      reject(e);
    }
  });
};

// m3u8解析器
const mParser = async (source, headers = {}) => {
  try {
    let mediaList = [];
    // 判断资源是否为远程资源
    if (isRemoteReg.test(source)) {
      //  远程资源用axios
      mediaList = await parseRemote(source, headers);
    } else {
      //  本地资源用fse
      mediaList = await parseLocal(source, headers);
    }
    return mediaList;
  } catch (e) {
    throw e;
  }
};

// m3u8下载器
const mDownloader = (list, { targetPath = targetPath, headers = {} }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // 创建临时目录
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath);
      }

      // split list 10 per
      const splitDownloadList = list.reduce((current, next, index) => {
        if (index % 10 === 0) {
          current.push([next]);
          return current;
        } else {
          current[Math.floor(index / 10)].push(next);
          return current;
        }
      }, []);

      let index = 0;

      // 指示器hook
      onDownloading(index, splitDownloadList.length);

      for (let item of splitDownloadList) {
        ++index;
        await Promise.all(
          item.map((item, n) =>
            downloadTsItem(item, (index - 1) * 10 + n, targetPath, headers)
          )
        );
        // 指示器hook
        onDownloading(index, splitDownloadList.length);
      }
      resolve();
    } catch (e) {
      reject(e);
    }
    return true;
  });
};

// m3u8转换器
const mConverter = async (targetPath, outputPath, remove = true) => {
  return new Promise(async (resolve, reject) => {
    try {
      const tsList = fs.readdirSync(targetPath).sort((prev, next) => {
        return parseInt(prev) - parseInt(next);
      });

      let index = 0;

      for (let item of tsList) {
        ++index;
        // 指示器hook
        onCombining(index, tsList.length);
        const data = await streamToBuffer(
          fs.createReadStream(`${targetPath}/${item}`)
        );
        fs.appendFileSync(outputPath, data);
      }

      // 移除临时目录
      if (remove) {
        fse.removeSync(targetPath);
      }
      resolve();
    } catch (e) {
      if (remove) {
        fse.removeSync(targetPath);
      }
      reject(e);
    }
  });
};

const mIndicator = (state, cb) => {
  switch (state) {
    case "downloading":
      onDownloading = cb;
      break;
    case "converting":
      onCombining = cb;
      break;
  }
};

module.exports = {
  mParser,
  mDownloader,
  mConverter,
  mIndicator,
};
