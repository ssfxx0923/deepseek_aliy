import Navbar from '@/components/Navbar';
import ChatInterface from '@/components/ChatInterface';

export default function Home() {
  return (
    <main className="flex flex-col min-h-screen bg-black">
      <Navbar />
      
      <div className="flex-grow flex flex-col px-4 py-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Deepseek AI</h1>
          <p className="text-sm md:text-base text-gray-400 max-w-2xl mx-auto">
            本站仅供7702会员使用
          </p>
        </div>
        
        <div className="flex-grow flex">
          <div className="w-full max-w-4xl mx-auto bg-gray-900/50 backdrop-blur-sm rounded-xl border border-gray-800 overflow-hidden flex flex-col">
            <ChatInterface />
          </div>
        </div>
      </div>
    </main>
  );
}
