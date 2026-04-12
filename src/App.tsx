/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import FishAnalyzer from './components/FishAnalyzer';

export default function App() {
  return (
    <div className="min-h-screen lg:h-screen bg-[#F8FAFC] selection:bg-blue-100 selection:text-blue-900 lg:overflow-hidden">
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[120px]" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] rounded-full bg-sky-100/40 blur-[100px]" />
        <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-50/50 blur-[140px]" />
      </div>

      <main className="relative z-10 min-h-full lg:h-full">
        <FishAnalyzer />
      </main>
    </div>
  );
}
