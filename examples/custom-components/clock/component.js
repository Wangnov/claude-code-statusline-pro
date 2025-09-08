/**
 * Clock Component for StatusLine Pro
 * 
 * 这是一个简单的时钟组件示例，展示如何创建自定义组件
 * This is a simple clock component example showing how to create custom components
 */

/**
 * 创建时钟组件的工厂函数 | Factory function to create clock component
 * @param {Object} config - 组件配置 | Component configuration
 * @returns {Object} 时钟组件实例 | Clock component instance
 */
export default function createClockComponent(config) {
  // 从配置中读取选项
  const format24h = config.format_24h !== false; // 默认24小时制
  const showSeconds = config.show_seconds === true; // 默认不显示秒
  const showDate = config.show_date === true; // 默认不显示日期
  const timezone = config.timezone || 'local'; // 时区设置

  return {
    name: 'clock',

    /**
     * 渲染时钟组件 | Render clock component
     * @param {Object} context - 渲染上下文 | Render context
     * @returns {Promise<Object>} 渲染结果 | Render result
     */
    async render(context) {
      try {
        const now = new Date();
        
        // 处理时区
        let displayTime = now;
        if (timezone !== 'local' && timezone !== 'system') {
          // 这里可以添加时区转换逻辑
          // 为简单起见，这个示例只支持本地时间
        }

        // 格式化时间
        let timeStr = '';
        
        if (format24h) {
          // 24小时制
          const hours = displayTime.getHours().toString().padStart(2, '0');
          const minutes = displayTime.getMinutes().toString().padStart(2, '0');
          timeStr = `${hours}:${minutes}`;
          
          if (showSeconds) {
            const seconds = displayTime.getSeconds().toString().padStart(2, '0');
            timeStr += `:${seconds}`;
          }
        } else {
          // 12小时制
          let hours = displayTime.getHours();
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12 || 12;
          const minutes = displayTime.getMinutes().toString().padStart(2, '0');
          timeStr = `${hours}:${minutes}`;
          
          if (showSeconds) {
            const seconds = displayTime.getSeconds().toString().padStart(2, '0');
            timeStr += `:${seconds}`;
          }
          
          timeStr += ` ${ampm}`;
        }

        // 添加日期（如果启用）
        if (showDate) {
          const month = (displayTime.getMonth() + 1).toString().padStart(2, '0');
          const day = displayTime.getDate().toString().padStart(2, '0');
          timeStr = `${month}/${day} ${timeStr}`;
        }

        return {
          success: true,
          content: timeStr
        };
      } catch (error) {
        return {
          success: false,
          error: `时钟组件错误 | Clock component error: ${error.message}`
        };
      }
    },

    /**
     * 清理资源（可选）| Cleanup resources (optional)
     */
    async cleanup() {
      // 这个简单的时钟组件不需要清理
      // This simple clock component doesn't need cleanup
    }
  };
}