import React, { useState } from 'react';
import Scene from './components/Scene';

const App: React.FC = () => {
  const [resolution] = useState(1.0); 
  const [cameraMode, setCameraMode] = useState<'FREE' | 'FOLLOW'>('FREE');
  const [resetKey, setResetKey] = useState(0);

  const toggleCameraMode = () => {
      if (cameraMode === 'FREE') {
          setCameraMode('FOLLOW');
      } else {
          // Switch back to FREE and Reset App State (Increment key to reset timeline)
          setCameraMode('FREE');
          setResetKey(prev => prev + 1);
      }
  };

  return (
    <div className="w-full h-screen relative bg-black font-['Space_Mono'] overflow-hidden">
      
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <Scene 
            pixelRatio={resolution} 
            viewMode={cameraMode}
            resetKey={resetKey}
        />
      </div>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-8 text-[#1a2f23]">
        
        {/* Header - Title and Description (Top Right) */}
        <header className="flex justify-end items-start pointer-events-auto mt-4 md:mt-8">
          <div className="text-right max-w-xl flex flex-col items-end">
            <h1 className="text-5xl md:text-7xl font-bold tracking-wide drop-shadow-lg text-white font-['Noto_Serif_SC'] mb-6 mr-2">
              陀山鹦鹉
            </h1>
            
            {/* Description without Background */}
            <div className="p-2">
                <p className="text-sm md:text-lg leading-relaxed font-medium text-white font-['Noto_Serif_SC'] tracking-wider text-justify drop-shadow-xl filter shadow-black">
                “昔有鹦鹉飞集陀山，乃山中大火，鹦鹉遥见，入水濡羽，飞而洒之。天神言：尔虽有志意，何足云哉？对曰：常侨居是山，不忍见耳！天神嘉感，即为灭火。”
                </p>
            </div>
          </div>
        </header>

        {/* Footer - Camera Controls (Bottom Center) */}
        {/* pb-20 added for mobile to clear browser toolbars */}
        <footer className="flex justify-center items-end pb-20 md:pb-2 pointer-events-auto">
            <button 
            onClick={toggleCameraMode}
            className={`
                px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 border backdrop-blur-md shadow-lg transform hover:scale-105 active:scale-95
                ${cameraMode === 'FREE' 
                    ? 'bg-white/5 border-white/30 text-white hover:bg-white/10' 
                    : 'bg-green-600/5 border-green-400/30 text-white hover:bg-green-500/10'}
            `}
            >
            {cameraMode === 'FREE' ? '🎥 自由视角' : '🦜 跟随视角'}
            </button>
        </footer>

      </div>

    </div>
  );
};

export default App;