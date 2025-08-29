const { BasePlugin } = require('appium/plugin');
const http = require('http');
const https = require('https');
const { URL } = require('url');

function safeGet(obj, ...keys) {
  for (let k = 0; k < keys.length; k++) {
    if (!obj) return undefined;
    obj = obj[keys[k]];
  }
  return obj;
}

class LegacyWindowSizePlugin extends BasePlugin {

  async handle(next, driver, cmdName, ...args) {
    if (cmdName !== 'getWindowRect') {
      return await next();
    }

    this.log.info('[LegacyWindowSizePlugin] intercept getWindowRect');

    try {
      const caps = driver.capabilities || driver.opts || {};
      let wdaBase = caps.webDriverAgentUrl
                    || caps['appium:webDriverAgentUrl']
                    || (driver.opts && driver.opts.webDriverAgentUrl)
                    || (driver.opts && driver.opts.wdaLocalPort ? 'http://localhost:' + driver.opts.wdaLocalPort : null);

      if (!wdaBase) {
        throw new Error('Cannot determine WDA base URL');
      }

      this.log.info('[LegacyWindowSizePlugin] WDA base URL: ' + wdaBase);

      const u = new URL(wdaBase);
      const httpClient = u.protocol === 'https:' ? https : http;

      // 创建临时 WDA session
      const wdaSessionId = await new Promise((resolve, reject) => {
        const bodyData = JSON.stringify({
          desiredCapabilities: driver.capabilities || {},
          capabilities: driver.capabilities || {},
        });

        this.log.info('[LegacyWindowSizePlugin] creating temporary WDA session with capabilities: ' + JSON.stringify(driver.capabilities || {}));

        const opts = {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: '/session',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(bodyData),
          },
        };

        const req = httpClient.request(opts, res => {
          let raw = '';
          this.log.info(`[LegacyWindowSizePlugin] /session POST status: ${res.statusCode}, headers: ${JSON.stringify(res.headers)}`);
          res.on('data', d => raw += d);
          res.on('end', () => {
            this.log.info('[LegacyWindowSizePlugin] /session POST response body: ' + raw);
            try {
              const json = JSON.parse(raw);
              const sid = json.sessionId || safeGet(json, 'value', 'sessionId');
              this.log.info('[LegacyWindowSizePlugin] WDA session created: ' + sid);
              resolve(sid);
            } catch (err) {
              reject(err);
            }
          });
        });

        req.on('error', reject);
        req.write(bodyData);
        req.end();
      });

      if (!wdaSessionId) {
        throw new Error('Failed to create WDA session');
      }

      // 获取 /window/size
      const size = await new Promise((resolve, reject) => {
        const opts = {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: `/session/${wdaSessionId}/window/size`,
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        };

        this.log.info('[LegacyWindowSizePlugin] requesting /window/size from WDA at ' + wdaBase);

        const req = httpClient.request(opts, res => {
          let raw = '';
          this.log.info(`[LegacyWindowSizePlugin] /window/size GET status: ${res.statusCode}, headers: ${JSON.stringify(res.headers)}`);
          res.on('data', d => raw += d);
          res.on('end', () => {
            this.log.info('[LegacyWindowSizePlugin] /window/size response body: ' + raw);
            try {
              const json = JSON.parse(raw);
              const width = safeGet(json, 'value', 'width');
              const height = safeGet(json, 'value', 'height');
              resolve({ width, height });
            } catch (err) {
              reject(err);
            }
          });
        });

        req.on('error', reject);
        req.end();
      });

      if (!size.width || !size.height) {
        throw new Error('WDA /window/size response did not contain width/height');
      }

      this.log.info(`[LegacyWindowSizePlugin] got size via direct WDA: ${size.width}x${size.height}`);

      // 删除临时 WDA session
      await new Promise((resolve, reject) => {
        const opts = {
          hostname: u.hostname,
          port: u.port || (u.protocol === 'https:' ? 443 : 80),
          path: `/session/${wdaSessionId}`,
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        };

        const req = httpClient.request(opts, res => {
          let raw = '';
          res.on('data', d => raw += d);
          res.on('end', () => {
            this.log.info('[LegacyWindowSizePlugin] DELETE /session response body: ' + raw);
            this.log.info('[LegacyWindowSizePlugin] temporary WDA session deleted: ' + wdaSessionId);
            resolve();
          });
        });

        req.on('error', reject);
        req.end();
      });

      return { x: 0, y: 0, width: size.width, height: size.height };

    } catch (e) {
      this.log.error('[LegacyWindowSizePlugin] failed to get window size: ' + e.message);
      throw e; // 不 fallback，直接抛异常
    }
  }
}

module.exports = LegacyWindowSizePlugin;
