"use client";

import React, { useEffect, useState } from "react";

/**
 * BackgroundLayer component for FairScale.
 * This component provides a full-screen immersive background layer featuring:
 * - A looping video background (fs0142.mp4)
 * - A dark overlay for contrast
 * - Twinkling star particles
 * - Shooting star animations
 * - Breathing atmospheric glows/blobs
 */
const BackgroundLayer: React.FC = () => {
    const [stars, setStars] = useState<{ id: number; top: string; left: string; delay: string; size: string }[]>([]);

    useEffect(() => {
        // Generate static-ish particles once on mount to avoid hydration mismatch
        // In a real production app, you might want to stable-seed or use CSS-only generation
        const starCount = 50;
        const generatedStars = Array.from({ length: starCount }).map((_, i) => ({
            id: i,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            delay: `${Math.random() * 5}s`,
            size: `${Math.random() * 2 + 1}px`,
        }));
        setStars(generatedStars);
    }, []);

    return (
        <div className="fixed inset-0 bg-[#020617] w-screen h-screen z-[-1] overflow-hidden pointer-events-none">
            {/* Loop Video Background */}
            <video
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover grayscale-[0.2] opacity-80"
            >
                <source src="https://app.fairscale.xyz/videos/fs0142.mp4" type="video/mp4" />
            </video>

            {/* Dark Overlay for Depth and Content Legibility */}
            <div className="absolute inset-0 bg-black/60 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>

            {/* Atmospheric Breathing Glows */}
            {/* Top Left Blob */}
            <div
                className="absolute top-1/4 left-1/4 w-[32rem] h-[32rem] bg-indigo-500/10 rounded-full blur-[120px] animate-breathe mix-blend-screen"
                style={{ animationDuration: '10s' }}
            />
            {/* Bottom Right Blob */}
            <div
                className="absolute bottom-1/4 right-1/4 w-[28rem] h-[28rem] bg-purple-500/10 rounded-full blur-[100px] animate-breathe mix-blend-screen"
                style={{ animationDuration: '8s', animationDelay: '-2s' }}
            />
            {/* Center Blob */}
            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[20rem] h-[20rem] bg-white/5 rounded-full blur-[80px] animate-breathe mix-blend-screen"
                style={{ animationDuration: '12s', animationDelay: '-5s' }}
            />

            {/* Twinkling Stars System */}
            <div className="absolute inset-0 overflow-hidden">
                {stars.map((star) => (
                    <div
                        key={star.id}
                        className="absolute rounded-full bg-white opacity-0 animate-twinkle"
                        style={{
                            top: star.top,
                            left: star.left,
                            width: star.size,
                            height: star.size,
                            animationDelay: star.delay,
                            boxShadow: "0 0 4px rgba(255, 255, 255, 0.8)",
                        }}
                    />
                ))}
            </div>

            {/* Shooting Stars Animation */}
            <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div
                        key={`shooting-${i}`}
                        className="absolute w-[2px] h-[2px] bg-gradient-to-r from-transparent via-white to-white rounded-full opacity-0 animate-shooting-star"
                        style={{
                            top: `${Math.random() * 50}%`,
                            left: `${Math.random() * 90 + 5}%`,
                            animationDelay: `${i * 7 + Math.random() * 5}s`,
                            width: "100px", // Length of the streak tail
                            height: "1px",
                            transform: "rotate(-45deg)",
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default BackgroundLayer;
