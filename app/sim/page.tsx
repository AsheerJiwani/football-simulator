import FieldCanvas from '@/sim/FieldCanvas';
import ControlsPanel from '@/sim/ControlsPanel';
import ClientOnly from '@/components/ClientOnly';

export default function SimulatorPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-white">
            NFL Football Simulator
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Practice reading defenses and attacking coverages with realistic NFL mechanics.
            Choose your play concept, select the defensive coverage, and see how it plays out!
          </p>
        </div>

        <ClientOnly fallback={
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-xl font-semibold mb-4 text-center">Field View</h2>
                <div className="flex justify-center items-center h-[800px]">
                  <div className="text-gray-400">Loading simulator...</div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-1">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Controls</h2>
                <div className="text-gray-400">Loading controls...</div>
              </div>
            </div>
          </div>
        }>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Field Canvas - Takes up 2/3 on large screens */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-xl font-semibold mb-4 text-center">Field View</h2>
                <div className="flex justify-center">
                  <FieldCanvas
                    width={400}
                    height={800}
                    className="w-full max-w-md"
                  />
                </div>

                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-full border border-blue-800"></div>
                    <span>Offense</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-red-600 rounded-full border border-red-800"></div>
                    <span>Defense</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    <span>Ball (Thrown)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-yellow-400">⭐</span>
                    <span>Star Player</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Panel - Takes up 1/3 on large screens */}
            <div className="lg:col-span-1">
              <ControlsPanel />
            </div>
          </div>
        </ClientOnly>

        {/* Stats and Info Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-blue-300">Features</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• NFL-realistic player speeds</li>
              <li>• Accurate ball physics (25 yd/s)</li>
              <li>• Research-validated coverage mechanics</li>
              <li>• Real-time 60Hz simulation</li>
              <li>• Slant-Flat vs Cover 1 concepts</li>
            </ul>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-yellow-300">Game Mechanics</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• Separation-based openness calculation</li>
              <li>• Tackle radius: 1.5 yards</li>
              <li>• Motion boost: 12% speed increase</li>
              <li>• Star player: 10% bonus</li>
              <li>• Dynamic catch probability</li>
            </ul>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-green-300">How It Works</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• QB has 2-10 seconds to throw</li>
              <li>• Routes run on precise timing</li>
              <li>• Defense reacts with man/zone coverage</li>
              <li>• Outcomes based on separation</li>
              <li>• Challenge mode adds constraints</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}