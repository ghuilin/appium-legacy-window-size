const { BasePlugin } = require('appium/plugin');

class LegacyWindowSizePlugin extends BasePlugin {
  async handle(next, driver, cmdName, ...args) {
    // 只处理 getWindowRect，其他命令放行
    if (cmdName !== 'getWindowRect') {
      return await next();
    }

    // 只拦截 iOS 的 XCUITest
    const caps = driver?.opts ?? driver?.capabilities ?? {};
    const platform = (caps.platformName || '').toLowerCase();
    const automation = (caps.automationName || '').toLowerCase();

    if (platform !== 'ios' || automation !== 'xcuitest') {
      this.log.info(`[LegacyWindowSizePlugin] Skip plugin for ${platform}/${automation}`);
      return await next();
    }

    this.log.info('[LegacyWindowSizePlugin] Intercept getWindowRect → fallback to /window/size');

    try {
      // 通过 JWProxy 直接请求 WDA 的 /window/size
      const res = await driver.wda.jwproxy.command('/window/size', 'GET');
      if (res?.width && res?.height) {
        this.log.info(`[LegacyWindowSizePlugin] Got size: ${res.width}x${res.height}`);
        return { x: 0, y: 0, width: res.width, height: res.height };
      }
      throw new Error('WDA /window/size response invalid');
    } catch (err) {
      this.log.error('[LegacyWindowSizePlugin] Failed to get window size: ' + err.message);
      throw err;
    }
  }
}

module.exports = LegacyWindowSizePlugin;
