import React, { useRef, useEffect, useState, useCallback } from 'react';
import Plyr from 'plyr';
import 'plyr/dist/plyr.css';

interface VideoPlayerProps {
  videoId: string;
  title: string;
  duration?: string;
  coverImage?: string; // Add cover image prop like Jordan's Library
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
}

// Jordan's Library CSS - Exact Implementation
const jordanLibraryCSS = `
  /* Match Jordan's Library styling */
  .video-container {
    border-radius: 12px;
    overflow: hidden;
    position: relative;
  }
  
  .video-transition {
    transition: opacity 1s ease;
    opacity: 1;
  }
  
  .plyr--youtube .plyr__video-embed iframe {
    border-radius: 0; /* Let parent handle rounding */
  }
  
  .plyr__poster {
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 0;
  }
  
  .plyr--full-ui input[type=range] {
    color: #ef4444;
  }
  
  .plyr__control--overlaid {
    background: rgba(239, 68, 68, 0.9) !important;
    border-radius: 50% !important;
    backdrop-filter: blur(4px) !important;
    transition: all 0.3s ease !important;
    z-index: 9999 !important;
    transform: scale(1) !important;
    transform-origin: center !important;
  }
  
  .plyr__control--overlaid:hover {
    background: rgba(239, 68, 68, 1) !important;
    transform: scale(1.1) !important;
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4) !important;
  }
  
  .plyr__control--overlaid:focus {
    outline: none !important;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.3) !important;
    transform: scale(1.05) !important;
  }
  
  .plyr__control--overlaid:active {
    transform: scale(0.95) !important;
    transition: all 0.1s ease !important;
  }
  
  /* Dark mode styles */
  .dark .plyr {
    background: #111827 !important;
  }
  
  .dark .plyr__controls {
    background: linear-gradient(transparent, rgba(17, 24, 39, 0.8)) !important;
    color: #f3f4f6 !important;
  }
  
  .dark .plyr__control {
    color: #f3f4f6 !important;
  }
  
  .dark .plyr__control:hover {
    background: rgba(75, 85, 99, 0.5) !important;
  }
  
  /* JORDAN'S LIBRARY SECRET - Physical iframe cropping */
  .plyr--youtube .plyr__video-embed {
    overflow: hidden !important;
    position: relative !important;
    aspect-ratio: 16/9 !important;
  }
  
  /* The MAIN secret - Crop YouTube iframe to hide branding physically */
  .plyr--youtube .plyr__video-embed iframe,
  .plyr iframe[id^="youtube"],
  iframe[src*="youtube.com"] {
    position: absolute !important;
    top: -12.5% !important;          /* Move UP to crop top branding */
    left: 0 !important;
    width: 100% !important;
    height: 125% !important;         /* Make TALLER to crop both ends */
    border: none !important;
    overflow: hidden !important;
    transform: scale(1.0) !important;
    object-fit: cover !important;
  }
  
  /* More aggressive cropping for stubborn videos */
  .plyr[data-plyr-provider="youtube"] iframe {
    top: -15% !important;
    height: 130% !important;
  }
  
  /* Ensure container crops properly */
  .plyr--youtube .plyr__video-embed::before {
    content: '';
    display: block;
    padding-top: 56.25%; /* 16:9 aspect ratio */
  }
  
  /* SECONDARY DEFENSE - CSS hiding for any remaining elements */
  .ytp-watermark,
  .yt-uix-sessionlink,
  .ytp-chrome-top,
  .ytp-show-cards-title,
  .ytp-chrome-bottom,
  .ytp-chrome-top-buttons,
  .ytp-gradient-top,
  .ytp-gradient-bottom,
  .ytp-pause-overlay,
  .ytp-youtube-button,
  .ytp-embed,
  .ytp-title,
  .ytp-title-channel,
  .ytp-title-text,
  .ytp-share-button,
  .ytp-watch-later-button,
  .ytp-more-button,
  .ytp-pause-overlay-container,
  .ytp-contextmenu,
  .ytp-ce-element,
  .ytp-iv-player-content,
  .ytp-endscreen-content,
  .ytp-cards-teaser,
  .ytp-cards-button,
  .ytp-suggestion-set,
  .ytp-endscreen-element,
  .iv-click-target,
  .annotation,
  .ytp-large-play-button,
  .ytp-large-play-button-red-bg,
  .ytp-button,
  .ytp-menuitem,
  .ytp-chrome-controls {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    z-index: -9999 !important;
    position: absolute !important;
    left: -9999px !important;
    top: -9999px !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
  }

  /* Target ALL possible states */
  .html5-video-player *[class*="ytp-"],
  .ytp-pause-overlay *,
  iframe *[class*="ytp-"] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  /* Force hide YouTube branding text and links */
  a[href*="youtube.com"],
  a[href*="youtu.be"],
  [class*="ytp-title"],
  [class*="ytp-channel"],
  [class*="ytp-watermark"],
  [class*="ytp-chrome"],
  [class*="ytp-share"],
  [class*="ytp-watch"] {
    display: none !important;
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  /* Hide by attributes for dynamic content */
  [aria-label*="Share"],
  [aria-label*="Watch later"],
  [aria-label*="YouTube"],
  [title*="Share"],
  [title*="Watch later"],
  [title*="YouTube"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }

  /* Ensure no scrollbars on cropped content */
  .plyr--youtube .plyr__video-embed,
  .plyr--youtube .plyr__video-embed iframe {
    scrollbar-width: none !important;
    -ms-overflow-style: none !important;
  }
  
  .plyr--youtube .plyr__video-embed::-webkit-scrollbar,
  .plyr--youtube .plyr__video-embed iframe::-webkit-scrollbar {
    display: none !important;
  }
`;

export const VideoPlayer = ({ 
  videoId, 
  title, 
  duration = "00:00",
  coverImage,
  onProgress,
  onComplete 
}: VideoPlayerProps) => {
  const playerRef = useRef<HTMLDivElement>(null);
  const plyrInstanceRef = useRef<Plyr | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const progressUpdateRef = useRef<NodeJS.Timeout>();
  const hideIntervalRef = useRef<NodeJS.Timeout>();

  // YouTube thumbnail URL - fallback to YouTube thumbnail if no cover image
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  const backgroundImage = coverImage || thumbnailUrl;

  // Aggressive DOM element hiding function
  const aggressivelyHideElements = useCallback(() => {
    // Get all iframes
    const iframes = document.querySelectorAll('iframe[src*="youtube"]');
    
    iframes.forEach((iframe) => {
      try {
        // Try to access iframe content (may be blocked by CORS)
        const iframeDoc = (iframe as HTMLIFrameElement).contentDocument || 
                         (iframe as HTMLIFrameElement).contentWindow?.document;
        
        if (iframeDoc) {
          // Hide elements inside iframe
          const elementsToHide = [
            '.ytp-chrome-top',
            '.ytp-chrome-bottom', 
            '.ytp-watermark',
            '.ytp-show-cards-title',
            '.yt-uix-sessionlink',
            '.ytp-share-button',
            '.ytp-watch-later-button',
            '.ytp-title',
            '.ytp-youtube-button',
            '.ytp-pause-overlay',
            '[class*="ytp-"]'
          ];
          
          elementsToHide.forEach(selector => {
            const elements = iframeDoc.querySelectorAll(selector);
            elements.forEach(el => {
              (el as HTMLElement).style.setProperty('display', 'none', 'important');
              (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
              (el as HTMLElement).style.setProperty('opacity', '0', 'important');
              (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
              (el as HTMLElement).style.setProperty('position', 'absolute', 'important');
              (el as HTMLElement).style.setProperty('left', '-9999px', 'important');
              (el as HTMLElement).style.setProperty('top', '-9999px', 'important');
            });
          });
        }
      } catch (e) {
        // CORS blocked - inject CSS into parent document instead
        const elementsToHide = [
          '.ytp-chrome-top',
          '.ytp-chrome-bottom', 
          '.ytp-watermark',
          '.ytp-show-cards-title', 
          '.yt-uix-sessionlink',
          '.ytp-share-button',
          '.ytp-watch-later-button',
          '.ytp-title',
          '.ytp-youtube-button',
          '.ytp-pause-overlay'
        ];
        
        elementsToHide.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            (el as HTMLElement).style.setProperty('display', 'none', 'important');
            (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
            (el as HTMLElement).style.setProperty('opacity', '0', 'important');
            (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
          });
        });
      }
    });
  }, []);

  // Specific function to hide YouTube branding elements on pause
  const hideYouTubeBrandingOnPause = useCallback(() => {
    const specificElements = [
      '.ytp-watermark',
      '.yt-uix-sessionlink',
      '.ytp-chrome-top',
      '.ytp-show-cards-title'
    ];

    // Hide elements in main document
    specificElements.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        (el as HTMLElement).style.setProperty('display', 'none', 'important');
        (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
        (el as HTMLElement).style.setProperty('opacity', '0', 'important');
        (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
      });
    });

    // Try to hide elements inside YouTube iframe
    const iframes = document.querySelectorAll('iframe[src*="youtube"]');
    iframes.forEach((iframe) => {
      try {
        const iframeDoc = (iframe as HTMLIFrameElement).contentDocument || 
                         (iframe as HTMLIFrameElement).contentWindow?.document;
        
        if (iframeDoc) {
          specificElements.forEach(selector => {
            const elements = iframeDoc.querySelectorAll(selector);
            elements.forEach(el => {
              (el as HTMLElement).style.setProperty('display', 'none', 'important');
              (el as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
              (el as HTMLElement).style.setProperty('opacity', '0', 'important');
              (el as HTMLElement).style.setProperty('pointer-events', 'none', 'important');
            });
          });
        }
      } catch (e) {
        // CORS blocked, fallback already handled above
        console.log('CORS blocked iframe access, using fallback hiding');
      }
    });

    console.log('YouTube branding elements hidden on pause');
  }, []);

  const updateProgress = useCallback(() => {
    if (plyrInstanceRef.current) {
      const currentTime = plyrInstanceRef.current.currentTime;
      const duration = plyrInstanceRef.current.duration;
      
      if (duration > 0) {
        const progressPercent = (currentTime / duration) * 100;
        onProgress?.(progressPercent);

        if (progressPercent >= 95) {
          onComplete?.();
        }
      }
    }
  }, [onProgress, onComplete]);

  useEffect(() => {
    // Add Jordan's Library CSS
    const styleElement = document.createElement('style');
    styleElement.textContent = jordanLibraryCSS;
    document.head.appendChild(styleElement);

    if (playerRef.current) {
      // Initialize Plyr with Jordan's Library exact configuration
      plyrInstanceRef.current = new Plyr(playerRef.current, {
        controls: [
          'play-large',
          'play',
          'progress', 
          'current-time',
          'volume',
          'fullscreen'
        ],
        youtube: {
          // EXACT match to Jordan's Library parameters
          noCookie: false,           // Match: noCookie=false
          rel: 0,                   // Match: rel=0  
          showinfo: 0,              // Match: showinfo=0
          iv_load_policy: 3,        // Match: iv_load_policy=3
          modestbranding: 1,        // Match: modestbranding=1
          customControls: true,     // Match: customControls=true
          disablekb: 1,            // Match: disablekb=1
          playsinline: 1,          // Match: playsinline=1
          controls: 0,             // Match: controls=0
          cc_load_policy: 0,       // Match: cc_load_policy=0
          enablejsapi: 1,          // Match: enablejsapi=1
          origin: window.location.origin,
          // Additional parameters for branding removal
          autoplay: 0,             // Match: autoplay=0
          fs: 0,                   // Disable YouTube fullscreen
          autohide: 1,             // Auto-hide controls
          widget_referrer: window.location.href
        },
        ratio: '16:9',
        fullscreen: {
          enabled: true,
          fallback: true,
          iosNative: false
        },
        storage: { enabled: false },
        hideControls: false,
        clickToPlay: true,
        keyboard: { focused: false, global: false }
      });

      // Event listeners with aggressive hiding
      plyrInstanceRef.current.on('ready', () => {
        console.log('Plyr player is ready');
        aggressivelyHideElements();
        
        // Start continuous hiding
        hideIntervalRef.current = setInterval(aggressivelyHideElements, 500);
      });

      plyrInstanceRef.current.on('play', () => {
        setIsPlaying(true);
        progressUpdateRef.current = setInterval(updateProgress, 1000);
        aggressivelyHideElements();
      });

      plyrInstanceRef.current.on('pause', () => {
        setIsPlaying(false);
        if (progressUpdateRef.current) {
          clearInterval(progressUpdateRef.current);
        }
        // Immediate aggressive hiding on pause
        setTimeout(aggressivelyHideElements, 50);
        setTimeout(aggressivelyHideElements, 200);
        setTimeout(aggressivelyHideElements, 500);
        
        // Specifically hide YouTube branding elements on pause with multiple attempts
        hideYouTubeBrandingOnPause(); // Immediate
        setTimeout(hideYouTubeBrandingOnPause, 100); // 100ms delay
        setTimeout(hideYouTubeBrandingOnPause, 300); // 300ms delay
        setTimeout(hideYouTubeBrandingOnPause, 600); // 600ms delay
        setTimeout(hideYouTubeBrandingOnPause, 1000); // 1s delay
        
        console.log('Video paused - hiding YouTube branding elements');
      });

      plyrInstanceRef.current.on('ended', () => {
        setIsPlaying(false);
        if (progressUpdateRef.current) {
          clearInterval(progressUpdateRef.current);
        }
        onComplete?.();
        aggressivelyHideElements();
      });

      plyrInstanceRef.current.on('timeupdate', updateProgress);

      plyrInstanceRef.current.on('error', (event) => {
        console.error('Plyr error:', event);
      });
    }

    return () => {
      if (progressUpdateRef.current) {
        clearInterval(progressUpdateRef.current);
      }
      if (hideIntervalRef.current) {
        clearInterval(hideIntervalRef.current);
      }
      if (plyrInstanceRef.current) {
        plyrInstanceRef.current.destroy();
      }
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, [videoId, thumbnailUrl, updateProgress, onComplete, aggressivelyHideElements, hideYouTubeBrandingOnPause]);

  return (
    <div className="overflow-hidden rounded-[12px] relative bg-black dark:bg-gray-900 shadow-2xl">
      <div className="transition-opacity duration-1000 opacity-100">
        {/* Background cover image like Jordan's Library */}
        {coverImage && (
          <div className="absolute inset-0">
            <img 
              alt={title}
              loading="lazy"
              decoding="async"
              src={backgroundImage}
              className="absolute h-full w-full inset-0 object-cover"
              style={{ position: 'absolute', height: '100%', width: '100%', inset: '0px', objectFit: 'cover', color: 'transparent' }}
            />
          </div>
        )}
        
        {/* Plyr player container */}
        <div className="relative aspect-video">
          <div
            ref={playerRef}
            data-plyr-provider="youtube"
            data-plyr-embed-id={videoId}
            data-plyr-poster={thumbnailUrl}
            className="w-full h-full"
          />
        </div>
      </div>
      
      {/* Custom title overlay */}
      <div className="absolute top-4 left-4 pointer-events-none z-50">
        <h3 className="text-white font-semibold text-lg drop-shadow-lg">{title}</h3>
      </div>
    </div>
  );
};