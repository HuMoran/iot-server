/**
 * File: index.js
 * Project: iot-server
 * Created Date: Saturday, July 13th 2019, 3:27:15 pm
 * Author: Tao Hu htax2013@gmail.com
 * -----
 * Last Modified: Sat Jul 13 2019
 * Modified By: Tao Hu
 * -----
 * Copyright (c) 2019 Kideasoft Tech Co.,Ltd.
 */
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const dayjs = require('dayjs');

const g_devices = {
  // 11401679791: {
  //   id: '11401679791',
  //   ip: 'xx.xx.xx.xx',
  //   port: '142423',
  //   type: 'xx',
  //   heartbeatCount: 0,
  // }
};

function heartbeat() {
  // console.log(`${new Date().toLocaleString()} 服务器定时心跳处理`);
  Object.entries(g_devices).forEach(([id, value]) => {
    if (value.heartbeatCount > 4) return;
    value.heartbeatCount += 1;
    server.send('00', 0, 2, value.port, value.ip);
  });
}

function getCheckCode(str) {
  let sum = 0;
  for (let i = 0; i < str.length; i += 2) {
    sum += parseInt(str.slice(i, i + 2), 16);
  }
  return sum.toString(16).slice(-2).padStart(2, '0');
}

function doMsg(msg, ip, port) {
  if (msg === '74696d653f') { // 查询时间
    const time = dayjs().format('YY/MM/DD HH:mm:ss');
    const week = dayjs().day() === 0 ? 7 : dayjs().day();
    const strHex = Buffer.from(`now:${time.replace(/ /g, '')} ${week}`).toString('hex');
    const code = getCheckCode(strHex);
    // console.log(`${new Date().toLocaleString()} 终端时间查询处理请求完成`);
    return `${strHex}${code}`;
  }
  const msgType = msg[0];

  switch (msgType) {
    case '0': { // 登录注册或者心跳
      if (msg[1] === '0') { // 心跳
        const id = msg.slice(2);
        // console.log(`${new Date().toLocaleString()} ${id} 心跳处理`);
        if (g_devices[id]) {
          g_devices[id].Online = true;
          g_devices[id].ip = ip;
          g_devices[id].port = port;
          g_devices[id].heartbeatCount = 0;
        }
        break;
      }
      // 登录
      const idLen = Number(msg[1]);
      const id = msg.slice(2, (idLen + 1) * 2);
      if (!g_devices[id]) {
        g_devices[id] = {
          id,
          ip,
          port,
          type: '',
          heartbeatCount: 0,
          Online: true,
        }
      }
      console.log(`${new Date().toLocaleString()} ${id} 登录处理完成`);
      return '00';
    }
    case '4': { // 上报的信息
      const idLen = msg[1];
      const id = msg.slice(2, (idLen + 1) * 2);
      const data = msg.slice((idLen + 1) * 2);
      const [id2, content] = data.split('ff');
    }
    default:
      break;
  }
}


server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

server.on('message', (msg, rinfo) => {
  console.log(`${new Date().toLocaleString()} server got: ${msg.toString('hex')} from ${rinfo.address}:${rinfo.port}`);
  const data = msg.toString('hex');

  if (data.length === 1
    || data.length === 2
    || data.length === 3
    || data.length === 4
    || data.length > 1024) {
    console.error(`${new Date().toLocaleString()} server got error msg: ${msg.toString('hex')} from ${rinfo.address}:${rinfo.port}`);
    return;
  }

  const returnMsg = doMsg(data, rinfo.address, rinfo.port);
  if (returnMsg) {
    console.log(`${new Date().toLocaleString()} server return: ${returnMsg} to ${rinfo.address}:${rinfo.port}`);
    server.send(returnMsg, 0, returnMsg.length, rinfo.port, rinfo.address);
  }
});

server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
  setInterval(heartbeat, 50000);
});

server.bind(60000);

// // 市电关
// 440000000f 5e02753565ad7535 ff 010020002800300034002f00300031002f00300031002c00310034003a00300036003a0031003300293f
// 40ee3537303135303030374071712e636f6d2c5e02753565ad7535ff01da

// // 市电开
// 440000000f5e0275354e0a7535ff010020002800300034002f00300031002f00300031002c00310034003a00340034003a0033003800298e
// 40ee3537303135303030374071712e636f6d2c5e0275354e0a7535ff0120

// // 市电关
// 440000000f5e02753565ad7535ff010020002800300034002f00300031002f00300031002c00310034003a00340035003a00340034002946
// 40ee3537303135303030374071712e636f6d2c5e02753565ad7535ff01da
