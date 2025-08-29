# appium-legacy-window-size

解决 **Appium Server 2.x 与 WDA 兼容性问题** 的插件。  

## 背景
- Appium 1.x 调用 `/window/size`  
- Appium 2.x 改为 `/window/rect`  
- WDA 仅在 **9.3.0+** 支持 `/window/rect`  
- 因此：  
  - Appium 1.x ✅ 正常  
  - Appium 2.x + WDA < 9.3.0 ❌ 报错  
  - 本插件提供 **兼容层**，避免降级/升级  

## 兼容性

| Appium | XCUITest | WDA | 是否需要插件 |
|--------|---------|-----|--------------|
| 1.x    | 5       | <9.3.0 | 否 |
| 2.x    | 5       | <9.3.0 | 否 |
| 2.x    | 9       | <9.3.0 | ✅ 需要 |
| 2.x    | 9       | ≥9.3.0 | 否 |

👉 **为什么 XCUITest 5 不需要？**  
- XCUITest 5 的底层调用仍走 `/window/size`（旧逻辑），与 Appium 1.x/2.x 均兼容。  
- XCUITest 9 开始切换到 `/window/rect`，低版本 WDA 不支持，因此才需要此插件。  

## 安装
```bash
appium plugin install --source=npm appium-legacy-window-size
```
## 使用
```bash
appium --use-plugins=legacy-window-size
```
