import { Lock, Unlock, Zap } from 'lucide-react';

interface MysteryTickerProps {
    unlocked?: boolean;
    onUnlock?: () => void;
}

const MysteryTicker = ({ unlocked = false, onUnlock }: MysteryTickerProps) => {
    
    // MOCK DATA FOR THE MYSTERY BOX
    const SECRET_DEAL = {
        title: 'LIFETIME ACCESS: FLUTTERFLOW',
        price: '???',
        real_price: ' (Was )',
        source: 'SECRET SOURCE',
        url: 'https://buy.stripe.com/7sYfZgdJP9Kdd4i95v1Fe08' // Stripe Link
    };

    const triggerPaywall = () => {
        if (onUnlock) {
            onUnlock();
        } else {
            // Fallback if no handler
            window.open('https://buy.stripe.com/7sYfZgdJP9Kdd4i95v1Fe08', '_blank');
        }
    };

    return (
        <div className='relative overflow-hidden rounded-lg border border-yellow-500/30 bg-yellow-900/10 mb-4 p-4'>
            {/* Header */}
            <div className='flex justify-between items-center mb-2'>
                <div className='flex items-center gap-2 text-yellow-500'>
                    <Zap size={14} className='animate-pulse' />
                    <span className='text-xs font-bold tracking-widest'>CLASSIFIED SIGINT</span>
                </div>
                <span className='bg-yellow-500/20 text-yellow-500 text-[9px] px-2 py-0.5 rounded animate-pulse'>
                    HIGH VALUE TARGET
                </span>
            </div>

            {/* Content Container */}
            <div className='relative'>
                
                {/* BLURRED CONTENT LAYER */}
                <div className={'flex gap-4 items-center transition-all duration-700 ' + (unlocked ? 'blur-0' : 'blur-md opacity-50')}>
                     <div className='w-16 h-16 bg-yellow-700/50 rounded flex items-center justify-center font-black text-2xl text-black'>?</div>
                     <div>
                        <h3 className='font-bold text-yellow-400 text-lg'>{unlocked ? SECRET_DEAL.title : 'REDACTED ASSET #929'}</h3>
                        <p className='text-yellow-600/70 text-xs'>{unlocked ? SECRET_DEAL.real_price : '████████████'}</p>
                     </div>
                </div>

                {/* LOCK OVERLAY (If Locked) */}
                {!unlocked && (
                    <div className='absolute inset-0 z-10 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500'>
                        <button 
                            onClick={triggerPaywall}
                            className='bg-black/80 hover:bg-black text-yellow-500 border border-yellow-500/50 px-6 py-2 rounded flex items-center gap-3 backdrop-blur-md transition-all hover:scale-105 hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                        >
                            <Lock size={16} />
                            <span className='font-bold text-xs tracking-widest'>DECRYPT DATA ()</span>
                        </button>
                    </div>
                )}
                
                {/* UNLOCKED STATE (If Unlocked) */}
                {unlocked && (
                    <div className='mt-2 flex justify-end'>
                         <a 
                             href={SECRET_DEAL.url} 
                             target='_blank' 
                             className='flex items-center gap-2 text-xs font-bold text-black bg-yellow-500 px-3 py-1 rounded hover:bg-yellow-400'
                         >
                            <Unlock size={12} /> ACCESS ASSET
                         </a>
                    </div>
                )}

            </div>
            
            {/* Scanline decoration */}
            <div className='absolute inset-0 pointer-events-none bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] opacity-20'></div>
        </div>
    );
};

export default MysteryTicker;

