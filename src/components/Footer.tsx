/**
 * 页脚组件
 * 显示版权信息和项目说明
 * 使用毛玻璃效果和响应式布局
 */
export default function Footer() {
  return (
    // 页脚容器：半透明背景和毛玻璃效果
    <footer className="bg-black/50 backdrop-blur-sm border-t border-gray-800 py-6">
      {/* 内容容器：居中和水平内边距 */}
      <div className="container mx-auto px-4">
        {/* 弹性布局：在移动端垂直排列，在桌面端水平排列 */}
        <div className="flex flex-col md:flex-row justify-between items-center">
          {/* 版权信息 */}
          <div className="mb-4 md:mb-0">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Deepseek Clone. 这是一个使用阿里云 API 调用 Deepseek 的项目。
            </p>
          </div>
          
          {/* 预留的链接区域 */}
          <div className="flex space-x-4">
          </div>
        </div>
      </div>
    </footer>
  );
} 