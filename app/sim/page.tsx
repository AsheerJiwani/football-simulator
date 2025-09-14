import EnhancedFieldCanvas from '@/sim/EnhancedFieldCanvas';
import TopPanel from '@/sim/TopPanel';
import Sidebar from '@/sim/Sidebar';
import ClientOnly from '@/components/ClientOnly';

export default function SimulatorPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Top Panel */}
      <TopPanel />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        <ClientOnly fallback={
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-400 text-xl">Loading simulator...</div>
          </div>
        }>
          {/* Main Grid Layout */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-0">
            {/* Field Canvas - Takes up majority of screen */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-black p-8 flex items-center justify-center">
              <EnhancedFieldCanvas
                width={600}
                height={900}
                className="max-w-full max-h-full"
              />
            </div>

            {/* Sidebar - Fixed width on desktop */}
            <Sidebar />
          </div>
        </ClientOnly>
      </div>

      {/* Mobile Bottom Navigation (only visible on mobile) */}
      <div className="lg:hidden bg-gray-900 border-t border-gray-700 p-4">
        <div className="grid grid-cols-3 gap-2">
          <button className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium">
            Snap
          </button>
          <button className="bg-green-600 text-white py-2 px-4 rounded-lg font-medium">
            Throw
          </button>
          <button className="bg-orange-600 text-white py-2 px-4 rounded-lg font-medium">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}