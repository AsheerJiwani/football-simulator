import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-green-900 text-white">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
            NFL Football Simulator
          </h1>
          <p className="text-2xl text-gray-300 mb-8 max-w-4xl mx-auto">
            Master defensive reads with our realistic football simulator.
            Practice attacking coverages with NFL-accurate mechanics, player speeds, and route concepts.
          </p>
          <Link
            href="/sim"
            className="inline-block bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-500 hover:to-green-500 text-white font-bold py-4 px-8 rounded-lg text-xl transition-all duration-300 transform hover:scale-105"
          >
            Start Practicing Now 🏈
          </Link>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-lg">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-3">NFL-Realistic Physics</h3>
            <p className="text-gray-300">
              Player speeds based on actual NFL combine data. Ball velocity at 25 yd/s (~55mph).
              Research-validated tackle radius and separation calculations.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-lg">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-3">Accurate Coverage</h3>
            <p className="text-gray-300">
              Cover 1 defensive mechanics with proper leverage, safety help, and man coverage techniques.
              Built from NFL coaching analysis.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-lg">
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-xl font-semibold mb-3">Strategic Learning</h3>
            <p className="text-gray-300">
              Practice reading defenses, timing routes, and making quick decisions.
              Perfect for QBs and young players learning the game.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-lg">
            <div className="text-4xl mb-4">⏱️</div>
            <h3 className="text-xl font-semibold mb-3">Real-Time Simulation</h3>
            <p className="text-gray-300">
              60Hz game loop with precise timing. Experience the pressure of quick reads
              with customizable sack time from 2-10 seconds.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-lg">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-3">Data-Driven Outcomes</h3>
            <p className="text-gray-300">
              Catch probability based on defender separation, openness percentages,
              and realistic interception chances.
            </p>
          </div>

          <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-lg">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-xl font-semibold mb-3">Challenge Mode</h3>
            <p className="text-gray-300">
              Test your skills with limited time (2.7s), restricted audibles,
              and no defensive previews. Can you read the coverage fast enough?
            </p>
          </div>
        </div>

        {/* Current Features */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-8">Available Now</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-blue-800 bg-opacity-30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-blue-300">Slant-Flat Concept</h3>
              <p className="text-gray-300">
                Master this fundamental quick-game concept. Practice reading outside leverage
                and finding the open receiver underneath.
              </p>
            </div>
            <div className="bg-red-800 bg-opacity-30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-3 text-red-300">Cover 1 Defense</h3>
              <p className="text-gray-300">
                Face the most common NFL coverage. Learn to identify single-high safety
                and attack man coverage underneath.
              </p>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-8">Built with Modern Tech</h2>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <span className="bg-gray-700 px-4 py-2 rounded-full">Next.js 15</span>
            <span className="bg-gray-700 px-4 py-2 rounded-full">TypeScript</span>
            <span className="bg-gray-700 px-4 py-2 rounded-full">Tailwind CSS</span>
            <span className="bg-gray-700 px-4 py-2 rounded-full">Zustand</span>
            <span className="bg-gray-700 px-4 py-2 rounded-full">60Hz Game Engine</span>
            <span className="bg-gray-700 px-4 py-2 rounded-full">SVG Canvas</span>
            <span className="bg-gray-700 px-4 py-2 rounded-full">NFL Research</span>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/sim"
            className="inline-block bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-bold py-6 px-12 rounded-lg text-2xl transition-all duration-300 transform hover:scale-105"
          >
            Launch Simulator
          </Link>
          <p className="mt-4 text-gray-400">
            Free to use • No signup required • Research-validated mechanics
          </p>
        </div>
      </div>
    </div>
  );
}