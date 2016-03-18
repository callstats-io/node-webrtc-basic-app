# node-webrtc-basic-app

This is a WebRTC test application running on node.js and express.js


Get started:

1. Install node.js if not installed (https://nodejs.org/en/download/)
2. Clone and install
```bash
$ https://github.com/callstats-io/node-webrtc-basic-app.git
$ cd node-webrtc-basic-app/
$ npm install
  ```
3. If you want to use SSL, generate SSL certificates to node-webrtc-basic-app/ssl/ folder (ca.crt, server.crt, server.key)
4. Get appID and appsecret by registering at callstats.io (https://dashboard.callstats.io/register)
5. Insert appID and appsecret in node-webrtc-basic-app/app/config.js 
6. Run the app: 
  ```npm start```
or
  ```SSL=true npm start```

  Try the app locally by opening https://localhost:4430/ in multiple tabs. 
