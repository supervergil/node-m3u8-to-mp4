const converter = require("node-m3u8-to-mp4");

converter(
  `https://valipl.cp31.ott.cibntv.net/6976CF7866B3D7191F4073335/03000600005C11547D373362B3B7DB0F1B5537-C756-4535-B2FA-EEE6A258115B-1-114.m3u8?ccode=0502&duration=2747&expire=18000&psid=08b2612957f4a1bdebf61e52b0c371af&ups_client_netip=dde3ca27&ups_ts=1580544472&ups_userid=&utid=9c98Fju4siQCATFPBqymWxvd&vid=XMzk1Mzc1NDQ4MA&vkey=Aac9012361a5a024acb648ab0afe4f20e&sm=1&operate_type=1&dre=u37&si=73&iv=0&s=cbfbd194962411de83b1&bc=2`,
  "video.mp4",
  (status, index, total) => {
    switch (status) {
      case "generating":
        console.log("extracting...");
        break;
      case "downloading":
        console.log(
          "downloading process:" + ((index / total) * 100).toFixed(2) + "%"
        );
        break;
      case "combining":
        console.log(
          "combining mp4 process:" + ((index / total) * 100).toFixed(2) + "%"
        );
        break;
    }
  }
).then(() => {
  console.log("done!");
});