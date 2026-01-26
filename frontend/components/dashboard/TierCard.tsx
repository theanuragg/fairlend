import { FC } from 'react';
import { Tier } from '@/hooks/useFairScore';
import Image from 'next/image';

interface TierCardProps {
    tier: Tier;
    isActive: boolean;
    userScore: number;
    globalRank: string;
    twitterHandle?: string;
}

export const TierCard: FC<TierCardProps> = ({
    tier,
    isActive,
    userScore,
    globalRank,
    twitterHandle
}) => {
    const getImage = () => {
        switch (tier) {
            case 'Gold':
                return '/tier-cards/gold.png';
            case 'Silver':
                return '/tier-cards/silver.png';
            case 'Bronze':
                return '/tier-cards/bronze.png';
            default:
                return '/tier-cards/bronze.png';
        }
    };

    return (
        <div className={`
            relative w-full aspect-video rounded-2xl overflow-hidden transition-all duration-300
            ${isActive
                ? 'scale-[1.02] shadow-2xl ring-1 ring-white/20'
                : 'opacity-60 hover:opacity-100 hover:scale-[1.01]'
            }
        `}>
            {/* Background Image */}
            <Image
                src={getImage()}
                alt={`${tier} Tier`}
                fill
                className="object-cover"
                priority
            />

            {/* Content Overlay */}
            <div className="absolute inset-0 p-4 top-28 flex flex-col justify-between">
                <div>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <div className="text-white/80 text-sm font-medium">Global rank</div>
                            <div className="text-white text-xl font-medium tracking-wide">
                                {globalRank}
                            </div>
                        </div>

                        {/* Score Box */}
                        <div className={`
                            w-32 h-12 flex items-center justify-center rounded-sm
                            ${tier === 'Gold' ? '' : ''}
                            ${tier === 'Silver' ? '' : ''}
                            ${tier === 'Bronze' ? '' : ''}
                        `}>
                            <span className={`text-3xl font-bold ${tier === 'Gold' ? 'text-black' : 'text-white/90'}`}>
                                {userScore}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">


                    {/* X (Twitter) Icon */}
                    {twitterHandle && (
                        <div className="absolute bottom-6 text-white left-6">
                            <a
                                href={`https://x.com/${twitterHandle}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 border border-white rounded-xl flex items-center justify-center bg-black/50 backdrop-blur-sm hover:bg-black/70 transition-colors"
                            >
                                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Current Tier Badge */}

        </div>
    );
};
