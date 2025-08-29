// index.js
const LegacyWindowSizePlugin = require('./LegacyWindowSizePlugin');

// Export the class as default/module export (some loaders expect this)
module.exports = LegacyWindowSizePlugin;

// Also attach named properties so Appium can find the class by name or fields
module.exports.LegacyWindowSizePlugin = LegacyWindowSizePlugin;
module.exports.pluginName = 'legacy-window-size';
module.exports.mainClass = LegacyWindowSizePlugin;
module.exports.pluginClass = LegacyWindowSizePlugin;
module.exports.default = LegacyWindowSizePlugin;
